import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../middleware";

export function registerMembershipPlansRoutes(app: Express): void {
  app.get("/api/membership-plans", asyncHandler(async (req: Request, res: Response) => {
    const classTypeId = req.query.classTypeId as string;
    if (!classTypeId) {
      res.status(400).json({ message: "classTypeId required" });
      return;
    }
    const plans = await storage.getMembershipPlansByClassType(classTypeId);
    res.json(plans);
  }));

  // Legacy: all plans grouped by class name
  app.get("/api/plans", asyncHandler(async (_req: Request, res: Response) => {
    const grouped = await storage.getMembershipPlansGroupedByClassType();
    const out: Record<string, Array<{ id: string; name: string; sessions: number; price: number; validityDays: number; gstInclusive: boolean }>> = {};
    for (const [className, plans] of Object.entries(grouped)) {
      out[className] = plans.map((p) => ({
        id: p.id,
        name: p.name,
        sessions: p.sessions,
        price: p.price,
        validityDays: p.validityDays,
        gstInclusive: p.gstInclusive === true,
      }));
    }
    res.json(out);
  }));
}
