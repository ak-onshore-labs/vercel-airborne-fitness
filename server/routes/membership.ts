import type { Express, Request, Response } from "express";
import { storage } from "../storage.js";
import { asyncHandler, requireAuth } from "../middleware.js";
import { BookingModel, MembershipModel, MembershipPlanModel, ScheduleSlotModel } from "../models/index.js";
import mongoose from "mongoose";
import {
  getMembershipUsabilityState,
  membershipStateTierRank,
} from "@shared/membershipState";
import {
  computeMembershipExpiryExclusiveEnd,
  membershipEnrollmentStartBounds,
  parseMembershipStartDateFromInput,
} from "@shared/membershipDates";

const PAUSE_DAYS = 14;
const PAUSE_MS = PAUSE_DAYS * 24 * 60 * 60 * 1000;

function addMs(d: Date, ms: number): Date {
  return new Date(d.getTime() + ms);
}

export function registerMembershipRoutes(app: Express): void {
  app.patch(
    "/api/members/:id",
    requireAuth,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const updated = await storage.updateMember(id, req.body);
      if (!updated) {
        res.status(404).json({ message: "Member not found" });
        return;
      }
      res.json(updated);
    })
  );

  app.post(
    "/api/memberships/:id/self-extend",
    requireAuth,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const auth = req.auth!;
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ message: "Membership id required" });
        return;
      }

      const members = await storage.getMembersByUserId(auth.userId);
      const memberIds = new Set(members.map((m) => m.id));
      if (memberIds.size === 0) {
        res.status(403).json({ message: "Not allowed" });
        return;
      }

      const now = new Date();
      const existing = await storage.getMembershipById(id);
      if (!existing) {
        res.status(404).json({ message: "Membership not found" });
        return;
      }
      if (!memberIds.has(existing.memberId)) {
        res.status(403).json({ message: "Not allowed" });
        return;
      }

      const baseMs = Math.max(new Date(existing.expiryDate as any).getTime(), now.getTime());
      const newExpiry = new Date(baseMs + 7 * 24 * 60 * 60 * 1000);

      const updated = await MembershipModel.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          memberId: { $in: Array.from(memberIds) },
          expiryDate: { $lte: now },
          sessionsRemaining: { $gt: 0 },
          extensionApplied: { $ne: true },
        },
        {
          $set: {
            expiryDate: newExpiry,
            extensionApplied: true,
          },
        },
        { new: true }
      );

      if (!updated) {
        res.status(400).json({ message: "Extension not available" });
        return;
      }

      res.json({
        id: String(updated._id),
        expiryDate: updated.expiryDate instanceof Date ? updated.expiryDate.toISOString() : String(updated.expiryDate),
        extensionApplied: Boolean(updated.extensionApplied),
      });
    })
  );

  app.post(
    "/api/memberships/:id/pause",
    requireAuth,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const auth = req.auth!;
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ message: "Membership id required" });
        return;
      }

      const members = await storage.getMembersByUserId(auth.userId);
      const memberIds = new Set(members.map((m) => m.id));
      if (memberIds.size === 0) {
        res.status(403).json({ message: "Not allowed" });
        return;
      }

      const existing = await storage.getMembershipById(id);
      if (!existing) {
        res.status(404).json({ message: "Membership not found" });
        return;
      }
      if (!memberIds.has(existing.memberId)) {
        res.status(403).json({ message: "Not allowed" });
        return;
      }

      const plan = await MembershipPlanModel.findById(existing.membershipPlanId);
      const validityDays = (plan as any)?.validityDays;
      if (typeof validityDays !== "number" || validityDays < 180) {
        res.status(400).json({ message: "Pause not available for this membership" });
        return;
      }

      if (existing.sessionsRemaining <= 0) {
        res.status(400).json({ message: "Pause not available for this membership" });
        return;
      }
      if ((existing as any).pauseUsed === true) {
        res.status(400).json({ message: "Pause not available for this membership" });
        return;
      }

      const now = new Date();
      const state = getMembershipUsabilityState(
        {
          expiryDate: existing.expiryDate as any,
          sessionsRemaining: existing.sessionsRemaining,
          extensionApplied: (existing as any).extensionApplied,
          pauseUsed: (existing as any).pauseUsed,
          pauseStart: (existing as any).pauseStart,
          pauseEnd: (existing as any).pauseEnd,
          startDate: (existing as any).startDate ?? null,
        },
        now
      );
      if (state.state !== "active") {
        res.status(400).json({ message: "Pause not available for this membership" });
        return;
      }

      const pauseStart = now;
      const pauseEnd = addMs(now, PAUSE_MS);
      const existingExpiry = new Date(existing.expiryDate as any);
      const newExpiryDate = addMs(existingExpiry, PAUSE_MS);

      // Step 1+2: set pause fields, push expiry forward (atomic guard against races)
      const updated = await MembershipModel.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(id),
          memberId: { $in: Array.from(memberIds) },
          pauseUsed: { $ne: true },
          sessionsRemaining: { $gt: 0 },
          expiryDate: { $gt: now },
        },
        {
          $set: {
            pauseUsed: true,
            pauseStart,
            pauseEnd,
            expiryDate: newExpiryDate,
          },
        },
        { new: true }
      );
      if (!updated) {
        res.status(400).json({ message: "Pause not available for this membership" });
        return;
      }

      async function findActiveMembershipForSlot(memberId: string, scheduleId: string): Promise<{ id: string; sessionsRemaining: number } | null> {
        const slot = await storage.getScheduleSlot(scheduleId);
        if (!slot) return null;
        const plans = await MembershipPlanModel.find({ classTypeId: slot.classTypeId });
        const planIds = new Set(plans.map((p: any) => String(p._id)));
        const all = await storage.getMemberMemberships(memberId);
        const now2 = new Date();
        const candidates = all.filter((m) => planIds.has(m.membershipPlanId));
        const active = candidates.filter((m) => {
          const s = getMembershipUsabilityState(
            {
              expiryDate: m.expiryDate as any,
              sessionsRemaining: m.sessionsRemaining,
              extensionApplied: (m as any).extensionApplied,
              pauseUsed: (m as any).pauseUsed,
              pauseStart: (m as any).pauseStart,
              pauseEnd: (m as any).pauseEnd,
              startDate: (m as any).startDate ?? null,
            },
            now2
          );
          return s.state === "active";
        });
        active.sort((a, b) => {
          const ea = new Date(a.expiryDate as any).getTime();
          const eb = new Date(b.expiryDate as any).getTime();
          if (ea !== eb) return ea - eb;
          return String(a.id).localeCompare(String(b.id), "en");
        });
        const m = active[0];
        return m ? { id: m.id, sessionsRemaining: m.sessionsRemaining } : null;
      }

      async function rerankWaitlist(scheduleId: string, sessionDate: string): Promise<void> {
        const sessionBookings = await storage.getBookingsForSession(scheduleId, sessionDate);
        const waitlist = sessionBookings
          .filter((b) => b.status === "WAITLIST")
          .sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999));
        for (let i = 0; i < waitlist.length; i++) {
          await storage.updateBookingStatus(waitlist[i].id, "WAITLIST", i + 1);
        }
      }

      async function handleCancelledBooked(scheduleId: string, sessionDate: string): Promise<void> {
        const sessionBookings = await storage.getBookingsForSession(scheduleId, sessionDate);
        const waitlist = sessionBookings
          .filter((b) => b.status === "WAITLIST")
          .sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999));
        if (waitlist.length === 0) return;

        const first = waitlist[0];
        const firstMembership = await findActiveMembershipForSlot(first.memberId, scheduleId);
        if (!firstMembership || firstMembership.sessionsRemaining <= 0) return;

        const ok = await storage.decrementMembershipSessionsIfPositive(firstMembership.id);
        if (!ok) return;

        await storage.updateBookingStatus(first.id, "BOOKED", null);

        const remaining = waitlist.slice(1);
        for (let i = 0; i < remaining.length; i++) {
          await storage.updateBookingStatus(remaining[i].id, "WAITLIST", i + 1);
        }
      }

      // Step 3+4: cancel bookings and remove from waitlists within pause window for this category
      const classTypeId = (plan as any)?.classTypeId ?? "";
      const scheduleIds = (
        await ScheduleSlotModel.find({ classTypeId }).select("_id").lean()
      ).map((s: any) => String(s._id));

      const startDate = pauseStart.toISOString().slice(0, 10);
      const endDate = pauseEnd.toISOString().slice(0, 10);
      const affected = await BookingModel.find({
        memberId: existing.memberId,
        scheduleId: { $in: scheduleIds },
        status: { $in: ["BOOKED", "WAITLIST"] },
        sessionDate: { $gte: startDate, $lte: endDate },
      }).lean();

      for (const b of affected as any[]) {
        const priorStatus = b.status as string;
        await storage.updateBookingStatus(String(b._id), "CANCELLED");

        if (priorStatus === "BOOKED") {
          await storage.incrementMembershipSessions(id, 1);
          await handleCancelledBooked(b.scheduleId, b.sessionDate);
        } else if (priorStatus === "WAITLIST") {
          await rerankWaitlist(b.scheduleId, b.sessionDate);
        }
      }

      const finalDoc = await MembershipModel.findById(new mongoose.Types.ObjectId(id));
      if (!finalDoc) {
        res.status(500).json({ message: "Unable to pause membership" });
        return;
      }

      res.json({
        pauseStart: (finalDoc as any).pauseStart ? new Date((finalDoc as any).pauseStart).toISOString() : null,
        pauseEnd: (finalDoc as any).pauseEnd ? new Date((finalDoc as any).pauseEnd).toISOString() : null,
        expiryDate: (finalDoc as any).expiryDate instanceof Date ? (finalDoc as any).expiryDate.toISOString() : String((finalDoc as any).expiryDate),
        pauseUsed: Boolean((finalDoc as any).pauseUsed),
        sessionsRemaining: Number((finalDoc as any).sessionsRemaining ?? 0),
      });
    })
  );

  app.post(
    "/api/enroll",
    requireAuth,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const auth = req.auth!;
      const { memberId, personalDetails, plans, waiver, kidDetails: kidInfo, transactionId } = req.body;

      if (!memberId) {
        res.status(400).json({ message: "memberId required" });
        return;
      }
      if (!plans || !Array.isArray(plans) || plans.length === 0) {
        res.status(400).json({ message: "Select at least one plan", fields: ["plans"] });
        return;
      }

      // Require successful payment: verify transaction is SUCCESS and belongs to user
      if (!transactionId) {
        res.status(400).json({ message: "Payment required. Complete payment to enroll.", fields: ["transactionId"] });
        return;
      }
      const transaction = await storage.getTransactionById(transactionId);
      if (!transaction) {
        res.status(400).json({ message: "Invalid payment transaction", fields: ["transactionId"] });
        return;
      }
      if (transaction.userId !== auth.userId) {
        res.status(403).json({ message: "Transaction does not belong to you" });
        return;
      }
      if (transaction.status !== "SUCCESS") {
        res.status(400).json({ message: "Payment not completed", fields: ["transactionId"] });
        return;
      }

      const errFields: string[] = [];
      if (!personalDetails || typeof personalDetails !== "object") {
        res.status(400).json({ message: "Personal details required", fields: ["personalDetails"] });
        return;
      }
      const pd = personalDetails;
      if (typeof pd.name !== "string" || pd.name.trim().length < 2) errFields.push("name");
      if (typeof pd.dob !== "string" || !pd.dob.trim()) errFields.push("dob");
      else {
        const d = new Date(pd.dob);
        if (Number.isNaN(d.getTime())) errFields.push("dob");
      }
      if (typeof pd.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pd.email.trim())) errFields.push("email");
      if (typeof pd.emergencyContactName !== "string" || pd.emergencyContactName.trim().length < 2) errFields.push("emergencyContactName");
      if (typeof pd.emergencyContactPhone !== "string" || !/^\d{10}$/.test(pd.emergencyContactPhone.replace(/\s/g, ""))) errFields.push("emergencyContactPhone");
      if (errFields.length > 0) {
        res.status(400).json({ message: "Invalid or missing required fields", fields: errFields });
        return;
      }

      const classTypes = await storage.getClassTypes();
      const nameToAgeGroup: Record<string, string> = {};
      for (const t of classTypes) nameToAgeGroup[t.name] = t.ageGroup;
      const hasKidsPlan = plans.some((p: { category: string }) => nameToAgeGroup[p.category] === "Kids");
      if (hasKidsPlan) {
        if (!kidInfo || typeof kidInfo !== "object") {
          res.status(400).json({ message: "Kid details required for kids class", fields: ["kidDetails"] });
          return;
        }
        if (typeof kidInfo.name !== "string" || kidInfo.name.trim().length < 2) {
          res.status(400).json({ message: "Kid name required (min 2 characters)", fields: ["kidDetails.name"] });
          return;
        }
        if (typeof kidInfo.dob !== "string" || !kidInfo.dob.trim()) {
          res.status(400).json({ message: "Kid date of birth required", fields: ["kidDetails.dob"] });
          return;
        }
        if (typeof kidInfo.gender !== "string" || !kidInfo.gender.trim()) {
          res.status(400).json({ message: "Kid gender required", fields: ["kidDetails.gender"] });
          return;
        }
      }

      if (!waiver || typeof waiver !== "object") {
        res.status(400).json({ message: "Waiver acceptance required", fields: ["waiver"] });
        return;
      }
      if (waiver.agreedTerms !== true) {
        res.status(400).json({ message: "You must agree to the waiver terms", fields: ["waiver.agreedTerms"] });
        return;
      }
      if (typeof waiver.signatureName !== "string" || waiver.signatureName.trim().length < 2) {
        res.status(400).json({ message: "Full name (signature) required", fields: ["waiver.signatureName"] });
        return;
      }

      const { membershipStartDate } = req.body;
      if (typeof membershipStartDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(membershipStartDate.trim())) {
        res.status(400).json({
          message: "Membership start date required (YYYY-MM-DD)",
          fields: ["membershipStartDate"],
        });
        return;
      }
      const startDay = membershipStartDate.trim();
      const bounds = membershipEnrollmentStartBounds(new Date());
      if (startDay < bounds.min || startDay > bounds.max) {
        res.status(400).json({
          message: "Membership start date must be from today through the next 28 days",
          fields: ["membershipStartDate"],
        });
        return;
      }

      await storage.updateMember(memberId, {
        name: pd.name,
        email: pd.email,
        dob: pd.dob,
        emergencyContactName: pd.emergencyContactName,
        emergencyContactPhone: pd.emergencyContactPhone,
        medicalConditions: pd.medicalConditions,
      });

      if (hasKidsPlan && kidInfo?.name) {
        const kidMember = await storage.getMembersByUserId(auth.userId).then(ms => ms.find(m => m.memberType === "Kid"));
        if (kidMember) {
          await storage.updateMember(kidMember.id, {
            name: kidInfo.name,
            dob: kidInfo.dob,
            gender: kidInfo.gender,
          });
        } else {
          await storage.createMember({
            userId: auth.userId,
            memberType: "Kid",
            name: kidInfo.name,
            dob: kidInfo.dob,
            gender: kidInfo.gender,
          });
        }
      }

      const planDocs = await MembershipPlanModel.find({});
      const planById = new Map(planDocs.map((p: any) => [String(p._id), p]));
      const typeList = await storage.getClassTypes();
      const nameToTypeId: Record<string, string> = {};
      for (const t of typeList) nameToTypeId[t.name] = t.id;

      for (const plan of plans) {
        let planId = plan.planId || plan.id;
        if (!planId && plan.category && (plan.planName || plan.name)) {
          const classTypeId = nameToTypeId[plan.category];
          const planDoc = await MembershipPlanModel.findOne({
            classTypeId,
            name: plan.planName || plan.name,
          });
          planId = planDoc ? String(planDoc._id) : null;
        }
        if (!planId) continue;
        const p = planById.get(planId);
        if (!p) continue;
        const sessionsTotal = p.sessionsTotal ?? plan.sessions;
        const validityDays = p.validityDays ?? plan.validityDays ?? 30;
        const expiryDate = computeMembershipExpiryExclusiveEnd(startDay, validityDays);
        const startDate = parseMembershipStartDateFromInput(startDay);
        await storage.createMembership({
          memberId,
          membershipPlanId: planId,
          sessionsRemaining: sessionsTotal,
          expiryDate,
          carryForward: 0,
          extensionApplied: false,
          pauseUsed: false,
          startDate,
        });
      }

      await storage.createWaiver({
        userId: auth.userId,
        signatureName: waiver.signatureName,
        agreedTerms: waiver.agreedTerms,
        agreedAge: waiver.agreedAge,
      });

      const allMemberships = await storage.getMemberMemberships(memberId);
      const { ClassTypeModel } = await import("../models/index.js");
      const classTypeDocs = await ClassTypeModel.find({});
      const typeIdToName: Record<string, string> = {};
      for (const t of classTypeDocs) typeIdToName[(t as any)._id.toString()] = t.name;
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
      const now = new Date();

      function tierRank(x: {
        expiryDate: string;
        sessionsRemaining: number;
        extensionApplied: boolean;
        pauseUsed?: boolean | null;
        pauseStart?: string | null;
        pauseEnd?: string | null;
        startDate?: string | null;
      }): number {
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
        }
      ): boolean {
        const ra = tierRank(candidate);
        const rb = tierRank(existing);
        if (ra !== rb) return ra < rb;
        const expA = new Date(candidate.expiryDate).getTime();
        const expB = new Date(existing.expiryDate).getTime();
        if (expA !== expB) return expA < expB;
        return String(candidate.id).localeCompare(String(existing.id), "en") < 0;
      }
      for (const m of allMemberships) {
        const plan = planById.get(m.membershipPlanId);
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
        if (isCandidateBetter(candidate, existing)) {
          membershipMap[category] = candidate;
        }
      }

      res.json({ memberships: membershipMap });
    })
  );

  app.post(
    "/api/memberships/:id/request-extension",
    requireAuth,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { id } = req.params;
      const membership = await storage.getMembershipById(id);
      if (!membership) {
        res.status(404).json({ message: "Membership not found" });
        return;
      }
      if (membership.extensionRequestedAt) {
        res.status(400).json({ message: "Extension already requested" });
        return;
      }
      await storage.updateMembership(id, { extensionRequestedAt: new Date() });
      res.json({ ok: true, message: "Extension requested" });
    })
  );

  app.post(
    "/api/memberships/:id/approve-extension",
    requireAuth,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const requester = await storage.getUser(req.auth!.userId);
      if (!requester || (requester.userRole !== "ADMIN" && requester.userRole !== "STAFF")) {
        res.status(403).json({ message: "Not allowed" });
        return;
      }
      const { id } = req.params;
      const membership = await storage.getMembershipById(id);
      if (!membership) {
        res.status(404).json({ message: "Membership not found" });
        return;
      }
      if (!membership.extensionRequestedAt) {
        res.status(400).json({ message: "Extension not requested" });
        return;
      }
      if (membership.extensionApplied) {
        res.status(400).json({ message: "Extension already applied" });
        return;
      }
      const newExpiry = new Date(membership.expiryDate);
      newExpiry.setDate(newExpiry.getDate() + 7);
      await storage.updateMembership(id, {
        extensionApprovedAt: new Date(),
        extensionApplied: true,
        expiryDate: newExpiry,
      });
      res.json({ ok: true, expiryDate: newExpiry.toISOString() });
    })
  );
}
