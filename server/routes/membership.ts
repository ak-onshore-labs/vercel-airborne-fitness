import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { asyncHandler, requireAuth } from "../middleware";
import { MembershipPlanModel } from "../models";

export function registerMembershipRoutes(app: Express): void {
  app.patch(
    "/api/members/:id",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const updated = await storage.updateMember(id, req.body);
      if (!updated) return res.status(404).json({ message: "Member not found" });
      res.json(updated);
    })
  );

  app.post(
    "/api/enroll",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const auth = req.auth!;
      const { memberId, personalDetails, plans, waiver, kidDetails: kidInfo } = req.body;

      if (!memberId) return res.status(400).json({ message: "memberId required" });
      if (!plans || !Array.isArray(plans) || plans.length === 0) {
        return res.status(400).json({ message: "Select at least one plan", fields: ["plans"] });
      }

      const errFields: string[] = [];
      if (!personalDetails || typeof personalDetails !== "object") {
        return res.status(400).json({ message: "Personal details required", fields: ["personalDetails"] });
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
        return res.status(400).json({ message: "Invalid or missing required fields", fields: errFields });
      }

      const classTypes = await storage.getClassTypes();
      const nameToAgeGroup: Record<string, string> = {};
      for (const t of classTypes) nameToAgeGroup[t.name] = t.ageGroup;
      const hasKidsPlan = plans.some((p: { category: string }) => nameToAgeGroup[p.category] === "Kids");
      if (hasKidsPlan) {
        if (!kidInfo || typeof kidInfo !== "object") {
          return res.status(400).json({ message: "Kid details required for kids class", fields: ["kidDetails"] });
        }
        if (typeof kidInfo.name !== "string" || kidInfo.name.trim().length < 2) {
          return res.status(400).json({ message: "Kid name required (min 2 characters)", fields: ["kidDetails.name"] });
        }
        if (typeof kidInfo.dob !== "string" || !kidInfo.dob.trim()) {
          return res.status(400).json({ message: "Kid date of birth required", fields: ["kidDetails.dob"] });
        }
        if (typeof kidInfo.gender !== "string" || !kidInfo.gender.trim()) {
          return res.status(400).json({ message: "Kid gender required", fields: ["kidDetails.gender"] });
        }
      }

      if (!waiver || typeof waiver !== "object") {
        return res.status(400).json({ message: "Waiver acceptance required", fields: ["waiver"] });
      }
      if (waiver.agreedTerms !== true) {
        return res.status(400).json({ message: "You must agree to the waiver terms", fields: ["waiver.agreedTerms"] });
      }
      if (typeof waiver.signatureName !== "string" || waiver.signatureName.trim().length < 2) {
        return res.status(400).json({ message: "Full name (signature) required", fields: ["waiver.signatureName"] });
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
      const membershipMap: Record<string, { id: string; sessionsRemaining: number; expiryDate: Date }> = {};
      for (const m of allMemberships) {
        const plan = planById.get(m.membershipPlanId);
        const classTypeId = plan?.classTypeId ?? "";
        const category = typeIdToName[classTypeId] ?? m.membershipPlanId;
        membershipMap[category] = { id: m.id, sessionsRemaining: m.sessionsRemaining, expiryDate: m.expiryDate };
      }

      res.json({ memberships: membershipMap });
    })
  );

  app.post(
    "/api/memberships/:id/request-extension",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const membership = await storage.getMembershipById(id);
      if (!membership) return res.status(404).json({ message: "Membership not found" });
      if (membership.extensionRequestedAt) return res.status(400).json({ message: "Extension already requested" });
      await storage.updateMembership(id, { extensionRequestedAt: new Date() });
      res.json({ ok: true, message: "Extension requested" });
    })
  );

  app.post(
    "/api/memberships/:id/approve-extension",
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const membership = await storage.getMembershipById(id);
      if (!membership) return res.status(404).json({ message: "Membership not found" });
      if (!membership.extensionRequestedAt) return res.status(400).json({ message: "Extension not requested" });
      if (membership.extensionApplied) return res.status(400).json({ message: "Extension already applied" });
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
