import { z } from "zod";
import { paginationSchema } from "./common";

export const receiptStatusEnum = z.enum(["PENDING", "RECEIVING", "COMPLETED", "CANCELLED"]);

export const receiptLineInputSchema = z.object({
  itemId: z.coerce.number().int().positive(),
  expectedQuantity: z.coerce.number().int().positive("La cantidad esperada debe ser mayor que 0."),
});

export const createReceiptSchema = z.object({
  supplierName: z.string().trim().max(200).optional().nullable(),
  externalReference: z.string().trim().max(100).optional().nullable(),
  expectedDate: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  lines: z.array(receiptLineInputSchema).min(1, "La recepción debe tener al menos una línea."),
});

export const updateReceiptSchema = z.object({
  supplierName: z.string().trim().max(200).optional().nullable(),
  externalReference: z.string().trim().max(100).optional().nullable(),
  expectedDate: z.string().trim().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  status: receiptStatusEnum.optional(),
});

export const receiveLineSchema = z.object({
  lineId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive("La cantidad debe ser mayor que 0."),
  locationId: z.coerce.number().int().positive("Selecciona una ubicación destino."),
});

export const receiptListQuerySchema = paginationSchema.extend({
  status: receiptStatusEnum.optional(),
  search: z.string().trim().optional(),
});

export type CreateReceiptInput = z.infer<typeof createReceiptSchema>;
export type UpdateReceiptInput = z.infer<typeof updateReceiptSchema>;
export type ReceiveLineInput = z.infer<typeof receiveLineSchema>;
export type ReceiptListQuery = z.infer<typeof receiptListQuerySchema>;
