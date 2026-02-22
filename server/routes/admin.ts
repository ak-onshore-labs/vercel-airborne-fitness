import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { asyncHandler, requireAdmin } from "../middleware";

export function registerAdminRoutes(app: Express): void {
  app.patch(
    "/api/admin/class-types/:id",
    requireAdmin,
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
      if (!updated) return res.status(404).json({ message: "Class type not found" });
      res.json(updated);
    })
  );

  app.patch(
    "/api/admin/membership-plans/:id",
    requireAdmin,
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
      if (!updated) return res.status(404).json({ message: "Membership plan not found" });
      res.json(updated);
    })
  );

  app.patch(
    "/api/admin/schedule-slots/:id",
    requireAdmin,
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
      if (!updated) return res.status(404).json({ message: "Schedule slot not found" });
      res.json(updated);
    })
  );
}
