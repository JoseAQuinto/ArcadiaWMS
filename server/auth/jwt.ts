import jwt from "jsonwebtoken";
import { requireEnv } from "../utils/env.js";

export type UserRole = "ADMIN" | "OPERATOR";

export interface AuthTokenPayload {
  sub: number;
  username: string;
  role: UserRole;
}

const JWT_SECRET = requireEnv("JWT_SECRET");
// `||`, not `??`: an env var defined but left empty (easy to do in a hosting
// dashboard) arrives as "", which `??` would happily pass through to
// jwt.sign and make every login throw.
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN?.trim() || "8h";

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded === "string" || !("sub" in decoded)) {
    throw new Error("Invalid token payload");
  }
  return decoded as unknown as AuthTokenPayload;
}
