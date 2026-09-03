import { z } from "zod";
import { paginationSchema, booleanQueryParam } from "./common";

export const createItemSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(2, "El SKU debe tener al menos 2 caracteres.")
    .max(50, "El SKU no puede superar 50 caracteres.")
    .regex(/^[A-Za-z0-9._-]+$/, "El SKU solo puede contener letras, números, puntos y guiones."),
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  unit: z.string().trim().min(1).max(20).default("UD"),
  minimumStock: z.coerce.number().int().min(0, "El stock mínimo no puede ser negativo.").default(0),
});

export const updateItemSchema = createItemSchema.partial().extend({
  active: z.boolean().optional(),
});

export const itemListQuerySchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  active: booleanQueryParam,
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ItemListQuery = z.infer<typeof itemListQuerySchema>;
