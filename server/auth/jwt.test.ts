import { describe, expect, it, vi } from "vitest";
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

  // A hosting dashboard makes it easy to declare an optional variable and leave
  // the value blank. That arrives as "", which `??` would pass straight through
  // to jwt.sign and make every single login throw.
  it.each(["", "   "])("treats a blank JWT_EXPIRES_IN (%j) as unset", async (blank) => {
    const original = process.env.JWT_EXPIRES_IN;
    process.env.JWT_EXPIRES_IN = blank;
    vi.resetModules();
    try {
      const fresh = await import("./jwt");
      const token = fresh.signToken({ sub: 1, username: "admin", role: "ADMIN" });
      const decoded = fresh.verifyToken(token) as unknown as { exp?: number };
      expect(typeof decoded.exp).toBe("number");
    } finally {
      if (original === undefined) delete process.env.JWT_EXPIRES_IN;
      else process.env.JWT_EXPIRES_IN = original;
      vi.resetModules();
    }
  });
});
