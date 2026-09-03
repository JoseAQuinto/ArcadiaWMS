import { z } from "zod";
import { paginationSchema } from "./common";

export const outboundStatusEnum = z.enum(["PENDING", "PICKING", "COMPLETED", "CANCELLED"]);

export const outboundLineInputSchema = z.object({
  itemId: z.coerce.number().int().positive(),
  requestedQuantity: z.coerce.number().int().positive("La cantidad solicitada debe ser mayor que 0."),
});

export const createOutboundOrderSchema = z.object({
  customerName: z.string().trim().max(200).optional().nullable(),
  externalReference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  lines: z.array(outboundLineInputSchema).min(1, "El pedido debe tener al menos una línea."),
});

export const updateOutboundOrderSchema = z.object({
  customerName: z.string().trim().max(200).optional().nullable(),
  externalReference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: outboundStatusEnum.optional(),
});

export const pickLineSchema = z.object({
  lineId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor que 0."),
  locationId: z.coerce.number().int().positive("Selecciona una ubicación de origen."),
});

export const outboundListQuerySchema = paginationSchema.extend({
  status: outboundStatusEnum.optional(),
  search: z.string().trim().optional(),
});

export type CreateOutboundOrderInput = z.infer<typeof createOutboundOrderSchema>;
export type UpdateOutboundOrderInput = z.infer<typeof updateOutboundOrderSchema>;
export type PickLineInput = z.infer<typeof pickLineSchema>;
export type OutboundListQuery = z.infer<typeof outboundListQuerySchema>;
