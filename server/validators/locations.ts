import { z } from "zod";

export const locationStatusEnum = z.enum(["AVAILABLE", "PARTIAL", "OCCUPIED", "BLOCKED"]);

export const createLocationSchema = z.object({
  warehouseId: z.coerce.number().int().positive(),
  code: z.string().trim().min(1, "El código es obligatorio.").max(30),
  zone: z.string().trim().min(1, "La zona es obligatoria.").max(20),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  blocked: z.boolean().optional().default(false),
});

export const updateLocationSchema = z.object({
  zone: z.string().trim().min(1).max(20).optional(),
  capacity: z.coerce.number().int().positive().optional().nullable(),
  blocked: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const locationListQuerySchema = z.object({
  warehouseId: z.coerce.number().int().positive().optional(),
  zone: z.string().trim().optional(),
  status: locationStatusEnum.optional(),
  search: z.string().trim().optional(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type LocationStatus = z.infer<typeof locationStatusEnum>;
export type LocationListQuery = z.infer<typeof locationListQuerySchema>;
