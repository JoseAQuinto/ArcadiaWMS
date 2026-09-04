import { z } from "zod";
import { paginationSchema } from "./common.js";

export const movementTypeEnum = z.enum(["RECEIPT", "OUTBOUND", "TRANSFER", "ADJUSTMENT_IN", "ADJUSTMENT_OUT"]);

export const movementListQuerySchema = paginationSchema.extend({
  itemId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  type: movementTypeEnum.optional(),
  userId: z.coerce.number().int().positive().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  search: z.string().trim().optional(),
});

export type MovementListQuery = z.infer<typeof movementListQuerySchema>;
