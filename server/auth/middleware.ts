import type { VercelRequest } from "@vercel/node";
import { verifyToken, type AuthTokenPayload, type UserRole } from "./jwt";
import { ApiError } from "../utils/errors";

export function getAuth(req: VercelRequest): AuthTokenPayload | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

/** Every protected endpoint calls this first. There is no server-side session store: the JWT itself is the session, verified fresh on every request. */
export function requireAuth(req: VercelRequest): AuthTokenPayload {
  const auth = getAuth(req);
  if (!auth) {
    throw ApiError.unauthorized("Sesión no válida o expirada. Vuelve a iniciar sesión.");
  }
  return auth;
}

export function requireRole(auth: AuthTokenPayload, roles: UserRole[]): void {
  if (!roles.includes(auth.role)) {
    throw ApiError.forbidden();
  }
}
