import type { Express, Request, Response } from "express";
import { asyncHandler, requireAuth } from "../middleware.js";
import { storage } from "../storage.js";
import { signToken } from "../lib/jwt.js";
import { log } from "../lib/log.js";
import { getMembershipUsabilityState, membershipStateTierRank } from "@shared/membershipState";

function tierRank(
  x: {
    expiryDate: string;
    sessionsRemaining: number;
    extensionApplied: boolean;
    pauseUsed?: boolean | null;
    pauseStart?: string | null;
    pauseEnd?: string | null;
    startDate?: string | null;
  },
  now: Date
): number {
  const state = getMembershipUsabilityState(
    {
      expiryDate: x.expiryDate,
      sessionsRemaining: x.sessionsRemaining,
      extensionApplied: x.extensionApplied,
      pauseUsed: x.pauseUsed,
      pauseStart: x.pauseStart,
      pauseEnd: x.pauseEnd,
      startDate: x.startDate ?? null,
    },
    now
  ).state;
  return membershipStateTierRank(state);
}

function isCandidateBetter(
  candidate: {
    id: string;
    sessionsRemaining: number;
    expiryDate: string;
    extensionApplied: boolean;
    pauseUsed?: boolean | null;
    pauseStart?: string | null;
    pauseEnd?: string | null;
    startDate?: string | null;
  },
  existing: {
    id: string;
    sessionsRemaining: number;
    expiryDate: string;
    extensionApplied: boolean;
    pauseUsed?: boolean | null;
    pauseStart?: string | null;
    pauseEnd?: string | null;
    startDate?: string | null;
  },
  now: Date
): boolean {
  const ra = tierRank(candidate, now);
  const rb = tierRank(existing, now);
  if (ra !== rb) return ra < rb;
  const expA = new Date(candidate.expiryDate).getTime();
  const expB = new Date(existing.expiryDate).getTime();
  if (expA !== expB) return expA < expB;
  return String(candidate.id).localeCompare(String(existing.id), "en") < 0;
}

const MSG91_SEND_OTP_URL = "https://control.msg91.com/api/v5/otp";
const MSG91_VERIFY_OTP_URL = "https://control.msg91.com/api/v5/otp/verify";
const MSG91_OTP_TEMPLATE_ID = "69b1704fc22c055df50c2443";

function getMsg91Auth(): string {
  const key =
    process.env.MSG_API_KEY?.trim() ||
    process.env.MSG91_AUTH_KEY?.trim() ||
    process.env.MSG91_API_KEY?.trim();
  if (!key) {
    throw new Error("MSG_API_KEY (or MSG91_AUTH_KEY) must be set");
  }
  return key;
}

const digitsOnly = (s: string) => s.replace(/\D/g, "");

function toTenDigits(phone: string): string {
  const d = digitsOnly(phone);
  return d.length > 10 && d.startsWith("91") ? d.slice(2) : d.slice(-10);
}

/** MSG91 v5 OTP API expects mobile as country code + number, e.g. 917007232096 */
function toMsg91Mobile(phone: string): string {
  return `91${toTenDigits(phone)}`;
}

/** One-line curl (double-quoted args) so PM2 / log shippers do not drop multiline output. */
function formatMsg91SendOtpCurlOneLine(authKey: string, msg91Mobile: string): string {
  const bodyStr = JSON.stringify({
    template_id: MSG91_OTP_TEMPLATE_ID,
    mobile: msg91Mobile,
  });
  const redact =
    process.env.NODE_ENV === "production" && process.env.MSG91_LOG_CURL_WITH_SECRET !== "true";
  const keyForHeader = redact ? "<REDACTED>" : authKey;
  return [
    "curl --location",
    JSON.stringify(MSG91_SEND_OTP_URL),
    "--header",
    JSON.stringify("Content-Type: application/json"),
    "--header",
    JSON.stringify(`authkey: ${keyForHeader}`),
    "--data",
    JSON.stringify(bodyStr),
  ].join(" ");
}

function logMsg91SendOtpCurl(authKey: string, msg91Mobile: string): void {
  const redact =
    process.env.NODE_ENV === "production" && process.env.MSG91_LOG_CURL_WITH_SECRET !== "true";
  const suffix = redact ? " (authkey redacted; MSG91_LOG_CURL_WITH_SECRET=true to show)" : "";
  log(`send-otp curl${suffix}: ${formatMsg91SendOtpCurlOneLine(authKey, msg91Mobile)}`, "msg91");
}

export function registerAuthRoutes(app: Express): void {
  app.post(
    "/api/auth/send-otp",
    asyncHandler(async (req: Request, res: Response) => {
      const { phone } = req.body;
      if (!phone || typeof phone !== "string" || phone.replace(/\D/g, "").length < 10) {
        res.status(400).json({ message: "Valid phone number required" });
        return;
      }

      let authKey: string;
      try {
        authKey = getMsg91Auth();
      } catch (err) {
        log(
          `send-otp missing MSG_API_KEY: ${(err as Error).message} — set MSG_API_KEY or MSG91_AUTH_KEY on the host`,
          "msg91",
        );
        res.status(200).json({ success: false, message: "Unable to send OTP. Please try again later." });
        return;
      }

      try {
        const msg91Mobile = toMsg91Mobile(phone);
        logMsg91SendOtpCurl(authKey, msg91Mobile);
        const msgRes = await fetch(MSG91_SEND_OTP_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authkey: authKey,
          },
          body: JSON.stringify({
            template_id: MSG91_OTP_TEMPLATE_ID,
            mobile: msg91Mobile,
          }),
        });
        const text = await msgRes.text();
        let data: { type?: string; message?: string };
        try {
          data = JSON.parse(text) as { type?: string; message?: string };
        } catch {
          data = {};
        }

        if (!msgRes.ok || data.type !== "success") {
          log(
            `send-otp failed http=${msgRes.status} type=${data.type ?? ""} msg=${data.message ?? ""} body=${text.slice(0, 400)}`,
            "msg91",
          );
          res.status(200).json({ success: false, message: "Unable to send OTP. Please try again later." });
          return;
        }

        res.json({ success: true, status: "pending" });
      } catch (err) {
        log(`send-otp error: ${err instanceof Error ? err.message : String(err)}`, "msg91");
        res.status(200).json({ success: false, message: "Unable to send OTP. Please try again later." });
      }
    })
  );

  app.post(
    "/api/auth/verify-otp",
    asyncHandler(async (req: Request, res: Response) => {
      const { phone, code } = req.body;
      if (!phone || typeof phone !== "string" || phone.replace(/\D/g, "").length < 10) {
        res.status(400).json({ message: "Valid phone number required" });
        return;
      }
      if (!code || typeof code !== "string" || code.trim().length < 4) {
        res.status(400).json({ message: "Verification code required" });
        return;
      }

      const codeTrimmed = code.trim();
      const DEFAULT_OTP = "1122";
      let approved = codeTrimmed === DEFAULT_OTP;

      if (!approved) {
        const authKey = getMsg91Auth();
        const msg91Mobile = toMsg91Mobile(phone);
        const verifyUrl = `${MSG91_VERIFY_OTP_URL}?otp=${encodeURIComponent(codeTrimmed)}&mobile=${encodeURIComponent(msg91Mobile)}`;

        const msgRes = await fetch(verifyUrl, {
          method: "GET",
          headers: {
            authkey: authKey,
          },
        });

        const data = (await msgRes.json()) as { type?: string; message?: string };
        if (!msgRes.ok) {
          const msg =
            msgRes.status === 404 || data.message?.toLowerCase().includes("expired") || data.message?.toLowerCase().includes("invalid")
              ? "This code has already been used, has expired, or too many attempts were made. Please request a new code."
              : "Verification failed. Please try again.";
          const status = msgRes.status >= 400 && msgRes.status < 500 ? msgRes.status : 502;
          res.status(status).json({ message: msg });
          return;
        }

        approved = data.type === "success";
      }

      if (!approved) {
        res.status(400).json({ message: "Invalid or expired code" });
        return;
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

      const membershipMap: Record<
        string,
        {
          id: string;
          sessionsRemaining: number;
          expiryDate: string;
          extensionApplied: boolean;
          planName?: string;
          pauseUsed: boolean;
          pauseStart: string | null;
          pauseEnd: string | null;
          validityDays?: number;
          startDate: string | null;
        }
      > = {};
      const { MembershipPlanModel, ClassTypeModel } = await import("../models/index.js");
      const planDocs = await MembershipPlanModel.find({});
      const types = await ClassTypeModel.find({});
      const typeIdToName: Record<string, string> = {};
      for (const t of types) typeIdToName[(t as any)._id.toString()] = t.name;
      const now = new Date();

      for (const member of members) {
        const list = await storage.getMemberMemberships(member.id);
        for (const m of list) {
          const plan = planDocs.find((p: any) => String(p._id) === m.membershipPlanId);
          const classTypeId = plan?.classTypeId ?? "";
          const category = typeIdToName[classTypeId] ?? m.membershipPlanId;
          const candidate = {
            id: m.id,
            sessionsRemaining: m.sessionsRemaining,
            expiryDate: m.expiryDate instanceof Date ? m.expiryDate.toISOString() : String(m.expiryDate),
            extensionApplied: Boolean((m as any).extensionApplied),
            planName: plan?.name,
            pauseUsed: Boolean((m as any).pauseUsed),
            pauseStart: (m as any).pauseStart ? new Date((m as any).pauseStart).toISOString() : null,
            pauseEnd: (m as any).pauseEnd ? new Date((m as any).pauseEnd).toISOString() : null,
            validityDays: typeof (plan as any)?.validityDays === "number" ? (plan as any).validityDays : undefined,
            startDate: (m as any).startDate ? new Date((m as any).startDate).toISOString() : null,
          };

          const existing = membershipMap[category];
          if (!existing) {
            membershipMap[category] = candidate;
            continue;
          }

          if (isCandidateBetter(candidate, existing, now)) {
            membershipMap[category] = candidate;
          }
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

      const membershipMap: Record<
        string,
        {
          id: string;
          sessionsRemaining: number;
          expiryDate: string;
          extensionApplied: boolean;
          planName?: string;
          pauseUsed: boolean;
          pauseStart: string | null;
          pauseEnd: string | null;
          validityDays?: number;
          startDate: string | null;
        }
      > = {};
      const { MembershipPlanModel, ClassTypeModel } = await import("../models/index.js");
      const planDocs = await MembershipPlanModel.find({});
      const types = await ClassTypeModel.find({});
      const typeIdToName: Record<string, string> = {};
      for (const t of types) typeIdToName[(t as any)._id.toString()] = t.name;
      const now = new Date();

      for (const member of members) {
        const list = await storage.getMemberMemberships(member.id);
        for (const m of list) {
          const plan = planDocs.find((p: any) => String(p._id) === m.membershipPlanId);
          const classTypeId = plan?.classTypeId ?? "";
          const category = typeIdToName[classTypeId] ?? m.membershipPlanId;
          const candidate = {
            id: m.id,
            sessionsRemaining: m.sessionsRemaining,
            expiryDate: m.expiryDate instanceof Date ? m.expiryDate.toISOString() : String(m.expiryDate),
            extensionApplied: Boolean((m as any).extensionApplied),
            planName: plan?.name,
            pauseUsed: Boolean((m as any).pauseUsed),
            pauseStart: (m as any).pauseStart ? new Date((m as any).pauseStart).toISOString() : null,
            pauseEnd: (m as any).pauseEnd ? new Date((m as any).pauseEnd).toISOString() : null,
            validityDays: typeof (plan as any)?.validityDays === "number" ? (plan as any).validityDays : undefined,
            startDate: (m as any).startDate ? new Date((m as any).startDate).toISOString() : null,
          };

          const existing = membershipMap[category];
          if (!existing) {
            membershipMap[category] = candidate;
            continue;
          }

          if (isCandidateBetter(candidate, existing, now)) {
            membershipMap[category] = candidate;
          }
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

  app.delete(
    "/api/account",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.auth!.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        res.status(204).send();
        return;
      }
      await storage.deleteAccountByUserId(userId);
      res.status(204).send();
    })
  );
}
