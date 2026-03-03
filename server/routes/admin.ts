import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { asyncHandler, requireAdmin } from "../middleware";

const requireAdminAsync = asyncHandler(requireAdmin);

function parseIntParam(v: unknown, def: number): number {
  if (v === undefined || v === null) return def;
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
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
      if (!classTypeId || !name) {
        res.status(400).json({ message: "Class type and plan name are required" });
        return;
      }
      if (!Number.isFinite(sessionsTotal) || sessionsTotal < 1 || !Number.isFinite(validityDays) || validityDays < 1 || !Number.isFinite(price) || price < 0) {
        res.status(400).json({ message: "Sessions, validity days and price must be valid positive numbers" });
        return;
      }
      const plan = await storage.createMembershipPlan({ classTypeId, name, sessionsTotal, validityDays, price, isActive: true });
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
    "/api/admin/bookings",
    requireAdminAsync,
    asyncHandler(async (req: Request, res: Response) => {
      const page = parseIntParam(req.query.page, 1);
      const limit = Math.min(parseIntParam(req.query.limit, 10), 100);
      const sessionDate = typeof req.query.sessionDate === "string" ? req.query.sessionDate : undefined;
      const memberMobile = typeof req.query.memberMobile === "string" ? req.query.memberMobile : undefined;
      const classTypeName = typeof req.query.classTypeName === "string" ? req.query.classTypeName : undefined;
      const result = await storage.listBookings({ page, limit, sessionDate, memberMobile, classTypeName });
      res.json(result);
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
      const data: Record<string, unknown> = {};
      if (typeof body.branch === "string") data.branch = body.branch;
      if (typeof body.dayOfWeek === "number") data.dayOfWeek = body.dayOfWeek;
      if (typeof body.startHour === "number") data.startHour = body.startHour;
      if (typeof body.startMinute === "number") data.startMinute = body.startMinute;
      if (typeof body.endHour === "number") data.endHour = body.endHour;
      if (typeof body.endMinute === "number") data.endMinute = body.endMinute;
      if (typeof body.capacity === "number") data.capacity = body.capacity;
      if (typeof body.isActive === "boolean") data.isActive = body.isActive;
      if (body.notes !== undefined) data.notes = body.notes === null ? null : body.notes;
      const updated = await storage.updateScheduleSlot(id, data as Parameters<typeof storage.updateScheduleSlot>[1]);
      if (!updated) {
        res.status(404).json({ message: "Schedule slot not found" });
        return;
      }
      res.json(updated);
    })
  );
}
