import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../middleware";

export function registerMasterDataRoutes(app: Express): void {
  // Class types (DB-driven)
  app.get("/api/class-types", asyncHandler(async (_req: Request, res: Response) => {
    const types = await storage.getClassTypes();
    res.json(
      types.map((t) => ({
        id: t.id,
        name: t.name,
        ageGroup: t.ageGroup,
        strengthLevel: t.strengthLevel,
        descriptionPoints: t.infoBullets ?? [],
        isActive: t.isActive,
      }))
    );
  }));

  // Legacy alias for Enroll
  app.get("/api/categories", asyncHandler(async (_req: Request, res: Response) => {
    const types = await storage.getClassTypes();
    res.json(
      types.map((t) => ({
        id: t.id,
        name: t.name,
        ageGroup: t.ageGroup,
        strengthLevel: t.strengthLevel,
        infoBullets: t.infoBullets,
        descriptionPoints: t.infoBullets ?? [],
      }))
    );
  }));
}
