import type { Request, Response, NextFunction } from "express";

/** Wraps async route handlers to catch errors and pass to Express error handler */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const ADMIN_PHONES = (process.env.ADMIN_ALLOWLIST_PHONES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Admin-only: require X-Admin-Phone header to be in ADMIN_ALLOWLIST_PHONES (comma-separated). */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const phone = (req.headers["x-admin-phone"] as string)?.trim();
  if (!phone) {
    res.status(401).json({ message: "Missing X-Admin-Phone header" });
    return;
  }
  if (ADMIN_PHONES.length === 0 || !ADMIN_PHONES.includes(phone)) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  next();
}
