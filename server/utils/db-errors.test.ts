import { describe, expect, it } from "vitest";
import { mapUniqueViolation } from "./db-errors";
import { ApiError } from "./errors";

/**
 * Drizzle changed the shape of driver errors between versions (0.44+ wraps them
 * in a DrizzleQueryError and moves the Postgres error to `cause`). These tests
 * pin the behaviour so a future upgrade can't silently turn a friendly 409 into
 * a 500 again.
 */
describe("mapUniqueViolation", () => {
  it("maps a bare Postgres unique violation to a 409", () => {
    expect(() => mapUniqueViolation({ code: "23505" }, "Ya existe.")).toThrowError(ApiError);
    try {
      mapUniqueViolation({ code: "23505" }, "Ya existe.");
    } catch (error) {
      expect((error as ApiError).status).toBe(409);
      expect((error as ApiError).message).toBe("Ya existe.");
    }
  });

  it("maps a violation wrapped by Drizzle in `cause` to a 409", () => {
    const wrapped = Object.assign(new Error("Failed query"), { cause: { code: "23505" } });
    try {
      mapUniqueViolation(wrapped, "Ya existe.");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(409);
    }
  });

  it("rethrows any other database error untouched", () => {
    const other = { code: "23503" };
    expect(() => mapUniqueViolation(other, "Ya existe.")).toThrow();
    try {
      mapUniqueViolation(other, "Ya existe.");
    } catch (error) {
      expect(error).toBe(other);
    }
  });

  it("rethrows a plain error with no Postgres code", () => {
    const boom = new Error("boom");
    expect(() => mapUniqueViolation(boom, "Ya existe.")).toThrowError(boom);
  });
});
