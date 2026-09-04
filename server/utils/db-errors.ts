import { ApiError } from "./errors.js";

/** Postgres error code for a UNIQUE constraint violation. */
const UNIQUE_VIOLATION = "23505";

/**
 * Drizzle wraps driver errors in a DrizzleQueryError and keeps the original
 * Postgres error (the one carrying `code`) in `cause`, so the code we are
 * looking for can sit several levels down. Walking the chain keeps this
 * working across Drizzle versions and across both drivers (Neon / node-postgres).
 */
function findPostgresErrorCode(error: unknown, depth = 0): string | undefined {
  if (depth > 5 || typeof error !== "object" || error === null) return undefined;
  const candidate = error as { code?: unknown; cause?: unknown };
  if (typeof candidate.code === "string") return candidate.code;
  return findPostgresErrorCode(candidate.cause, depth + 1);
}

function isUniqueViolation(error: unknown): boolean {
  return findPostgresErrorCode(error) === UNIQUE_VIOLATION;
}

/** Converts a UNIQUE constraint violation into a friendly 409, rethrows anything else unchanged. */
export function mapUniqueViolation(error: unknown, message: string): never {
  if (isUniqueViolation(error)) {
    throw ApiError.conflict(message);
  }
  throw error;
}
