import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./jwt";

describe("jwt", () => {
  it("round-trips a payload through sign and verify", () => {
    const token = signToken({ sub: 1, username: "admin", role: "ADMIN" });
    const decoded = verifyToken(token);
    expect(decoded.sub).toBe(1);
    expect(decoded.username).toBe("admin");
    expect(decoded.role).toBe("ADMIN");
  });

  it("rejects a tampered token", () => {
    const token = signToken({ sub: 1, username: "admin", role: "ADMIN" });
    expect(() => verifyToken(`${token}tampered`)).toThrow();
  });
});
