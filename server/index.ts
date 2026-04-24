import "dotenv/config";
import dns from "node:dns";
import { createApp } from "./app";

// Some cloud hosts have broken IPv6 egress; MSG91 and other APIs then fail only in production.
if (process.env.NODE_ENV === "production") {
  dns.setDefaultResultOrder("ipv4first");
}
import { connectDb } from "./db";
import { log } from "./lib/log";

export { log };

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

  const { httpServer } = await createApp({ frontend: "auto" });

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
