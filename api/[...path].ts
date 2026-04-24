import "dotenv/config";
import dns from "node:dns";
import type { Request, Response } from "express";
import { createApp } from "../server/app.js";
import { connectDb } from "../server/db.js";

export const config = { runtime: "nodejs" };

let appPromise: Promise<(req: Request, res: Response) => void> | null = null;

async function getVercelApp(): Promise<(req: Request, res: Response) => void> {
  if (!appPromise) {
    appPromise = (async () => {
      if (process.env.NODE_ENV === "production") {
        dns.setDefaultResultOrder("ipv4first");
      }
      await connectDb();
      const { app } = await createApp({ frontend: "none" });
      return app;
    })();
  }
  return appPromise;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  const app = await getVercelApp();
  app(req, res);
}
