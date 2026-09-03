import type { Movement } from "./movement";

export interface DashboardSummary {
  totalItems: number;
  totalStock: number;
  totalLocations: number;
  availableLocations: number;
  occupiedLocations: number;
  blockedLocations: number;
  occupancyPercent: number;
  pendingReceipts: number;
  pendingOutbound: number;
  recentMovements: Movement[];
  movementsLast7Days: { day: string; count: number }[];
  stockByCategory: { categoryName: string; totalQuantity: number }[];
}
