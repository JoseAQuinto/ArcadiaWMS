import { z } from "zod";

export const adjustmentReasonEnum = z.enum(["INVENTORY_COUNT", "DAMAGE", "LOSS", "DATA_ERROR", "OTHER"]);
export const adjustmentDirectionEnum = z.enum(["INCREMENT", "DECREMENT"]);

export const createAdjustmentSchema = z.object({
  itemId: z.coerce.number().int().positive(),
  locationId: z.coerce.number().int().positive(),
  direction: adjustmentDirectionEnum,
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor que 0."),
  reason: adjustmentReasonEnum,
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
