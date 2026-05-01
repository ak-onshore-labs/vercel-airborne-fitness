import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import type { AdminTransactionsFilters, UpcomingScheduleSlotBookingPreviewItem } from "../storage";
import { asyncHandler, requireAdmin, requireAdminOnly } from "../middleware";
import { MembershipPlanModel } from "../models";
import { GST_PERCENT, computePlanPricing } from "../lib/pricing";
import { isMembershipBookable } from "@shared/membershipState";
import { calendarDateInIST, computeMembershipExpiryExclusiveEnd, parseMembershipStartDateFromInput } from "@shared/membershipDates";
import { isEligibleForGenderRestriction, resolveMemberGenderForRestriction } from "../lib/genderEligibility";

const requireAdminAsync = asyncHandler(requireAdmin);
const requireAdminOnlyAsync = asyncHandler(requireAdminOnly);
const SCHEDULE_GENDER_RESTRICTIONS = new Set(["NONE", "FEMALE_ONLY"]);
const PROFILE_GENDERS = new Set(["Male", "Female", "Other", "Prefer not to say"]);

/** Find a membership for this member that matches the slot's class type. Only active memberships (expiry in future, sessions > 0). */
async function findMembershipForSlot(memberId: string, scheduleId: string): Promise<{ id: string; sessionsRemaining: number } | null> {
  const slot = await storage.getScheduleSlot(scheduleId);
  if (!slot) return null;
  const all = await storage.getMemberMemberships(memberId);
  const now = new Date();
  const memberships = all.filter((m) =>
    isMembershipBookable(
      {
        expiryDate: m.expiryDate,
        sessionsRemaining: m.sessionsRemaining,
        extensionApplied: (m as any).extensionApplied,
        pauseUsed: (m as any).pauseUsed,
        pauseStart: (m as any).pauseStart,
        pauseEnd: (m as any).pauseEnd,
        startDate: (m as any).startDate,
      },
      now
    )
  );
  const plans = await MembershipPlanModel.find({ classTypeId: slot.classTypeId });
  const planIds = new Set(plans.map((p: { _id: unknown }) => String(p._id)));
  const matching = memberships.filter((x) => planIds.has(x.membershipPlanId));
  matching.sort((a, b) => {
    const ea = new Date(a.expiryDate).getTime();
    const eb = new Date(b.expiryDate).getTime();
    if (ea !== eb) return ea - eb;
    const ca = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
    const cb = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
    if (ca !== cb) return ca - cb;
    return String(a.id).localeCompare(String(b.id), "en");
  });
  const m = matching[0];
  return m ? { id: m.id, sessionsRemaining: m.sessionsRemaining } : null;
}

/** Membership lookup for refunds (do not require sessionsRemaining > 0 or membership to be bookable right now). */
async function findMembershipForSlotForRestore(
  memberId: string,
  scheduleId: string
): Promise<{ id: string; sessionsRemaining: number } | null> {
  const slot = await storage.getScheduleSlot(scheduleId);
  if (!slot) return null;
  const all = await storage.getMemberMemberships(memberId);
  const plans = await MembershipPlanModel.find({ classTypeId: slot.classTypeId });
  const planIds = new Set(plans.map((p: { _id: unknown }) => String(p._id)));
  const matching = all.filter((x) => planIds.has(x.membershipPlanId));
  matching.sort((a, b) => {
    const ea = new Date(a.expiryDate).getTime();
    const eb = new Date(b.expiryDate).getTime();
    if (ea !== eb) return ea - eb;
    const ca = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
    const cb = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
    if (ca !== cb) return ca - cb;
    return String(a.id).localeCompare(String(b.id), "en");
  });
  const m = matching[0];
  return m ? { id: m.id, sessionsRemaining: m.sessionsRemaining } : null;
}

async function isMemberEligibleForSlot(memberId: string, scheduleId: string): Promise<boolean> {
  const slot = await storage.getScheduleSlot(scheduleId);
  if (!slot) return false;
  const resolvedGender = await resolveMemberGenderForRestriction(memberId);
  return isEligibleForGenderRestriction(slot.genderRestriction, resolvedGender);
}

async function promoteWaitlistForSession(scheduleId: string, sessionDate: string): Promise<void> {
  const sessionBookings = await storage.getBookingsForSession(scheduleId, sessionDate);
  const waitlistOrdered = sessionBookings
    .filter((b) => b.status === "WAITLIST")
    .sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999));

  let promotedBookingId: string | null = null;
  for (const candidate of waitlistOrdered) {
    const eligibleByGender = await isMemberEligibleForSlot(candidate.memberId, scheduleId);
    if (!eligibleByGender) {
      await storage.updateBookingStatus(candidate.id, "CANCELLED", null);
      continue;
    }
    const membership = await findMembershipForSlot(candidate.memberId, scheduleId);
    if (!membership || membership.sessionsRemaining <= 0) continue;
    const ok = await storage.decrementMembershipSessionsIfPositive(membership.id);
    if (!ok) continue;
    await storage.updateBookingStatus(candidate.id, "BOOKED", null);
    promotedBookingId = candidate.id;
    break;
  }

  const latest = await storage.getBookingsForSession(scheduleId, sessionDate);
  const waitlistToRenumber = latest
    .filter((b) => b.status === "WAITLIST" && b.id !== promotedBookingId)
    .sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999));
  for (let i = 0; i < waitlistToRenumber.length; i++) {
    await storage.updateBookingStatus(waitlistToRenumber[i].id, "WAITLIST", i + 1);
  }
}

function parseIntParam(v: unknown, def: number): number {
  if (v === undefined || v === null) return def;
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function parseAdminTransactionFilters(req: Request): AdminTransactionsFilters {
  const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom.trim() : "";
  const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo.trim() : "";
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const paymentMode = typeof req.query.paymentMode === "string" ? req.query.paymentMode.trim() : "";
  return {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(q ? { q } : {}),
    ...(paymentMode ? { paymentMode } : {}),
  };
}

function csvCell(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export function registerAdminRoutes(app: Express): void {
  app.get(
    "/api/admin/users",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const page = parseIntParam(req.query.page, 1);
      const limit = Math.min(parseIntParam(req.query.limit, 10), 100);
      const name = typeof req.query.name === "string" ? req.query.name : undefined;
      const result = await storage.listUsers({ page, limit, name });
      res.json(result);
    })
  );

  app.post(
    "/api/admin/users",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const body = req.body as Record<string, unknown>;
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const mobileRaw = typeof body.mobile === "string" ? body.mobile.trim() : "";
      const mobile = mobileRaw.replace(/\D/g, "");
      const gender = typeof body.gender === "string" ? body.gender.trim() : "";
      const userRole = body.userRole === "ADMIN" || body.userRole === "STAFF" || body.userRole === "MEMBER" ? body.userRole : "MEMBER";

      if (!name) {
        res.status(400).json({ message: "Name is required" });
        return;
      }
      if (gender !== "Male" && gender !== "Female") {
        res.status(400).json({ message: "Gender must be Male or Female" });
        return;
      }
      if (mobile.length < 10) {
        res.status(400).json({ message: "Valid phone number required (at least 10 digits)" });
        return;
      }
      const existing = await storage.getUserByMobile(mobile);
      if (existing) {
        res.status(409).json({ message: "A user with this phone number already exists" });
        return;
      }
      const user = await storage.createUser({ name, mobile, gender, userRole });
      res.status(201).json(user);
    })
  );

  app.patch(
    "/api/admin/users/:id",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const body = req.body as Record<string, unknown>;

      const existing = await storage.getUser(id);
      if (!existing) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const name = typeof body.name === "string" ? body.name.trim() : existing.name;
      const gender = typeof body.gender === "string" ? body.gender.trim() : existing.gender;
      const userRole = body.userRole === "ADMIN" || body.userRole === "STAFF" || body.userRole === "MEMBER" ? body.userRole : existing.userRole;

      if (!name) {
        res.status(400).json({ message: "Name is required" });
        return;
      }
      if (gender !== "Male" && gender !== "Female") {
        res.status(400).json({ message: "Gender must be Male or Female" });
        return;
      }
      if (!userRole) {
        res.status(400).json({ message: "User role is required" });
        return;
      }

      const updated = await storage.updateUser(id, { name, gender, userRole });
      if (!updated) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.status(200).json(updated);
    })
  );

  app.get(
    "/api/admin/schedule",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const page = parseIntParam(req.query.page, 1);
      const limit = Math.min(parseIntParam(req.query.limit, 10), 100);
      const classTypeName = typeof req.query.classTypeName === "string" ? req.query.classTypeName : undefined;
      const branch = typeof req.query.branch === "string" ? req.query.branch : undefined;
      const dayOfWeek = req.query.dayOfWeek !== undefined && req.query.dayOfWeek !== "" ? parseInt(String(req.query.dayOfWeek), 10) : undefined;
      const startTime = typeof req.query.startTime === "string" ? req.query.startTime : undefined;
      const result = await storage.listScheduleSlots({ page, limit, classTypeName, branch, dayOfWeek, startTime });
      res.json(result);
    })
  );

  app.post(
    "/api/admin/schedule-slots",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const body = req.body as Record<string, unknown>;
      const classTypeId = typeof body.classTypeId === "string" ? body.classTypeId.trim() : "";
      const branch = typeof body.branch === "string" ? body.branch.trim() : "";
      const dayOfWeek = typeof body.dayOfWeek === "number" ? body.dayOfWeek : typeof body.dayOfWeek === "string" ? parseInt(String(body.dayOfWeek), 10) : NaN;
      const startHour = typeof body.startHour === "number" ? body.startHour : typeof body.startHour === "string" ? parseInt(String(body.startHour), 10) : NaN;
      const startMinute = typeof body.startMinute === "number" ? body.startMinute : typeof body.startMinute === "string" ? parseInt(String(body.startMinute), 10) : 0;
      const endHour = typeof body.endHour === "number" ? body.endHour : typeof body.endHour === "string" ? parseInt(String(body.endHour), 10) : NaN;
      const endMinute = typeof body.endMinute === "number" ? body.endMinute : typeof body.endMinute === "string" ? parseInt(String(body.endMinute), 10) : 0;
      const capacity = typeof body.capacity === "number" ? body.capacity : typeof body.capacity === "string" ? parseInt(String(body.capacity), 10) : NaN;
      const genderRestrictionRaw = typeof body.genderRestriction === "string" ? body.genderRestriction.trim().toUpperCase() : "NONE";
      const genderRestriction = SCHEDULE_GENDER_RESTRICTIONS.has(genderRestrictionRaw) ? genderRestrictionRaw : null;

      if (!classTypeId) {
        res.status(400).json({ message: "Class type is required" });
        return;
      }
      if (!branch) {
        res.status(400).json({ message: "Branch is required" });
        return;
      }
      if (!Number.isFinite(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        res.status(400).json({ message: "Day must be 0–6 (Sun–Sat)" });
        return;
      }
      if (!Number.isFinite(startHour) || startHour < 0 || startHour > 23) {
        res.status(400).json({ message: "Start hour must be 0–23" });
        return;
      }
      if (!Number.isFinite(endHour) || endHour < 0 || endHour > 24) {
        res.status(400).json({ message: "End hour must be 0–24" });
        return;
      }
      const startMins = startHour * 60 + (Number.isFinite(startMinute) ? startMinute : 0);
      const endMins = endHour * 60 + (Number.isFinite(endMinute) ? endMinute : 0);
      if (endMins <= startMins) {
        res.status(400).json({ message: "End time must be after start time" });
        return;
      }
      if (!Number.isFinite(capacity) || capacity < 1 || capacity > 999) {
        res.status(400).json({ message: "Capacity must be between 1 and 999" });
        return;
      }
      if (!genderRestriction) {
        res.status(400).json({ message: "genderRestriction must be NONE or FEMALE_ONLY" });
        return;
      }

      const overlapping = await storage.findOverlappingScheduleSlots({
        classTypeId,
        branch,
        dayOfWeek,
        startHour,
        startMinute: Number.isFinite(startMinute) ? startMinute : 0,
        endHour,
        endMinute: Number.isFinite(endMinute) ? endMinute : 0,
      });
      if (overlapping.length > 0) {
        res.status(409).json({
          message: "A schedule already exists for this class type and branch at an overlapping time on the same day.",
        });
        return;
      }

      const slot = await storage.createScheduleSlot({
        classTypeId,
        branch,
        dayOfWeek,
        startHour,
        startMinute: Number.isFinite(startMinute) ? startMinute : 0,
        endHour,
        endMinute: Number.isFinite(endMinute) ? endMinute : 0,
        capacity,
        isActive: true,
        genderRestriction: genderRestriction as "NONE" | "FEMALE_ONLY",
      });
      res.status(201).json(slot);
    })
  );

  app.get(
    "/api/admin/class-types",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const page = parseIntParam(req.query.page, 1);
      const limit = Math.min(parseIntParam(req.query.limit, 10), 100);
      const result = await storage.listClassTypes({ page, limit });
      res.json(result);
    })
  );

  app.post(
    "/api/admin/class-types",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const body = req.body as Record<string, unknown>;
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const ageGroup = body.ageGroup === "Adult" || body.ageGroup === "Kid" ? body.ageGroup : "Adult";
      const strengthLevel = typeof body.strengthLevel === "number"
        ? Math.min(5, Math.max(1, Math.round(body.strengthLevel)))
        : typeof body.strengthLevel === "string"
          ? Math.min(5, Math.max(1, parseInt(body.strengthLevel, 10) || 1))
          : 1;
      const infoBullets = Array.isArray(body.infoBullets)
        ? (body.infoBullets as unknown[]).map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)
        : [];

      if (!name) {
        res.status(400).json({ message: "Name is required" });
        return;
      }
      const classType = await storage.createClassType({
        name,
        ageGroup,
        strengthLevel,
        infoBullets,
        isActive: true,
      });
      res.status(201).json(classType);
    })
  );

  app.get(
    "/api/admin/plans",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const page = parseIntParam(req.query.page, 1);
      const limit = Math.min(parseIntParam(req.query.limit, 10), 100);
      const classTypeName = typeof req.query.classTypeName === "string" ? req.query.classTypeName : undefined;
      const planName = typeof req.query.planName === "string" ? req.query.planName : undefined;
      const result = await storage.listMembershipPlans({ page, limit, classTypeName, planName });
      res.json(result);
    })
  );

  app.post(
    "/api/admin/plans",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const body = req.body as Record<string, unknown>;
      const classTypeId = typeof body.classTypeId === "string" ? body.classTypeId.trim() : "";
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const sessionsTotal = typeof body.sessionsTotal === "number" ? body.sessionsTotal : typeof body.sessionsTotal === "string" ? parseInt(String(body.sessionsTotal), 10) : 0;
      const validityDays = typeof body.validityDays === "number" ? body.validityDays : typeof body.validityDays === "string" ? parseInt(String(body.validityDays), 10) : 0;
      const price = typeof body.price === "number" ? body.price : typeof body.price === "string" ? parseFloat(String(body.price)) : 0;
      const gstInclusive = typeof body.gstInclusive === "boolean" ? body.gstInclusive : false;
      if (!classTypeId || !name) {
        res.status(400).json({ message: "Class type and plan name are required" });
        return;
      }
      if (!Number.isFinite(sessionsTotal) || sessionsTotal < 1 || !Number.isFinite(validityDays) || validityDays < 1 || !Number.isFinite(price) || price < 0) {
        res.status(400).json({ message: "Sessions, validity days and price must be valid positive numbers" });
        return;
      }
      const plan = await storage.createMembershipPlan({ classTypeId, name, sessionsTotal, validityDays, price, gstInclusive, isActive: true });
      res.status(201).json(plan);
    })
  );

  app.patch(
    "/api/admin/plans/:id",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const body = req.body as Record<string, unknown>;
      const data: Record<string, unknown> = {};
      if (typeof body.isActive === "boolean") data.isActive = body.isActive;
      const updated = await storage.updateMembershipPlan(id, data as Parameters<typeof storage.updateMembershipPlan>[1]);
      if (!updated) {
        res.status(404).json({ message: "Membership plan not found" });
        return;
      }
      res.json(updated);
    })
  );

  app.get(
    "/api/admin/members",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const page = parseIntParam(req.query.page, 1);
      const limit = Math.min(parseIntParam(req.query.limit, 10), 100);
      const phone = typeof req.query.phone === "string" ? req.query.phone : undefined;
      const name = typeof req.query.name === "string" ? req.query.name : undefined;
      const email = typeof req.query.email === "string" ? req.query.email : undefined;
      const result = await storage.listMembers({ page, limit, phone, name, email });
      res.json(result);
    })
  );

  app.post(
    "/api/admin/members",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const body = req.body as Record<string, unknown>;
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const mobileRaw = typeof body.mobile === "string" ? body.mobile.trim() : "";
      const mobile = mobileRaw.replace(/\D/g, "");
      const gender = typeof body.gender === "string" ? body.gender.trim() : "";
      const userRole = body.userRole === "ADMIN" || body.userRole === "STAFF" || body.userRole === "MEMBER" ? body.userRole : "MEMBER";
      const memberType = body.memberType === "Kid" || body.memberType === "Adult" ? body.memberType : "Adult";
      const memberName = typeof body.memberName === "string" ? body.memberName.trim() || null : null;
      const memberEmail = typeof body.memberEmail === "string" ? body.memberEmail.trim() || null : null;
      const memberDob = typeof body.memberDob === "string" ? body.memberDob.trim() || null : null;
      const memberGenderRaw = typeof body.memberGender === "string" ? body.memberGender.trim() : "";
      const memberGender = memberGenderRaw ? memberGenderRaw : null;

      if (!name) {
        res.status(400).json({ message: "Name is required" });
        return;
      }
      if (gender !== "Male" && gender !== "Female") {
        res.status(400).json({ message: "Gender must be Male or Female" });
        return;
      }
      if (mobile.length < 10) {
        res.status(400).json({ message: "Valid phone number required (at least 10 digits)" });
        return;
      }
      if (userRole !== "MEMBER") {
        res.status(400).json({ message: "Admin/Staff users must be created from Admin Users. Members endpoint accepts only MEMBER role." });
        return;
      }
      if (memberGender && !PROFILE_GENDERS.has(memberGender)) {
        res.status(400).json({ message: "Kid gender must be Male, Female, Other, or Prefer not to say" });
        return;
      }
      const existingUser = await storage.getUserByMobile(mobile);
      if (existingUser) {
        res.status(409).json({ message: "A user with this phone number already exists" });
        return;
      }

      const user = await storage.createUser({ name, mobile, gender, userRole });
      const member = await storage.createMember({
        userId: user.id,
        memberType,
        name: memberName ?? (memberType === "Adult" ? name : null),
        email: memberEmail,
        dob: memberDob,
        gender: memberGender as "Male" | "Female" | "Other" | "Prefer not to say" | null,
      });
      res.status(201).json(member);
    })
  );

  app.patch(
    "/api/admin/members/:id",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const body = req.body as Record<string, unknown>;
      const email = typeof body.email === "string" ? body.email.trim() : undefined;
      const existing = await storage.getMember(id);
      if (!existing) {
        res.status(404).json({ message: "Member not found" });
        return;
      }
      const updated = await storage.updateMember(id, { email: email ?? existing.email });
      if (!updated) {
        res.status(404).json({ message: "Member not found" });
        return;
      }
      res.status(200).json(updated);
    })
  );

  app.get(
    "/api/admin/memberships",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const page = parseIntParam(req.query.page, 1);
      const limit = Math.min(parseIntParam(req.query.limit, 10), 100);
      const memberName = typeof req.query.memberName === "string" ? req.query.memberName : undefined;
      const memberMobile = typeof req.query.memberMobile === "string" ? req.query.memberMobile : undefined;
      const classTypeName = typeof req.query.classTypeName === "string" ? req.query.classTypeName : undefined;
      const startDateFrom = typeof req.query.startDateFrom === "string" ? req.query.startDateFrom : undefined;
      const startDateTo = typeof req.query.startDateTo === "string" ? req.query.startDateTo : undefined;
      const expiryDateFrom = typeof req.query.expiryDateFrom === "string" ? req.query.expiryDateFrom : undefined;
      const expiryDateTo = typeof req.query.expiryDateTo === "string" ? req.query.expiryDateTo : undefined;
      const result = await storage.listMemberships({
        page,
        limit,
        memberName,
        memberMobile,
        classTypeName,
        startDateFrom,
        startDateTo,
        expiryDateFrom,
        expiryDateTo,
      });
      res.json(result);
    })
  );

  app.get(
    "/api/admin/memberships/export.csv",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const memberName = typeof req.query.memberName === "string" ? req.query.memberName : undefined;
      const memberMobile = typeof req.query.memberMobile === "string" ? req.query.memberMobile : undefined;
      const classTypeName = typeof req.query.classTypeName === "string" ? req.query.classTypeName : undefined;
      const startDateFrom = typeof req.query.startDateFrom === "string" ? req.query.startDateFrom : undefined;
      const startDateTo = typeof req.query.startDateTo === "string" ? req.query.startDateTo : undefined;
      const expiryDateFrom = typeof req.query.expiryDateFrom === "string" ? req.query.expiryDateFrom : undefined;
      const expiryDateTo = typeof req.query.expiryDateTo === "string" ? req.query.expiryDateTo : undefined;

      const rows = await storage.listMembershipsForExport({
        memberName,
        memberMobile,
        classTypeName,
        startDateFrom,
        startDateTo,
        expiryDateFrom,
        expiryDateTo,
      });
      const headers = [
        "Member Name",
        "Member Mobile",
        "Plan",
        "Class type",
        "Sessions left",
        "Start Date",
        "Expiry",
        "Extension",
      ];
      const lines = [headers.join(",")];
      for (const row of rows) {
        lines.push(
          [
            row.memberName,
            row.memberMobile,
            row.planName,
            row.classTypeName,
            row.sessionsRemaining,
            row.startDate,
            row.expiryDate,
            row.extension,
          ].map((x) => csvCell(x ?? "—")).join(",")
        );
      }
      const csv = `${lines.join("\n")}\n`;
      const filename = `memberships-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    })
  );

  app.get(
    "/api/admin/transactions",
    requireAdminOnlyAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const page = parseIntParam(req.query.page, 1);
      const limit = Math.min(parseIntParam(req.query.limit, 10), 100);
      const filters = parseAdminTransactionFilters(req);
      const result = await storage.listAdminTransactions({ page, limit, filters });
      res.json(result);
    })
  );

  app.get(
    "/api/admin/transactions/export.csv",
    requireAdminOnlyAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const filters = parseAdminTransactionFilters(req);
      const rows = await storage.listAdminTransactionsForExport(filters);
      const headers = [
        "Date",
        "Member Name",
        "Member Mobile",
        "Plan",
        "Class Type",
        "Payment Mode",
        "Subtotal",
        "GST",
        "Total Amount",
        "Reference",
        "Source",
      ];
      const lines = [headers.join(",")];
      for (const row of rows) {
        lines.push(
          [
            row.date,
            row.memberName,
            row.memberMobile,
            row.plan,
            row.classType,
            row.paymentMode,
            row.subtotal,
            row.gst,
            row.totalAmount,
            row.reference,
            row.source,
          ].map((x) => csvCell(x ?? "—")).join(",")
        );
      }
      const csv = `${lines.join("\n")}\n`;
      const filename = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    })
  );

  app.post(
    "/api/admin/memberships",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const auth = req.auth!;
      const body = req.body as Record<string, unknown>;
      const memberId = typeof body.memberId === "string" ? body.memberId.trim() : "";
      const membershipPlanId = typeof body.membershipPlanId === "string" ? body.membershipPlanId.trim() : "";
      const sessionsOverride = typeof body.sessionsRemaining === "number" ? body.sessionsRemaining : typeof body.sessionsRemaining === "string" ? parseInt(String(body.sessionsRemaining), 10) : undefined;
      const validityDaysOverride = typeof body.validityDays === "number" ? body.validityDays : typeof body.validityDays === "string" ? parseInt(String(body.validityDays), 10) : undefined;
      const paymentMode = typeof body.paymentMode === "string" ? body.paymentMode.trim() : "";

      if (!memberId) {
        res.status(400).json({ message: "Member is required" });
        return;
      }
      if (!membershipPlanId) {
        res.status(400).json({ message: "Membership plan is required" });
        return;
      }

      const member = await storage.getMember(memberId);
      if (!member) {
        res.status(404).json({ message: "Member not found" });
        return;
      }

      const planDoc = await MembershipPlanModel.findById(membershipPlanId);
      if (!planDoc) {
        res.status(404).json({ message: "Membership plan not found" });
        return;
      }
      if ((planDoc as { isActive?: boolean }).isActive === false) {
        res.status(400).json({ message: "Cannot create membership for an inactive plan" });
        return;
      }

      const sessionsTotal = sessionsOverride ?? planDoc.sessionsTotal ?? 1;
      const validityDays = validityDaysOverride ?? planDoc.validityDays ?? 30;
      if (!Number.isFinite(sessionsTotal) || sessionsTotal < 1 || !Number.isFinite(validityDays) || validityDays < 1) {
        res.status(400).json({ message: "Sessions and validity days must be positive numbers" });
        return;
      }

      const todayStr = calendarDateInIST(new Date());
      const expiryDate = computeMembershipExpiryExclusiveEnd(todayStr, validityDays);
      const startDate = parseMembershipStartDateFromInput(todayStr);
      const membership = await storage.createMembership({
        memberId,
        membershipPlanId,
        sessionsRemaining: sessionsTotal,
        expiryDate,
        carryForward: 0,
        extensionApplied: false,
        pauseUsed: false,
        startDate,
      });

      // Optional: record a cash transaction for admin-created memberships
      if (paymentMode.toLowerCase() === "cash") {
        const rowPricing = computePlanPricing({
          price: typeof (planDoc as any).price === "number" ? (planDoc as any).price : 0,
          gstInclusive: (planDoc as any).gstInclusive === true,
        });
        const subtotalInr = rowPricing.subtotalInr;
        const gstInr = rowPricing.gstInr;
        const totalInr = rowPricing.totalInr;
        const totalPaise = Math.round(totalInr * 100);
        const gstPercent = (planDoc as any).gstInclusive === true ? 0 : GST_PERCENT;
        const idSuffix = String(membership.id).slice(-8);
        const receipt = `cash_${idSuffix}`.slice(0, 40);
        const orderId = `cash_${membership.id}`;
        await storage.createTransaction({
          orderId,
          userId: member.userId,
          amount: totalPaise,
          currency: "INR",
          status: "SUCCESS",
          receipt,
          paymentId: null,
          signature: null,
          metadata: {
            mode: "Cash",
            gstPercent,
            subtotalInr,
            gstInr,
            totalInr,
            memberId,
            membershipId: membership.id,
            membershipPlanId,
            planName: (planDoc as any).name,
            classTypeId: (planDoc as any).classTypeId,
            createdByUserId: auth.userId,
          },
        });
      }
      res.status(201).json(membership);
    })
  );

  app.get(
    "/api/admin/bookings",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const page = parseIntParam(req.query.page, 1);
      const limit = Math.min(parseIntParam(req.query.limit, 10), 100);
      const sessionDate = typeof req.query.sessionDate === "string" ? req.query.sessionDate : undefined;
      const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined;
      const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;
      const memberMobile = typeof req.query.memberMobile === "string" ? req.query.memberMobile : undefined;
      const memberName = typeof req.query.memberName === "string" ? req.query.memberName : undefined;
      const scheduleId = typeof req.query.scheduleId === "string" ? req.query.scheduleId : undefined;
      const classTypeName = typeof req.query.classTypeName === "string" ? req.query.classTypeName : undefined;
      const branch = typeof req.query.branch === "string" ? req.query.branch : undefined;
      if (dateFrom && dateTo && dateFrom > dateTo) {
        res.status(400).json({ message: "dateFrom cannot be after dateTo" });
        return;
      }
      const result = await storage.listBookings({
        page,
        limit,
        sessionDate,
        dateFrom,
        dateTo,
        memberMobile,
        memberName,
        scheduleId,
        classTypeName,
        branch,
      });
      res.json(result);
    })
  );

  app.get(
    "/api/admin/bookings/export.csv",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const dateFrom = typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined;
      const dateTo = typeof req.query.dateTo === "string" ? req.query.dateTo : undefined;
      const memberMobile = typeof req.query.memberMobile === "string" ? req.query.memberMobile : undefined;
      const memberName = typeof req.query.memberName === "string" ? req.query.memberName : undefined;
      const classTypeName = typeof req.query.classTypeName === "string" ? req.query.classTypeName : undefined;
      const branch = typeof req.query.branch === "string" ? req.query.branch : undefined;

      if (dateFrom && dateTo && dateFrom > dateTo) {
        res.status(400).send("dateFrom cannot be after dateTo");
        return;
      }

      const rows = await storage.listBookingsForExport({
        dateFrom,
        dateTo,
        memberMobile,
        memberName,
        classTypeName,
        branch,
      });
      const headers = ["Date", "Time", "Member Name", "Member mobile", "Class type", "Branch", "Status"];
      const lines = [headers.join(",")];
      for (const row of rows) {
        lines.push(
          [
            row.date,
            row.time,
            row.memberName,
            row.memberMobile,
            row.classTypeName,
            row.branch,
            row.status,
          ].map((x) => csvCell(x ?? "—")).join(",")
        );
      }
      const csv = `${lines.join("\n")}\n`;
      const filename = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    })
  );

  app.post(
    "/api/admin/bookings",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const body = req.body as Record<string, unknown>;
      const memberId = typeof body.memberId === "string" ? body.memberId.trim() : "";
      const scheduleId = typeof body.scheduleId === "string" ? body.scheduleId.trim() : "";
      const sessionDate = typeof body.sessionDate === "string" ? body.sessionDate.trim() : "";

      if (!memberId || !scheduleId || !sessionDate) {
        res.status(400).json({ message: "Member, schedule and date are required" });
        return;
      }

      const member = await storage.getMember(memberId);
      if (!member) {
        res.status(404).json({ message: "Member not found" });
        return;
      }

      const slot = await storage.getScheduleSlot(scheduleId);
      if (!slot) {
        res.status(400).json({ message: "Invalid schedule slot" });
        return;
      }

      const resolvedGender = await resolveMemberGenderForRestriction(memberId);
      if (!isEligibleForGenderRestriction(slot.genderRestriction, resolvedGender)) {
        res.status(400).json({ message: "Selected member is not eligible for this female-only session." });
        return;
      }

      const existingBookings = await storage.getBookingsForSession(scheduleId, sessionDate);
      const bookedCount = existingBookings.filter((b) => b.status === "BOOKED").length;
      const alreadyBooked = existingBookings.find((b) => b.memberId === memberId && b.status !== "CANCELLED");
      if (alreadyBooked) {
        res.status(409).json({ message: "Member is already booked for this session" });
        return;
      }

      const membership = await findMembershipForSlot(memberId, scheduleId);
      if (!membership || membership.sessionsRemaining <= 0) {
        res.status(400).json({ message: "No active membership with sessions remaining for this class type" });
        return;
      }

      if (bookedCount >= slot.capacity) {
        res.status(400).json({ message: "Session is full" });
        return;
      }

      const decremented = await storage.decrementMembershipSessionsIfPositive(membership.id);
      if (!decremented) {
        res.status(400).json({ message: "No sessions remaining" });
        return;
      }
      const booking = await storage.createBooking({
        memberId,
        scheduleId,
        sessionDate,
        status: "BOOKED",
      });

      const pad2 = (n: number) => String(n).padStart(2, "0");
      res.status(201).json({
        ...booking,
        category: slot.category,
        branch: slot.branch,
        startTime: `${pad2(slot.startHour)}:${pad2(slot.startMinute)}`,
        endTime: `${pad2(slot.endHour)}:${pad2(slot.endMinute)}`,
      });
    })
  );

  app.post(
    "/api/admin/bookings/:bookingId/cancel",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const bookingId = typeof req.params.bookingId === "string" ? req.params.bookingId : "";
      if (!bookingId) {
        res.status(400).json({ message: "Missing bookingId" });
        return;
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        res.status(404).json({ message: "Booking not found" });
        return;
      }

      const currentStatus = booking.status;
      if (currentStatus !== "BOOKED" && currentStatus !== "WAITLIST") {
        res.status(409).json({ message: `Cannot cancel booking from status ${currentStatus}` });
        return;
      }

      // Update booking status first (side effects depend on the updated session state).
      await storage.updateBookingStatus(booking.id, "CANCELLED", null);

      // Refund/seat restoration only for booked cancellations.
      if (currentStatus === "BOOKED") {
        const membershipToRestore = await findMembershipForSlotForRestore(booking.memberId, booking.scheduleId);
        if (membershipToRestore) {
          await storage.incrementMembershipSessions(membershipToRestore.id, 1);
        }
      }

      if (currentStatus === "BOOKED") {
        await promoteWaitlistForSession(booking.scheduleId, booking.sessionDate);
      } else {
        const sessionBookings = await storage.getBookingsForSession(booking.scheduleId, booking.sessionDate);
        const waitlistOrdered = sessionBookings
          .filter((b) => b.status === "WAITLIST")
          .sort((a, b) => (a.waitlistPosition ?? 999) - (b.waitlistPosition ?? 999));
        for (let i = 0; i < waitlistOrdered.length; i++) {
          await storage.updateBookingStatus(waitlistOrdered[i].id, "WAITLIST", i + 1);
        }
      }

      res.json({ ok: true });
    })
  );

  app.post(
    "/api/admin/bookings/:bookingId/attend",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const bookingId = typeof req.params.bookingId === "string" ? req.params.bookingId : "";
      if (!bookingId) {
        res.status(400).json({ message: "Missing bookingId" });
        return;
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        res.status(404).json({ message: "Booking not found" });
        return;
      }

      if (booking.status !== "BOOKED") {
        res.status(409).json({ message: `Cannot mark attended from status ${booking.status}` });
        return;
      }

      await storage.updateBookingStatus(booking.id, "ATTENDED", null);
      res.json({ ok: true });
    })
  );

  app.post(
    "/api/admin/bookings/:bookingId/absent",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const bookingId = typeof req.params.bookingId === "string" ? req.params.bookingId : "";
      if (!bookingId) {
        res.status(400).json({ message: "Missing bookingId" });
        return;
      }

      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        res.status(404).json({ message: "Booking not found" });
        return;
      }

      if (booking.status !== "BOOKED") {
        res.status(409).json({ message: `Cannot mark absent from status ${booking.status}` });
        return;
      }

      await storage.updateBookingStatus(booking.id, "ABSENT", null);
      res.json({ ok: true });
    })
  );

  app.get(
    "/api/admin/bookings/upcoming",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const branch = typeof req.query.branch === "string" ? req.query.branch.trim() : "";
      const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : new Date().toISOString().slice(0, 10);
      const days = Math.min(Math.max(1, parseIntParam(req.query.days, 5)), 14);
      if (!branch) {
        res.status(400).json({ message: "Branch is required" });
        return;
      }
      const result = await storage.getUpcomingSessionsByBranch(branch, fromDate, days);
      res.json(result);
    })
  );

  app.get(
    "/api/admin/branches",
    requireAdminAsync,
    asyncHandler(async (_req: Request, res: Response) => {
      const branches = await storage.getBranches();
      res.json(branches);
    })
  );

  app.get(
    "/api/admin/dashboard",
    requireAdminAsync,
    asyncHandler(async (_req: Request, res: Response) => {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    })
  );

  app.get(
    "/api/admin/settings",
    requireAdminAsync,
    asyncHandler(async (_req: Request, res: Response) => {
      const raw = await storage.getAppSetting("cancellation_window_minutes");
      const cancellationWindowMinutes = raw ? parseInt(raw, 10) : 60;
      res.json({
        cancellationWindowMinutes: Number.isNaN(cancellationWindowMinutes) ? 60 : cancellationWindowMinutes,
      });
    })
  );

  app.patch(
    "/api/admin/settings",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const body = req.body as Record<string, unknown>;
      const value = typeof body.cancellationWindowMinutes === "number"
        ? body.cancellationWindowMinutes
        : typeof body.cancellationWindowMinutes === "string"
          ? parseInt(String(body.cancellationWindowMinutes), 10)
          : NaN;
      if (!Number.isFinite(value) || value < 0 || value > 1440) {
        res.status(400).json({ message: "Cancellation window must be between 0 and 1440 minutes" });
        return;
      }
      await storage.setAppSetting("cancellation_window_minutes", String(value));
      res.json({ cancellationWindowMinutes: value });
    })
  );

  app.patch(
    "/api/admin/class-types/:id",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const body = req.body as Record<string, unknown>;
      const data: Record<string, unknown> = {};
      if (typeof body.name === "string") data.name = body.name;
      if (typeof body.ageGroup === "string") data.ageGroup = body.ageGroup;
      if (typeof body.strengthLevel === "number") data.strengthLevel = body.strengthLevel;
      if (Array.isArray(body.infoBullets)) data.infoBullets = body.infoBullets;
      if (typeof body.isActive === "boolean") data.isActive = body.isActive;
      const updated = await storage.updateClassType(id, data as Parameters<typeof storage.updateClassType>[1]);
      if (!updated) {
        res.status(404).json({ message: "Class type not found" });
        return;
      }
      res.json(updated);
    })
  );

  app.patch(
    "/api/admin/membership-plans/:id",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const body = req.body as Record<string, unknown>;
      const data: Record<string, unknown> = {};
      if (typeof body.name === "string") data.name = body.name;
      if (typeof body.sessionsTotal === "number") data.sessionsTotal = body.sessionsTotal;
      if (typeof body.validityDays === "number") data.validityDays = body.validityDays;
      if (typeof body.price === "number") data.price = body.price;
      if (typeof body.gstInclusive === "boolean") data.gstInclusive = body.gstInclusive;
      if (typeof body.isActive === "boolean") data.isActive = body.isActive;
      const updated = await storage.updateMembershipPlan(id, data as Parameters<typeof storage.updateMembershipPlan>[1]);
      if (!updated) {
        res.status(404).json({ message: "Membership plan not found" });
        return;
      }
      res.json(updated);
    })
  );

  app.patch(
    "/api/admin/schedule-slots/:id",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const body = req.body as Record<string, unknown>;
      const disallowedFields = ["branch", "dayOfWeek", "startHour", "startMinute", "endHour", "endMinute", "classTypeId", "notes"];
      const attemptedDeferredFields = disallowedFields.filter((field) => Object.prototype.hasOwnProperty.call(body, field));
      if (attemptedDeferredFields.length > 0) {
        res.status(400).json({
          message: `These fields are not editable in this phase: ${attemptedDeferredFields.join(", ")}`,
        });
        return;
      }

      const slot = await storage.getScheduleSlot(id);
      if (!slot) {
        res.status(404).json({ message: "Schedule slot not found" });
        return;
      }

      const data: Record<string, unknown> = {};
      if (typeof body.capacity === "number") {
        const capacity = body.capacity;
        if (!Number.isFinite(capacity) || capacity < 1 || capacity > 999) {
          res.status(400).json({ message: "Capacity must be between 1 and 999" });
          return;
        }
        const today = calendarDateInIST(new Date());
        const preview = await storage.getUpcomingBookingsPreviewForScheduleSlot(id, today, 1);
        if (capacity < preview.summary.confirmedCount) {
          res.status(409).json({
            message: `Cannot reduce capacity below current future confirmed bookings (${preview.summary.confirmedCount}).`,
          });
          return;
        }
        data.capacity = capacity;
      }
      if (typeof body.isActive === "boolean") data.isActive = body.isActive;
      if (typeof body.genderRestriction === "string") {
        const normalized = body.genderRestriction.trim().toUpperCase();
        if (!SCHEDULE_GENDER_RESTRICTIONS.has(normalized)) {
          res.status(400).json({ message: "genderRestriction must be NONE or FEMALE_ONLY" });
          return;
        }
        if (slot.genderRestriction !== "FEMALE_ONLY" && normalized === "FEMALE_ONLY") {
          const today = calendarDateInIST(new Date());
          const preview = await storage.getUpcomingBookingsPreviewForScheduleSlot(id, today, 1000);
          const upcomingConfirmed = preview.items.filter((b: UpcomingScheduleSlotBookingPreviewItem) => b.status === "BOOKED");
          for (const booking of upcomingConfirmed) {
            const resolvedGender = await resolveMemberGenderForRestriction(booking.memberId);
            if (!isEligibleForGenderRestriction("FEMALE_ONLY", resolvedGender)) {
              res.status(409).json({
                message: "Cannot switch to Female only because some future confirmed bookings are not eligible.",
              });
              return;
            }
          }
        }
        data.genderRestriction = normalized;
      }
      const updated = await storage.updateScheduleSlot(id, data as Parameters<typeof storage.updateScheduleSlot>[1]);
      if (!updated) {
        res.status(404).json({ message: "Schedule slot not found" });
        return;
      }
      res.json(updated);
    })
  );

  app.get(
    "/api/admin/schedule-slots/:id/upcoming-bookings",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      const slot = await storage.getScheduleSlot(id);
      if (!slot) {
        res.status(404).json({ message: "Schedule slot not found" });
        return;
      }
      const today = calendarDateInIST(new Date());
      const preview = await storage.getUpcomingBookingsPreviewForScheduleSlot(id, today, 10);
      res.json(preview);
    })
  );
}
