import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../middleware";

export function registerMembershipRoutes(app: Express): void {
  // Member profile update
  app.patch("/api/members/:id", asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updated = await storage.updateMember(id, req.body);
    if (!updated) return res.status(404).json({ message: "Member not found" });
    res.json(updated);
  }));

  // Enrollment (creates memberships, waiver, kid details)
  app.post("/api/enroll", asyncHandler(async (req: Request, res: Response) => {
    const { memberId, personalDetails, plans, waiver, kidDetails: kidInfo } = req.body;

    if (!memberId) {
      return res.status(400).json({ message: "memberId required" });
    }
    if (!plans || !Array.isArray(plans) || plans.length === 0) {
      return res.status(400).json({ message: "Select at least one plan", fields: ["plans"] });
    }

    const errFields: string[] = [];

    if (!personalDetails || typeof personalDetails !== "object") {
      return res.status(400).json({ message: "Personal details required", fields: ["personalDetails"] });
    }
    const pd = personalDetails;
    if (typeof pd.name !== "string" || pd.name.trim().length < 2) {
      errFields.push("name");
    }
    if (typeof pd.dob !== "string" || !pd.dob.trim()) {
      errFields.push("dob");
    } else {
      const d = new Date(pd.dob);
      if (Number.isNaN(d.getTime())) errFields.push("dob");
    }
    if (typeof pd.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pd.email.trim())) {
      errFields.push("email");
    }
    if (typeof pd.emergencyContactName !== "string" || pd.emergencyContactName.trim().length < 2) {
      errFields.push("emergencyContactName");
    }
    if (typeof pd.emergencyContactPhone !== "string" || !/^\d{10}$/.test(pd.emergencyContactPhone.replace(/\s/g, ""))) {
      errFields.push("emergencyContactPhone");
    }
    if (errFields.length > 0) {
      return res.status(400).json({ message: "Invalid or missing required fields", fields: errFields });
    }

    const types = await storage.getClassTypes();
    const nameToAgeGroup: Record<string, string> = {};
    for (const t of types) nameToAgeGroup[t.name] = t.ageGroup;
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

    // Update member personal details
    if (personalDetails) {
      await storage.updateMember(memberId, {
        name: personalDetails.name,
        email: personalDetails.email,
        dob: personalDetails.dob,
        emergencyContactName: personalDetails.emergencyContactName,
        emergencyContactPhone: personalDetails.emergencyContactPhone,
        medicalConditions: personalDetails.medicalConditions,
      });
    }

    // Create memberships
    const createdMemberships: any[] = [];
    for (const plan of plans) {
      const ms = await storage.createMembership({
        memberId,
        category: plan.category,
        planName: plan.planName,
        sessionsTotal: plan.sessions,
        sessionsRemaining: plan.sessions,
        price: plan.price,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * (plan.validityDays || 30)),
      });
      createdMemberships.push(ms);
    }

    // Save waiver
    if (waiver) {
      await storage.createWaiver({
        memberId,
        signatureName: waiver.signatureName,
        agreedTerms: waiver.agreedTerms,
        agreedAge: waiver.agreedAge,
      });
    }

    // Save kid details
    if (kidInfo && kidInfo.name) {
      await storage.createKidDetail({
        memberId,
        kidName: kidInfo.name,
        kidDob: kidInfo.dob,
        kidGender: kidInfo.gender,
      });
    }

    // Return updated membership map
    const allMemberships = await storage.getMemberMemberships(memberId);
    const membershipMap: Record<string, any> = {};
    for (const m of allMemberships) {
      membershipMap[m.category] = {
        id: m.id,
        sessionsRemaining: m.sessionsRemaining,
        expiryDate: m.expiryDate,
        planName: m.planName,
      };
    }

    res.json({ memberships: membershipMap });
  }));

  // Extension (1 week, once per membership)
  app.post("/api/memberships/:id/request-extension", asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const membership = await storage.getMembershipById(id);
    if (!membership) return res.status(404).json({ message: "Membership not found" });
    if (membership.extensionRequestedAt) return res.status(400).json({ message: "Extension already requested" });
    await storage.updateMembership(id, { extensionRequestedAt: new Date() });
    res.json({ ok: true, message: "Extension requested" });
  }));

  app.post("/api/memberships/:id/approve-extension", asyncHandler(async (req: Request, res: Response) => {
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
  }));
}
