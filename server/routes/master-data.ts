import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../middleware";

export function registerMasterDataRoutes(app: Express): void {
  // Class types (DB-driven), sorted alphabetically by name for member-facing flows
  app.get("/api/class-types", asyncHandler(async (_req: Request, res: Response) => {
    const types = await storage.getClassTypes();
    const sorted = [...types].sort((a, b) => a.name.localeCompare(b.name, "en"));
    res.json(
      sorted.map((t) => ({
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
    const sorted = [...types].sort((a, b) => a.name.localeCompare(b.name, "en"));
    res.json(
      sorted.map((t) => ({
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
