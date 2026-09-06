import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withHandler, requireMethod, flattenQuery } from "../../utils/http.js";
import { requireAuth } from "../../auth/middleware.js";
import { movementListQuerySchema } from "../../validators/movements.js";
import { exportMovements } from "../../services/movements.service.js";
import { csvFilename, toCsv } from "../../utils/csv.js";

const TYPE_LABELS: Record<string, string> = {
  RECEIPT: "Entrada",
  OUTBOUND: "Salida",
  TRANSFER: "Movimiento interno",
  ADJUSTMENT_IN: "Regularización (+)",
  ADJUSTMENT_OUT: "Regularización (−)",
};

const REASON_LABELS: Record<string, string> = {
  INVENTORY_COUNT: "Recuento de inventario",
  DAMAGE: "Daño",
  LOSS: "Pérdida",
  DATA_ERROR: "Error de datos",
  OTHER: "Otro",
};

const REFERENCE_LABELS: Record<string, string> = {
  RECEIPT: "Recepción",
  OUTBOUND_ORDER: "Salida",
  TRANSFER: "Movimiento interno",
  ADJUSTMENT: "Regularización",
};

const HEADERS = [
  "Fecha",
  "Tipo",
  "SKU",
  "Artículo",
  "Cantidad",
  "Ubicación origen",
  "Ubicación destino",
  "Referencia",
  "Motivo",
  "Usuario",
  "Notas",
];

/**
 * The history screen exports what it is showing, so this endpoint takes exactly
 * the same filters as GET /api/movements. It answers with a CSV file instead of
 * the usual JSON envelope — the only endpoint in the API that does.
 */
export default withHandler(async (req: VercelRequest, res: VercelResponse) => {
  requireAuth(req);
  requireMethod(req, "GET");

  const query = movementListQuerySchema.parse(flattenQuery(req.query));
  const movements = await exportMovements(query);

  const csv = toCsv(
    HEADERS,
    movements.map((movement) => [
      movement.createdAt,
      TYPE_LABELS[movement.type] ?? movement.type,
      movement.sku,
      movement.itemName,
      movement.quantity,
      movement.sourceLocationCode,
      movement.destinationLocationCode,
      movement.referenceType
        ? `${REFERENCE_LABELS[movement.referenceType] ?? movement.referenceType}${movement.referenceId ? ` #${movement.referenceId}` : ""}`
        : null,
      movement.reason ? REASON_LABELS[movement.reason] ?? movement.reason : null,
      movement.userName,
      movement.notes,
    ])
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${csvFilename("movimientos")}"`);
  res.status(200).send(csv);
});
