import { z } from "zod";

export const idParamSchema = z.coerce.number().int().positive("Identificador no válido.");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Capped at 500 rather than 100: form pickers (item selects in receipts,
  // outbound orders, transfers, adjustments) intentionally request a large
  // page to populate a dropdown with the full active catalog in one call.
  pageSize: z.coerce.number().int().min(1).max(500).default(20),
});

export const booleanQueryParam = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === "true"));
