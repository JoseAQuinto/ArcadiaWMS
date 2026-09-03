import { ApiError } from "./errors";

/** Postgres error code for a UNIQUE constraint violation. */
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === UNIQUE_VIOLATION;
}

/** Converts a UNIQUE constraint violation into a friendly 409, rethrows anything else unchanged. */
export function mapUniqueViolation(error: unknown, message: string): never {
  if (isUniqueViolation(error)) {
    throw ApiError.conflict(message);
  }
  throw error;
}
