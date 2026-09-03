export interface Item {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  unit: string;
  minimumStock: number;
  active: boolean;
  totalStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface ItemStockLocation {
  locationId: number;
  locationCode: string;
  warehouseCode: string;
  quantity: number;
}

export interface ItemDetail extends Omit<Item, "totalStock"> {
  totalStock: number;
  stockByLocation: ItemStockLocation[];
}
