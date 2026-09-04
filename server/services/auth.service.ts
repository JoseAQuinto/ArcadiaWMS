import { eq, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { hashPassword as _hashPassword, verifyPassword } from "../auth/password.js";
import { signToken } from "../auth/jwt.js";
import { ApiError } from "../utils/errors.js";

// Re-exported for the one-off scripts/hash-passwords.ts helper script.
export const hashPassword = _hashPassword;

function toPublicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    active: user.active,
  };
}

export async function login(identifier: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.username, identifier), eq(users.email, identifier)))
    .limit(1);

  if (!user || !user.active) {
    throw ApiError.unauthorized("Usuario o contraseña incorrectos.");
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    throw ApiError.unauthorized("Usuario o contraseña incorrectos.");
  }

  const token = signToken({ sub: user.id, username: user.username, role: user.role });
  return { token, user: toPublicUser(user) };
}

export async function getUserById(id: number) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user || !user.active) {
    throw ApiError.unauthorized("Sesión no válida o expirada. Vuelve a iniciar sesión.");
  }
  return toPublicUser(user);
}
