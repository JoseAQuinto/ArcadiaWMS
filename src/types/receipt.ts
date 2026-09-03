export type ReceiptStatus = "PENDING" | "RECEIVING" | "COMPLETED" | "CANCELLED";

export interface ReceiptLine {
  id: number;
  itemId: number;
  sku: string;
  itemName: string;
  unit: string;
  expectedQuantity: number;
  receivedQuantity: number;
}

export interface Receipt {
  id: number;
  code: string;
  supplierName: string | null;
  externalReference: string | null;
  status: ReceiptStatus;
  expectedDate: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptDetail extends Receipt {
  notes: string | null;
  lines: ReceiptLine[];
}
