import type { Express, Request, Response } from "express";
import { asyncHandler, requireAuth } from "../middleware";
import { storage } from "../storage";
import { signToken } from "../lib/jwt";

const TWILIO_VERIFY_BASE = "https://verify.twilio.com/v2";

function getTwilioAuth(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
  }
  return Buffer.from(`${sid}:${token}`).toString("base64");
}

function getVerifyServiceSid(): string {
  const sid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid) throw new Error("TWILIO_VERIFY_SERVICE_SID must be set");
  return sid;
}

const digitsOnly = (s: string) => s.replace(/\D/g, "");

function toE164(phone: string): string {
  const d = digitsOnly(phone);
  if (d.length === 10) return `+91${d}`;
  if (d.length >= 10 && d.startsWith("91")) return `+${d}`;
  return phone.startsWith("+") ? phone : `+${d}`;
}

function toTenDigits(phone: string): string {
  const d = digitsOnly(phone);
  return d.length > 10 && d.startsWith("91") ? d.slice(2) : d.slice(-10);
}

export function registerAuthRoutes(app: Express): void {
  app.post(
    "/api/auth/send-otp",
    asyncHandler(async (req: Request, res: Response) => {
      const { phone } = req.body;
      if (!phone || typeof phone !== "string" || phone.replace(/\D/g, "").length < 10) {
        return res.status(400).json({ message: "Valid phone number required" });
      }

      const to = toE164(phone);
      const serviceSid = getVerifyServiceSid();
      const auth = getTwilioAuth();
      const url = `${TWILIO_VERIFY_BASE}/Services/${serviceSid}/Verifications`;

      const form = new URLSearchParams();
      form.set("To", to);
      form.set("Channel", "sms");

      const twilioRes = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });

      const data = (await twilioRes.json()) as { status?: string; message?: string };
      if (!twilioRes.ok) {
        const msg = (data as { message?: string }).message ?? "Failed to send OTP";
        return res.status(twilioRes.status >= 400 && twilioRes.status < 500 ? twilioRes.status : 502).json({ message: msg });
      }

      res.json({ success: true, status: data.status ?? "pending" });
    })
  );

  app.post(
    "/api/auth/verify-otp",
    asyncHandler(async (req: Request, res: Response) => {
      const { phone, code } = req.body;
      if (!phone || typeof phone !== "string" || phone.replace(/\D/g, "").length < 10) {
        return res.status(400).json({ message: "Valid phone number required" });
      }
      if (!code || typeof code !== "string" || code.trim().length < 4) {
        return res.status(400).json({ message: "Verification code required" });
      }

      const to = toE164(phone);
      const serviceSid = getVerifyServiceSid();
      const auth = getTwilioAuth();
      const url = `${TWILIO_VERIFY_BASE}/Services/${serviceSid}/VerificationCheck`;

      const form = new URLSearchParams();
      form.set("To", to);
      form.set("Code", code.trim());

      const twilioRes = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });

      const data = (await twilioRes.json()) as { status?: string; valid?: boolean; message?: string };
      if (!twilioRes.ok) {
        const isNotFound = twilioRes.status === 404;
        const msg = isNotFound
          ? "This code has already been used, has expired, or too many attempts were made. Please request a new code."
          : (data.message ?? "Verification failed");
        const status = isNotFound ? 400 : (twilioRes.status >= 400 && twilioRes.status < 500 ? twilioRes.status : 502);
        return res.status(status).json({ message: msg });
      }

      if (data.status !== "approved" || !data.valid) {
        return res.status(400).json({ message: "Invalid or expired code" });
      }

      const mobile = toTenDigits(phone);
      let user = await storage.getUserByMobile(mobile);
      const isNewUser = !user;
      if (!user) {
        user = await storage.createUser({
          name: "",
          mobile,
          gender: "",
          userRole: "MEMBER",
        });
      }

      let members = await storage.getMembersByUserId(user.id);
      const isNew = isNewUser || members.length === 0;
      if (members.length === 0) {
        const adult = await storage.createMember({
          userId: user.id,
          memberType: "Adult",
        });
        members = [adult];
      }

      const membershipMap: Record<string, { id: string; sessionsRemaining: number; expiryDate: string }> = {};
      const { MembershipPlanModel, ClassTypeModel } = await import("../models");
      const planDocs = await MembershipPlanModel.find({});
      const types = await ClassTypeModel.find({});
      const typeIdToName: Record<string, string> = {};
      for (const t of types) typeIdToName[(t as any)._id.toString()] = t.name;

      for (const member of members) {
        const list = await storage.getMemberMemberships(member.id);
        for (const m of list) {
          const plan = planDocs.find((p: any) => String(p._id) === m.membershipPlanId);
          const classTypeId = plan?.classTypeId ?? "";
          const category = typeIdToName[classTypeId] ?? m.membershipPlanId;
          membershipMap[category] = {
            id: m.id,
            sessionsRemaining: m.sessionsRemaining,
            expiryDate: m.expiryDate instanceof Date ? m.expiryDate.toISOString() : String(m.expiryDate),
          };
        }
      }

      const token = signToken({ userId: user.id, mobile: user.mobile });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          gender: user.gender,
          userRole: user.userRole,
        },
        members: members.map((m) => ({
          id: m.id,
          userId: m.userId,
          memberType: m.memberType,
          name: m.name,
          dob: m.dob,
          gender: m.gender,
          email: m.email,
          emergencyContactName: m.emergencyContactName,
          emergencyContactPhone: m.emergencyContactPhone,
          medicalConditions: m.medicalConditions,
        })),
        memberships: membershipMap,
        isNew,
      });
    })
  );

  app.get(
    "/api/auth/me",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.auth!.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }

      let members = await storage.getMembersByUserId(user.id);
      if (members.length === 0) {
        const adult = await storage.createMember({
          userId: user.id,
          memberType: "Adult",
        });
        members = [adult];
      }

      const membershipMap: Record<string, { id: string; sessionsRemaining: number; expiryDate: string }> = {};
      const { MembershipPlanModel, ClassTypeModel } = await import("../models");
      const planDocs = await MembershipPlanModel.find({});
      const types = await ClassTypeModel.find({});
      const typeIdToName: Record<string, string> = {};
      for (const t of types) typeIdToName[(t as any)._id.toString()] = t.name;

      for (const member of members) {
        const list = await storage.getMemberMemberships(member.id);
        for (const m of list) {
          const plan = planDocs.find((p: any) => String(p._id) === m.membershipPlanId);
          const classTypeId = plan?.classTypeId ?? "";
          const category = typeIdToName[classTypeId] ?? m.membershipPlanId;
          membershipMap[category] = {
            id: m.id,
            sessionsRemaining: m.sessionsRemaining,
            expiryDate: m.expiryDate instanceof Date ? m.expiryDate.toISOString() : String(m.expiryDate),
          };
        }
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          gender: user.gender,
          userRole: user.userRole,
        },
        members: members.map((m) => ({
          id: m.id,
          userId: m.userId,
          memberType: m.memberType,
          name: m.name,
          dob: m.dob,
          gender: m.gender,
          email: m.email,
          emergencyContactName: m.emergencyContactName,
          emergencyContactPhone: m.emergencyContactPhone,
          medicalConditions: m.medicalConditions,
        })),
        memberships: membershipMap,
        isNew: false,
      });
    })
  );
}
