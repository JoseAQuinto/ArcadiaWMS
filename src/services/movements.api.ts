import { apiRequest } from "./api";
import type { Movement, MovementType } from "@/types/movement";
import type { PaginatedResult } from "@/types/api";

export interface MovementListParams {
  page?: number;
  pageSize?: number;
  itemId?: number;
  locationId?: number;
  type?: MovementType;
  userId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function fetchMovements(params: MovementListParams = {}): Promise<PaginatedResult<Movement>> {
  return apiRequest<PaginatedResult<Movement>>("/api/movements", { query: params });
}

export interface CreateTransferInput {
  itemId: number;
  sourceLocationId: number;
  destinationLocationId: number;
  quantity: number;
  notes?: string | null;
}

export function createTransfer(input: CreateTransferInput): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/transfers", { method: "POST", body: input });
}

export type AdjustmentDirection = "INCREMENT" | "DECREMENT";
export type AdjustmentReason = "INVENTORY_COUNT" | "DAMAGE" | "LOSS" | "DATA_ERROR" | "OTHER";

export interface CreateAdjustmentInput {
  itemId: number;
  locationId: number;
  direction: AdjustmentDirection;
  quantity: number;
  reason: AdjustmentReason;
  notes?: string | null;
}

export function createAdjustment(input: CreateAdjustmentInput): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/adjustments", { method: "POST", body: input });
}
