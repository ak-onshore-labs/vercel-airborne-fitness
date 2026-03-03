import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "airborne-fitness-secret-change-in-production";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "300d";

export interface JwtPayload {
  userId: string;
  mobile: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
