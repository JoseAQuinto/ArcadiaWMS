import { z } from "zod";

export const createTransferSchema = z
  .object({
    itemId: z.coerce.number().int().positive(),
    sourceLocationId: z.coerce.number().int().positive("Selecciona la ubicación de origen."),
    destinationLocationId: z.coerce.number().int().positive("Selecciona la ubicación de destino."),
    quantity: z.coerce.number().int().positive("La cantidad debe ser mayor que 0."),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((data) => data.sourceLocationId !== data.destinationLocationId, {
    message: "La ubicación de origen y destino no pueden ser la misma.",
    path: ["destinationLocationId"],
  });

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
