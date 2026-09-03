import { apiRequest } from "./api";
import type { Item, ItemDetail } from "@/types/item";
import type { PaginatedResult } from "@/types/api";

export interface ItemListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: number;
  active?: boolean;
}

export function fetchItems(params: ItemListParams = {}): Promise<PaginatedResult<Item>> {
  return apiRequest<PaginatedResult<Item>>("/api/items", { query: params });
}

export function fetchItem(id: number): Promise<ItemDetail> {
  return apiRequest<ItemDetail>(`/api/items/${id}`);
}

export interface ItemInput {
  sku: string;
  name: string;
  description?: string | null;
  categoryId?: number | null;
  unit: string;
  minimumStock: number;
}

export function createItem(input: ItemInput): Promise<Item> {
  return apiRequest<Item>("/api/items", { method: "POST", body: input });
}

export function updateItem(id: number, input: Partial<ItemInput> & { active?: boolean }): Promise<Item> {
  return apiRequest<Item>(`/api/items/${id}`, { method: "PUT", body: input });
}
