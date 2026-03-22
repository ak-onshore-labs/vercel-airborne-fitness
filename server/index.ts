import "dotenv/config";
import dns from "node:dns";
import express, { type Request, Response, NextFunction } from "express";

// Some cloud hosts have broken IPv6 egress; MSG91 and other APIs then fail only in production.
if (process.env.NODE_ENV === "production") {
  dns.setDefaultResultOrder("ipv4first");
}
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { connectDb } from "./db";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const dbUrl = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      await connectDb();
      const match = dbUrl.match(/mongodb(\+srv)?:\/\/([^/]+)/);
      const dbHost = match ? match[2] : "mongodb";
      const label = process.env.APP_ENV || "default";
      log(`DB: ${dbHost} (${label})`);
    } catch (err) {
      log(`DB connect failed: ${(err as Error).message}`, "express");
      throw err;
    }
  }

  await registerRoutes(httpServer, app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;
    const status = (err as { status?: number; statusCode?: number }).status
      ?? (err as { status?: number; statusCode?: number }).statusCode
      ?? 500;
    const message = (err as Error).message ?? "Internal Server Error";

    log(`Error ${status}: ${message}`, "express");
    if (status >= 500) {
      console.error(err);
    }
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Serve on PORT from env. In development default to 5001 so http://localhost:5001/ works.
  const port = parseInt(process.env.PORT || (process.env.NODE_ENV === "development" ? "5001" : "5000"), 10);
  const host = process.env.HOST || "127.0.0.1";
  httpServer.listen(
    {
      port,
      host,
    },
    () => {
      log(`serving on http://${host}:${port}`);
    },
  );
})();
