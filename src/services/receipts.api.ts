import { apiRequest } from "./api";
import type { Receipt, ReceiptDetail, ReceiptStatus } from "@/types/receipt";
import type { PaginatedResult } from "@/types/api";

export interface ReceiptListParams {
  page?: number;
  pageSize?: number;
  status?: ReceiptStatus;
  search?: string;
}

export function fetchReceipts(params: ReceiptListParams = {}): Promise<PaginatedResult<Receipt>> {
  return apiRequest<PaginatedResult<Receipt>>("/api/receipts", { query: params });
}

export function fetchReceipt(id: number): Promise<ReceiptDetail> {
  return apiRequest<ReceiptDetail>(`/api/receipts/${id}`);
}

export interface ReceiptLineInput {
  itemId: number;
  expectedQuantity: number;
}

export interface CreateReceiptInput {
  supplierName?: string | null;
  externalReference?: string | null;
  expectedDate?: string | null;
  notes?: string | null;
  lines: ReceiptLineInput[];
}

export function createReceipt(input: CreateReceiptInput): Promise<ReceiptDetail> {
  return apiRequest<ReceiptDetail>("/api/receipts", { method: "POST", body: input });
}

export interface UpdateReceiptInput {
  supplierName?: string | null;
  externalReference?: string | null;
  expectedDate?: string | null;
  notes?: string | null;
  status?: ReceiptStatus;
}

export function updateReceipt(id: number, input: UpdateReceiptInput): Promise<ReceiptDetail> {
  return apiRequest<ReceiptDetail>(`/api/receipts/${id}`, { method: "PUT", body: input });
}

export interface ReceiveLineInput {
  lineId: number;
  quantity: number;
  locationId: number;
}

export function receiveLine(receiptId: number, input: ReceiveLineInput): Promise<ReceiptDetail> {
  return apiRequest<ReceiptDetail>(`/api/receipts/${receiptId}/receive`, { method: "POST", body: input });
}
