import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Introduce tu usuario o email."),
  password: z.string().min(1, "Introduce tu contraseña."),
});

export type LoginInput = z.infer<typeof loginSchema>;
