import { Badge, type BadgeTone } from "@/components/ui/Badge";
import type { ReceiptStatus } from "@/types/receipt";
import type { OutboundStatus } from "@/types/outbound";
import type { LocationStatus } from "@/types/location";
import type { MovementType, AdjustmentReason } from "@/types/movement";

const RECEIPT_STATUS: Record<ReceiptStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Pendiente", tone: "slate" },
  RECEIVING: { label: "Recibiendo", tone: "amber" },
  COMPLETED: { label: "Completada", tone: "emerald" },
  CANCELLED: { label: "Cancelada", tone: "red" },
};

export function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) {
  const { label, tone } = RECEIPT_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const OUTBOUND_STATUS: Record<OutboundStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Pendiente", tone: "slate" },
  PICKING: { label: "Preparando", tone: "amber" },
  COMPLETED: { label: "Completado", tone: "emerald" },
  CANCELLED: { label: "Cancelado", tone: "red" },
};

export function OutboundStatusBadge({ status }: { status: OutboundStatus }) {
  const { label, tone } = OUTBOUND_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const LOCATION_STATUS: Record<LocationStatus, { label: string; tone: BadgeTone }> = {
  AVAILABLE: { label: "Libre", tone: "emerald" },
  PARTIAL: { label: "Parcial", tone: "amber" },
  OCCUPIED: { label: "Ocupada", tone: "blue" },
  BLOCKED: { label: "Bloqueada", tone: "red" },
};

export function LocationStatusBadge({ status }: { status: LocationStatus }) {
  const { label, tone } = LOCATION_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

const MOVEMENT_TYPE: Record<MovementType, { label: string; tone: BadgeTone }> = {
  RECEIPT: { label: "Entrada", tone: "emerald" },
  OUTBOUND: { label: "Salida", tone: "blue" },
  TRANSFER: { label: "Transferencia", tone: "violet" },
  ADJUSTMENT_IN: { label: "Ajuste (+)", tone: "amber" },
  ADJUSTMENT_OUT: { label: "Ajuste (-)", tone: "red" },
};

export function MovementTypeBadge({ type }: { type: MovementType }) {
  const { label, tone } = MOVEMENT_TYPE[type];
  return <Badge tone={tone}>{label}</Badge>;
}

export const ADJUSTMENT_REASON_LABELS: Record<AdjustmentReason, string> = {
  INVENTORY_COUNT: "Recuento de inventario",
  DAMAGE: "Mercancía dañada",
  LOSS: "Pérdida",
  DATA_ERROR: "Error de datos",
  OTHER: "Otro motivo",
};
