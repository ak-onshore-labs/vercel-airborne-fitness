import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Never serve HTML for /api paths - return 404 JSON so API calls never get index.html
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API route not found" });
  });

  // fall through to index.html if the file doesn't exist (SPA client-side routing)
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
