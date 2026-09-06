import { z } from "zod";
import { paginationSchema, booleanQueryParam } from "./common.js";

export const userRoleEnum = z.enum(["ADMIN", "OPERATOR"]);

/**
 * Password policy for every place a password is set (creating a user, an admin
 * resetting one, a user changing their own). Kept deliberately modest — long
 * enough to survive an offline attack on a bcrypt hash, simple enough that a
 * warehouse operator can actually remember it.
 */
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(72, "La contraseña no puede superar 72 caracteres.")
  .regex(/[A-Za-z]/, "La contraseña debe incluir al menos una letra.")
  .regex(/[0-9]/, "La contraseña debe incluir al menos un número.");

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "El usuario debe tener al menos 3 caracteres.")
    .max(50, "El usuario no puede superar 50 caracteres.")
    .regex(/^[a-z0-9._-]+$/i, "El usuario solo puede contener letras, números, puntos y guiones."),
  email: z.string().trim().toLowerCase().email("El email no es válido.").max(255),
  fullName: z.string().trim().min(3, "El nombre completo debe tener al menos 3 caracteres.").max(150),
  role: userRoleEnum.default("OPERATOR"),
  password: passwordSchema,
});

export const updateUserSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("El email no es válido.").max(255).optional(),
    fullName: z.string().trim().min(3, "El nombre completo debe tener al menos 3 caracteres.").max(150).optional(),
    role: userRoleEnum.optional(),
    active: z.boolean().optional(),
    // Admin-side password reset. Omitted (not null) means "leave it as it is".
    password: passwordSchema.optional(),
  })
  // The username is the login identity and is referenced by the JWT, so it is
  // immutable once created: renaming it would silently invalidate live sessions.
  .strict();

export const userListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  role: userRoleEnum.optional(),
  active: booleanQueryParam,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Introduce tu contraseña actual."),
  newPassword: passwordSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
