import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "./lib/jwt.js";
import { storage } from "./storage.js";

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

/** Wraps async route handlers to catch errors and pass to Express error handler */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/** Require valid JWT in Authorization: Bearer <token>. Sets req.auth = { userId, mobile }. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ message: "Authorization required" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
  req.auth = payload;
  next();
}

/** Admin-only: require valid JWT and user.userRole in ["ADMIN","STAFF"]. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ message: "Authorization required" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
  const user = await storage.getUser(payload.userId);
  if (!user || (user.userRole !== "ADMIN" && user.userRole !== "STAFF")) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  req.auth = payload;
  next();
}

/** Strict admin-only: require valid JWT and user.userRole === "ADMIN". */
export async function requireAdminOnly(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ message: "Authorization required" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
  const user = await storage.getUser(payload.userId);
  if (!user || user.userRole !== "ADMIN") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  req.auth = payload;
  next();
}
