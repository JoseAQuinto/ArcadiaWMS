import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, type Tx } from "../db/index.js";
import { users } from "../db/schema.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { ApiError } from "../utils/errors.js";
import { mapUniqueViolation } from "../utils/db-errors.js";
import { firstRow } from "../utils/db.js";
import type { CreateUserInput, UpdateUserInput, UserListQuery } from "../validators/users.js";

/** The password hash never leaves the service layer. */
function toPublicUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
  };
}

export type PublicUser = ReturnType<typeof toPublicUser>;

export async function listUsers(query: UserListQuery) {
  const conditions: SQL[] = [];
  if (query.role) conditions.push(eq(users.role, query.role));
  if (query.active !== undefined) conditions.push(eq(users.active, query.active));
  if (query.search) {
    const term = `%${query.search}%`;
    const condition = or(ilike(users.username, term), ilike(users.fullName, term), ilike(users.email, term));
    if (condition) conditions.push(condition);
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(users)
    .where(whereClause)
    .orderBy(asc(users.fullName))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  const { count } = firstRow(
    await db.select({ count: sql<number>`count(*)::int` }).from(users).where(whereClause)
  );

  return { rows: rows.map(toPublicUser), total: count, page: query.page, pageSize: query.pageSize };
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const passwordHash = await hashPassword(input.password);
  try {
    const rows = await db
      .insert(users)
      .values({
        username: input.username,
        email: input.email,
        fullName: input.fullName,
        role: input.role,
        passwordHash,
      })
      .returning();
    return toPublicUser(firstRow(rows));
  } catch (error) {
    mapUniqueViolation(error, `Ya existe un usuario con el usuario "${input.username}" o el email "${input.email}".`);
  }
}

/**
 * Locks every active admin row for the rest of the transaction. Two admins
 * demoting or deactivating each other at the same time would otherwise both
 * read "there is still another admin" and leave the system with none — after
 * which nobody could manage users, items, categories or locations again.
 */
async function activeAdminIdsForUpdate(tx: Tx): Promise<number[]> {
  const result = await tx.execute(
    sql`SELECT id FROM users WHERE role = 'ADMIN' AND active = true ORDER BY id FOR UPDATE`
  );
  return (result.rows as Array<{ id: number | string }>).map((row) => Number(row.id));
}

export async function updateUser(id: number, input: UpdateUserInput, actingUserId: number): Promise<PublicUser> {
  if (Object.keys(input).length === 0) {
    throw ApiError.badRequest("No has indicado ningún cambio.");
  }

  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(users).where(eq(users.id, id)).limit(1);
    if (!current) throw ApiError.notFound("Usuario no encontrado.");

    const losesAdmin =
      (current.role === "ADMIN" && current.active) &&
      (input.active === false || (input.role !== undefined && input.role !== "ADMIN"));

    if (id === actingUserId) {
      if (input.active === false) {
        throw ApiError.badRequest("No puedes desactivar tu propio usuario.");
      }
      if (input.role !== undefined && input.role !== current.role) {
        throw ApiError.badRequest("No puedes cambiar tu propio rol.");
      }
    }

    if (losesAdmin) {
      const adminIds = await activeAdminIdsForUpdate(tx);
      const remaining = adminIds.filter((adminId) => adminId !== id);
      if (remaining.length === 0) {
        throw ApiError.badRequest("Debe quedar al menos un administrador activo.");
      }
    }

    const changes: Partial<typeof users.$inferInsert> = {};
    if (input.email !== undefined) changes.email = input.email;
    if (input.fullName !== undefined) changes.fullName = input.fullName;
    if (input.role !== undefined) changes.role = input.role;
    if (input.active !== undefined) changes.active = input.active;
    if (input.password !== undefined) changes.passwordHash = await hashPassword(input.password);

    try {
      const rows = await tx.update(users).set(changes).where(eq(users.id, id)).returning();
      return toPublicUser(firstRow(rows));
    } catch (error) {
      mapUniqueViolation(error, `Ya existe un usuario con el email "${input.email ?? ""}".`);
    }
  });
}

/** Self-service password change: requires the current password, so a stolen session alone cannot lock the owner out. */
export async function changeOwnPassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.active) {
    throw ApiError.unauthorized("Sesión no válida o expirada. Vuelve a iniciar sesión.");
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    throw ApiError.badRequest("La contraseña actual no es correcta.");
  }
  if (currentPassword === newPassword) {
    throw ApiError.badRequest("La nueva contraseña debe ser distinta de la actual.");
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}
