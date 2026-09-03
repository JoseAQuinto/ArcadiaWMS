export interface StockRow {
  id: number;
  itemId: number;
  sku: string;
  itemName: string;
  categoryName: string | null;
  locationId: number;
  locationCode: string;
  warehouseId: number;
  warehouseCode: string;
  quantity: number;
  minimumStock: number;
  updatedAt: string;
}

export interface ItemStockRow {
  id: number;
  itemId: number;
  locationId: number;
  locationCode: string;
  zone: string;
  blocked: boolean;
  warehouseCode: string;
  quantity: number;
}
