import { apiRequest } from "./api";
import type { ItemStockRow, StockRow } from "@/types/stock";
import type { PaginatedResult } from "@/types/api";

export interface StockListParams {
  page?: number;
  pageSize?: number;
  itemId?: number;
  locationId?: number;
  warehouseId?: number;
  categoryId?: number;
  search?: string;
  onlyWithStock?: boolean;
  lowStock?: boolean;
}

export function fetchStock(params: StockListParams = {}): Promise<PaginatedResult<StockRow>> {
  return apiRequest<PaginatedResult<StockRow>>("/api/stock", { query: params });
}

export function fetchStockByItem(itemId: number): Promise<ItemStockRow[]> {
  return apiRequest<ItemStockRow[]>(`/api/stock/item/${itemId}`);
}
