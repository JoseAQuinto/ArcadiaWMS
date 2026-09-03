import { apiRequest } from "./api";
import type { Warehouse } from "@/types/warehouse";

export function fetchWarehouses(): Promise<Warehouse[]> {
  return apiRequest<Warehouse[]>("/api/warehouses");
}
