import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { asyncHandler } from "./middleware";
import { registerAdminRoutes } from "./routes/admin";
import { registerManageSessionRoutes } from "./routes/manage-session";
import { registerMembershipRoutes } from "./routes/membership";
import { registerMembershipPlansRoutes } from "./routes/membership-plans";
import { registerMasterDataRoutes } from "./routes/master-data";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed only when explicitly requested (dev/staging: set SEED_ON_START=true; or run npm run seed).
  if (process.env.SEED_ON_START === "true") {
    try {
      await seedDatabase();
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string; errors?: Array<{ code?: string }> };
      const isConnectionRefused =
        e.code === "ECONNREFUSED" ||
        e.errors?.some((x: { code?: string }) => x.code === "ECONNREFUSED");
      if (isConnectionRefused) {
        console.warn(
          "Database unreachable. Server starting anyway. Set DATABASE_URL in .env (see .env.example) for full functionality."
        );
      } else {
        throw err;
      }
    }
  }

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get("/api/settings", asyncHandler(async (_req: Request, res: Response) => {
    const raw = await storage.getAppSetting("cancellation_window_minutes");
    const cancellationWindowMinutes = raw ? parseInt(raw, 10) : 60;
    res.json({ cancellationWindowMinutes: Number.isNaN(cancellationWindowMinutes) ? 60 : cancellationWindowMinutes });
  }));

  if (process.env.NODE_ENV !== "production") {
    app.get("/api/env", (_req: Request, res: Response) => {
      let dbHost = "";
      let dbName = "";
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl) {
        try {
          const parsed = new URL(dbUrl);
          dbHost = parsed.hostname;
          dbName = parsed.pathname.slice(1) || "neondb";
        } catch {
          // ignore
        }
      }
      res.json({
        nodeEnv: process.env.NODE_ENV ?? "development",
        port: process.env.PORT ?? "5000",
        dbHost,
        dbName,
        usingStaging: process.env.APP_ENV === "staging",
      });
    });
  }

  // --- AUTH / LOGIN ---
  app.post("/api/login", asyncHandler(async (req: Request, res: Response) => {
    const { phone } = req.body;
    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ message: "Phone number required" });
    }

    let member = await storage.getMemberByPhone(phone);
    const isNew = !member;

    if (!member) {
      member = await storage.createMember({ phone, name: "" });
    }

    const membershipList = await storage.getMemberMemberships(member.id);
    const membershipMap: Record<string, any> = {};
    for (const m of membershipList) {
      membershipMap[m.category] = {
        id: m.id,
        sessionsRemaining: m.sessionsRemaining,
        expiryDate: m.expiryDate,
        planName: m.planName,
      };
    }

    res.json({ member, memberships: membershipMap, isNew: isNew || membershipList.length === 0 });
  }));

  // --- Register split route modules ---
  registerMasterDataRoutes(app);
  registerMembershipPlansRoutes(app);
  registerMembershipRoutes(app);
  registerManageSessionRoutes(app);
  registerAdminRoutes(app);

  return httpServer;
}
