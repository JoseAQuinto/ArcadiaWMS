import { describe, expect, it } from "vitest";
import { changePasswordSchema, createUserSchema, updateUserSchema } from "./users.js";

/**
 * These schemas are the only thing standing between the login table and a
 * password that cannot survive an offline attack, or an account created with a
 * role the caller invented.
 */
const validUser = {
  username: "operario2",
  email: "Operario2@ArcadiaWMS.com",
  fullName: "Operario Dos",
  password: "Almacen2025",
};

describe("createUserSchema", () => {
  it("accepts a valid user and defaults the role to OPERATOR", () => {
    const parsed = createUserSchema.parse(validUser);
    expect(parsed.role).toBe("OPERATOR");
  });

  it("normalises the email to lowercase so the unique index cannot be dodged by case", () => {
    expect(createUserSchema.parse(validUser).email).toBe("operario2@arcadiawms.com");
  });

  it.each([
    ["corta", "Abc123"],
    ["sin número", "SoloLetras"],
    ["sin letra", "12345678"],
  ])("rejects a password %s", (_label, password) => {
    expect(() => createUserSchema.parse({ ...validUser, password })).toThrow();
  });

  it.each(["ope rario", "operario!", ""])("rejects the username %j", (username) => {
    expect(() => createUserSchema.parse({ ...validUser, username })).toThrow();
  });

  it("rejects a role outside the enum", () => {
    expect(() => createUserSchema.parse({ ...validUser, role: "SUPERADMIN" })).toThrow();
  });
});

describe("updateUserSchema", () => {
  it("allows a partial update", () => {
    expect(updateUserSchema.parse({ active: false })).toEqual({ active: false });
  });

  it("refuses to rename the username, which the JWT identity depends on", () => {
    expect(() => updateUserSchema.parse({ username: "otro" })).toThrow();
  });

  it("applies the same password policy on an admin reset", () => {
    expect(() => updateUserSchema.parse({ password: "corta1" })).toThrow();
    expect(updateUserSchema.parse({ password: "Almacen2025" }).password).toBe("Almacen2025");
  });
});

describe("changePasswordSchema", () => {
  it("requires the current password", () => {
    expect(() => changePasswordSchema.parse({ currentPassword: "", newPassword: "Almacen2025" })).toThrow();
  });

  it("accepts a valid change", () => {
    expect(changePasswordSchema.parse({ currentPassword: "Admin123!", newPassword: "Almacen2025" })).toEqual({
      currentPassword: "Admin123!",
      newPassword: "Almacen2025",
    });
  });
});
