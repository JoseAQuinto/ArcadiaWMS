import { eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { categories, items, locations, outboundOrders, receipts, stock, stockMovements } from "../db/schema.js";
import { firstRow } from "../utils/db.js";
import { computeLocationStatus } from "./locations.service.js";
import { listMovements } from "./movements.service.js";

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    days.push(date.toISOString().slice(0, 10));
  }
  return days;
}

export async function getDashboardSummary() {
  const { totalItems } = firstRow(
    await db
      .select({ totalItems: sql<number>`count(*)::int` })
      .from(items)
      .where(eq(items.active, true))
  );

  const { totalStock } = firstRow(
    await db.select({ totalStock: sql<number>`COALESCE(SUM(${stock.quantity}), 0)::int` }).from(stock)
  );

  const locationRows = await db
    .select({
      id: locations.id,
      blocked: locations.blocked,
      capacity: locations.capacity,
      quantity: sql<number>`COALESCE(SUM(${stock.quantity}), 0)::int`,
    })
    .from(locations)
    .leftJoin(stock, eq(stock.locationId, locations.id))
    .where(eq(locations.active, true))
    .groupBy(locations.id, locations.blocked, locations.capacity);

  const totalLocations = locationRows.length;
  const statuses = locationRows.map((row) =>
    computeLocationStatus({ blocked: row.blocked, quantity: row.quantity, capacity: row.capacity })
  );
  const availableLocations = statuses.filter((s) => s === "AVAILABLE").length;
  const occupiedLocations = statuses.filter((s) => s === "OCCUPIED" || s === "PARTIAL").length;
  const blockedLocations = statuses.filter((s) => s === "BLOCKED").length;
  const occupancyPercent = totalLocations ? Math.round((occupiedLocations / totalLocations) * 100) : 0;

  const { pendingReceipts } = firstRow(
    await db
      .select({ pendingReceipts: sql<number>`count(*)::int` })
      .from(receipts)
      .where(inArray(receipts.status, ["PENDING", "RECEIVING"]))
  );

  const { pendingOutbound } = firstRow(
    await db
      .select({ pendingOutbound: sql<number>`count(*)::int` })
      .from(outboundOrders)
      .where(inArray(outboundOrders.status, ["PENDING", "PICKING"]))
  );

  const { rows: recentMovements } = await listMovements({ page: 1, pageSize: 8 });

  const days = lastNDays(7);
  const movementCountsRaw = await db
    .select({
      day: sql<string>`to_char(${stockMovements.createdAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(stockMovements)
    .where(gte(stockMovements.createdAt, sql`now() - interval '7 days'`))
    .groupBy(sql`to_char(${stockMovements.createdAt}, 'YYYY-MM-DD')`);
  const countByDay = new Map(movementCountsRaw.map((row) => [row.day, row.count]));
  const movementsLast7Days = days.map((day) => ({ day, count: countByDay.get(day) ?? 0 }));

  const stockByCategoryRaw = await db
    .select({
      categoryName: sql<string>`COALESCE(${categories.name}, 'Sin categoría')`,
      totalQuantity: sql<number>`COALESCE(SUM(${stock.quantity}), 0)::int`,
    })
    .from(items)
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .leftJoin(stock, eq(stock.itemId, items.id))
    .groupBy(categories.name);
  const stockByCategory = stockByCategoryRaw
    .filter((row) => row.totalQuantity > 0)
    .sort((a, b) => b.totalQuantity - a.totalQuantity);

  return {
    totalItems,
    totalStock,
    totalLocations,
    availableLocations,
    occupiedLocations,
    blockedLocations,
    occupancyPercent,
    pendingReceipts,
    pendingOutbound,
    recentMovements,
    movementsLast7Days,
    stockByCategory,
  };
}
