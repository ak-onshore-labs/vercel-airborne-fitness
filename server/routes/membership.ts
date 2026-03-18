import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { asyncHandler, requireAuth } from "../middleware";
import { MembershipModel, MembershipPlanModel } from "../models";
import mongoose from "mongoose";
import { getMembershipUsabilityState } from "@shared/membershipState";

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
        await storage.createMembership({
          memberId,
          membershipPlanId: planId,
          sessionsRemaining: sessionsTotal,
          expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * validityDays),
          carryForward: 0,
          extensionApplied: false,
        });
      }

      await storage.createWaiver({
        userId: auth.userId,
        signatureName: waiver.signatureName,
        agreedTerms: waiver.agreedTerms,
        agreedAge: waiver.agreedAge,
      });

      const allMemberships = await storage.getMemberMemberships(memberId);
      const { ClassTypeModel } = await import("../models");
      const classTypeDocs = await ClassTypeModel.find({});
      const typeIdToName: Record<string, string> = {};
      for (const t of classTypeDocs) typeIdToName[(t as any)._id.toString()] = t.name;
      const membershipMap: Record<string, { id: string; sessionsRemaining: number; expiryDate: string; extensionApplied: boolean; planName?: string }> = {};
      const now = new Date();

      function tierRank(x: { expiryDate: string; sessionsRemaining: number; extensionApplied: boolean }): number {
        const state = getMembershipUsabilityState(
          { expiryDate: x.expiryDate, sessionsRemaining: x.sessionsRemaining, extensionApplied: x.extensionApplied },
          now
        ).state;
        return state === "active" ? 0 : state === "expired_extendable" ? 1 : 2;
      }

      function isCandidateBetter(
        candidate: { id: string; sessionsRemaining: number; expiryDate: string; extensionApplied: boolean },
        existing: { id: string; sessionsRemaining: number; expiryDate: string; extensionApplied: boolean }
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
