import { and, desc, eq, gt, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, type Database, type Tx } from "../db/index.js";
import { categories, items, locations, stock, warehouses, stockMovements } from "../db/schema.js";
import { ApiError } from "../utils/errors.js";
import { firstRow } from "../utils/db.js";
import type { StockListQuery } from "../validators/stock.js";

export interface NewMovementInput {
  type: "RECEIPT" | "OUTBOUND" | "TRANSFER" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
  itemId: number;
  quantity: number;
  sourceLocationId?: number | null;
  destinationLocationId?: number | null;
  referenceType?: "RECEIPT" | "OUTBOUND_ORDER" | "TRANSFER" | "ADJUSTMENT" | null;
  referenceId?: number | null;
  reason?: "INVENTORY_COUNT" | "DAMAGE" | "LOSS" | "DATA_ERROR" | "OTHER" | null;
  userId: number;
  notes?: string | null;
}

/** Appends one row to the immutable stock_movements ledger. Always called inside the same transaction as the matching stock change. */
export async function recordMovement(tx: Tx, data: NewMovementInput): Promise<void> {
  await tx.insert(stockMovements).values({
    type: data.type,
    itemId: data.itemId,
    quantity: data.quantity,
    sourceLocationId: data.sourceLocationId ?? null,
    destinationLocationId: data.destinationLocationId ?? null,
    referenceType: data.referenceType ?? null,
    referenceId: data.referenceId ?? null,
    reason: data.reason ?? null,
    userId: data.userId,
    notes: data.notes ?? null,
  });
}

type Executor = Database | Tx;

/**
 * Locks the stock row for (itemId, locationId) within the current
 * transaction so two concurrent operations can never both read the same
 * quantity and both decide there is enough stock. Returns 0 if no row
 * exists yet (the item has never been stocked at that location).
 */
export async function lockStockQuantity(tx: Tx, itemId: number, locationId: number): Promise<number> {
  const result = await tx.execute(
    sql`SELECT quantity FROM stock WHERE item_id = ${itemId} AND location_id = ${locationId} FOR UPDATE`
  );
  const rows = result.rows as Array<{ quantity: number | string }>;
  return rows[0] ? Number(rows[0].quantity) : 0;
}

/** Atomic upsert: creates the stock row if missing, otherwise adds to it. */
export async function increaseStock(tx: Tx, itemId: number, locationId: number, quantity: number): Promise<void> {
  await tx
    .insert(stock)
    .values({ itemId, locationId, quantity })
    .onConflictDoUpdate({
      target: [stock.itemId, stock.locationId],
      set: { quantity: sql`${stock.quantity} + ${quantity}`, updatedAt: new Date() },
    });
}

/**
 * Decreases stock after locking the row, guaranteeing it never goes
 * negative even under concurrent requests. `locationLabel` is the
 * human-readable location code used in the error message.
 */
export async function decreaseStock(
  tx: Tx,
  itemId: number,
  locationId: number,
  quantity: number,
  locationLabel: string
): Promise<void> {
  const current = await lockStockQuantity(tx, itemId, locationId);
  if (current < quantity) {
    throw ApiError.conflict(
      `No hay stock suficiente en la ubicación ${locationLabel}. Disponible: ${current}, solicitado: ${quantity}.`
    );
  }
  await tx
    .update(stock)
    .set({ quantity: sql`${stock.quantity} - ${quantity}`, updatedAt: new Date() })
    .where(and(eq(stock.itemId, itemId), eq(stock.locationId, locationId)));
}

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
  /** Stock of this item across every location. `minimumStock` is a per-item threshold, so "below minimum" must be judged against this, never against the quantity of a single location. */
  itemTotalStock: number;
  updatedAt: Date;
}

/** Total stock of the row's item across every location, as a correlated subquery. */
const itemTotalStockSql = sql<number>`(SELECT COALESCE(SUM(s2.quantity), 0)::int FROM stock s2 WHERE s2.item_id = ${stock.itemId})`;

function buildStockConditions(query: StockListQuery) {
  const conditions: SQL[] = [];
  if (query.itemId) conditions.push(eq(stock.itemId, query.itemId));
  if (query.locationId) conditions.push(eq(stock.locationId, query.locationId));
  if (query.warehouseId) conditions.push(eq(locations.warehouseId, query.warehouseId));
  if (query.categoryId) conditions.push(eq(items.categoryId, query.categoryId));
  if (query.onlyWithStock) conditions.push(gt(stock.quantity, 0));
  if (query.search) {
    const term = `%${query.search}%`;
    const searchCondition = or(ilike(items.sku, term), ilike(items.name, term), ilike(locations.code, term));
    if (searchCondition) conditions.push(searchCondition);
  }
  if (query.lowStock) {
    conditions.push(sql`${itemTotalStockSql} < ${items.minimumStock}`);
  }
  return conditions;
}

export async function listStock(query: StockListQuery) {
  const conditions = buildStockConditions(query);
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: stock.id,
      itemId: stock.itemId,
      sku: items.sku,
      itemName: items.name,
      categoryName: categories.name,
      locationId: stock.locationId,
      locationCode: locations.code,
      warehouseId: locations.warehouseId,
      warehouseCode: warehouses.code,
      quantity: stock.quantity,
      minimumStock: items.minimumStock,
      itemTotalStock: itemTotalStockSql,
      updatedAt: stock.updatedAt,
    })
    .from(stock)
    .innerJoin(items, eq(stock.itemId, items.id))
    .innerJoin(locations, eq(stock.locationId, locations.id))
    .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .where(whereClause)
    .orderBy(items.name, locations.code)
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stock)
    .innerJoin(items, eq(stock.itemId, items.id))
    .innerJoin(locations, eq(stock.locationId, locations.id))
    .where(whereClause);
  const { count } = firstRow(countRows);

  return { rows: rows as StockRow[], total: count, page: query.page, pageSize: query.pageSize };
}

export async function getStockByItem(itemId: number, executor: Executor = db) {
  return executor
    .select({
      id: stock.id,
      itemId: stock.itemId,
      locationId: stock.locationId,
      locationCode: locations.code,
      zone: locations.zone,
      blocked: locations.blocked,
      warehouseCode: warehouses.code,
      quantity: stock.quantity,
    })
    .from(stock)
    .innerJoin(locations, eq(stock.locationId, locations.id))
    .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
    .where(and(eq(stock.itemId, itemId), gt(stock.quantity, 0)))
    .orderBy(desc(stock.quantity));
}
