import { z } from "zod";
import { paginationSchema, booleanQueryParam } from "./common";

export const stockListQuerySchema = paginationSchema.extend({
  itemId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  warehouseId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  onlyWithStock: booleanQueryParam,
  lowStock: booleanQueryParam,
});

export type StockListQuery = z.infer<typeof stockListQuerySchema>;
