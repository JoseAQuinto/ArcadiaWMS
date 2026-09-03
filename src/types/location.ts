export type LocationStatus = "AVAILABLE" | "PARTIAL" | "OCCUPIED" | "BLOCKED";

export interface Location {
  id: number;
  warehouseId: number;
  warehouseCode: string;
  code: string;
  zone: string;
  capacity: number | null;
  blocked: boolean;
  quantity: number;
  status: LocationStatus;
  occupancyPercent: number | null;
}

export interface LocationStockItem {
  itemId: number;
  sku: string;
  itemName: string;
  unit: string;
  quantity: number;
}

export interface LocationDetail extends Location {
  active: boolean;
  stockItems: LocationStockItem[];
}
