export type MovementType = "RECEIPT" | "OUTBOUND" | "TRANSFER" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
export type AdjustmentReason = "INVENTORY_COUNT" | "DAMAGE" | "LOSS" | "DATA_ERROR" | "OTHER";

export interface Movement {
  id: number;
  type: MovementType;
  itemId: number;
  sku: string;
  itemName: string;
  quantity: number;
  sourceLocationId: number | null;
  sourceLocationCode: string | null;
  destinationLocationId: number | null;
  destinationLocationCode: string | null;
  referenceType: string | null;
  referenceId: number | null;
  reason: AdjustmentReason | null;
  userName: string | null;
  notes: string | null;
  createdAt: string;
}
