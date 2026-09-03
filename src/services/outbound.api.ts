import { apiRequest } from "./api";
import type { OutboundOrder, OutboundOrderDetail, OutboundStatus } from "@/types/outbound";
import type { PaginatedResult } from "@/types/api";

export interface OutboundListParams {
  page?: number;
  pageSize?: number;
  status?: OutboundStatus;
  search?: string;
}

export function fetchOutboundOrders(params: OutboundListParams = {}): Promise<PaginatedResult<OutboundOrder>> {
  return apiRequest<PaginatedResult<OutboundOrder>>("/api/outbound-orders", { query: params });
}

export function fetchOutboundOrder(id: number): Promise<OutboundOrderDetail> {
  return apiRequest<OutboundOrderDetail>(`/api/outbound-orders/${id}`);
}

export interface OutboundLineInput {
  itemId: number;
  requestedQuantity: number;
}

export interface CreateOutboundOrderInput {
  customerName?: string | null;
  externalReference?: string | null;
  notes?: string | null;
  lines: OutboundLineInput[];
}

export function createOutboundOrder(input: CreateOutboundOrderInput): Promise<OutboundOrderDetail> {
  return apiRequest<OutboundOrderDetail>("/api/outbound-orders", { method: "POST", body: input });
}

export interface UpdateOutboundOrderInput {
  customerName?: string | null;
  externalReference?: string | null;
  notes?: string | null;
  status?: OutboundStatus;
}

export function updateOutboundOrder(id: number, input: UpdateOutboundOrderInput): Promise<OutboundOrderDetail> {
  return apiRequest<OutboundOrderDetail>(`/api/outbound-orders/${id}`, { method: "PUT", body: input });
}

export interface PickLineInput {
  lineId: number;
  quantity: number;
  locationId: number;
}

export function pickLine(orderId: number, input: PickLineInput): Promise<OutboundOrderDetail> {
  return apiRequest<OutboundOrderDetail>(`/api/outbound-orders/${orderId}/pick`, { method: "POST", body: input });
}
