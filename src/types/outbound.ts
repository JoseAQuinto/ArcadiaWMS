export type OutboundStatus = "PENDING" | "PICKING" | "COMPLETED" | "CANCELLED";

export interface OutboundOrderLine {
  id: number;
  itemId: number;
  sku: string;
  itemName: string;
  unit: string;
  requestedQuantity: number;
  pickedQuantity: number;
}

export interface OutboundOrder {
  id: number;
  code: string;
  customerName: string | null;
  externalReference: string | null;
  status: OutboundStatus;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutboundOrderDetail extends OutboundOrder {
  notes: string | null;
  lines: OutboundOrderLine[];
}
