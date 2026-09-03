import { and, eq, gt, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, type Database, type Tx } from "../db";
import { categories, items, locations, stock, warehouses } from "../db/schema";
import { ApiError } from "../utils/errors";
import { mapUniqueViolation } from "../utils/db-errors";
import { firstRow } from "../utils/db";
import type { CreateItemInput, ItemListQuery, UpdateItemInput } from "../validators/items";

type Executor = Database | Tx;

function buildConditions(query: ItemListQuery) {
  const conditions: SQL[] = [];
  if (query.categoryId) conditions.push(eq(items.categoryId, query.categoryId));
  if (query.active !== undefined) conditions.push(eq(items.active, query.active));
  if (query.search) {
    const term = `%${query.search}%`;
    const searchCondition = or(ilike(items.sku, term), ilike(items.name, term));
    if (searchCondition) conditions.push(searchCondition);
  }
  return conditions;
}

export async function listItems(query: ItemListQuery) {
  const conditions = buildConditions(query);
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const stockTotals = db
    .select({ itemId: stock.itemId, totalStock: sql<number>`sum(${stock.quantity})`.as("total_stock") })
    .from(stock)
    .groupBy(stock.itemId)
    .as("stock_totals");

  const rows = await db
    .select({
      id: items.id,
      sku: items.sku,
      name: items.name,
      description: items.description,
      categoryId: items.categoryId,
      categoryName: categories.name,
      unit: items.unit,
      minimumStock: items.minimumStock,
      active: items.active,
      totalStock: sql<number>`COALESCE(${stockTotals.totalStock}, 0)::int`,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
    })
    .from(items)
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .leftJoin(stockTotals, eq(stockTotals.itemId, items.id))
    .where(whereClause)
    .orderBy(items.name)
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  const countRows = await db.select({ count: sql<number>`count(*)::int` }).from(items).where(whereClause);
  const { count } = firstRow(countRows);

  return { rows, total: count, page: query.page, pageSize: query.pageSize };
}

export async function getItemById(id: number) {
  const [item] = await db
    .select({
      id: items.id,
      sku: items.sku,
      name: items.name,
      description: items.description,
      categoryId: items.categoryId,
      categoryName: categories.name,
      unit: items.unit,
      minimumStock: items.minimumStock,
      active: items.active,
      createdAt: items.createdAt,
      updatedAt: items.updatedAt,
    })
    .from(items)
    .leftJoin(categories, eq(items.categoryId, categories.id))
    .where(eq(items.id, id))
    .limit(1);

  if (!item) throw ApiError.notFound("Artículo no encontrado.");

  const stockByLocation = await db
    .select({
      locationId: stock.locationId,
      locationCode: locations.code,
      warehouseCode: warehouses.code,
      quantity: stock.quantity,
    })
    .from(stock)
    .innerJoin(locations, eq(stock.locationId, locations.id))
    .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
    .where(and(eq(stock.itemId, id), gt(stock.quantity, 0)))
    .orderBy(locations.code);

  const totalStock = stockByLocation.reduce((sum, row) => sum + row.quantity, 0);

  return { ...item, totalStock, stockByLocation };
}

export async function createItem(input: CreateItemInput) {
  try {
    const [row] = await db
      .insert(items)
      .values({
        sku: input.sku,
        name: input.name,
        description: input.description ?? null,
        categoryId: input.categoryId ?? null,
        unit: input.unit,
        minimumStock: input.minimumStock,
      })
      .returning();
    return row;
  } catch (error) {
    mapUniqueViolation(error, `Ya existe un artículo con el SKU "${input.sku}".`);
  }
}

export async function updateItem(id: number, input: UpdateItemInput) {
  try {
    const [row] = await db
      .update(items)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();
    if (!row) throw ApiError.notFound("Artículo no encontrado.");
    return row;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    mapUniqueViolation(error, `Ya existe un artículo con el SKU "${input.sku ?? ""}".`);
  }
}

export async function requireActiveItem(id: number, executor: Executor = db) {
  const [item] = await executor.select().from(items).where(eq(items.id, id)).limit(1);
  if (!item) throw ApiError.notFound("Artículo no encontrado.");
  if (!item.active) throw ApiError.badRequest(`El artículo ${item.sku} está inactivo y no admite operaciones.`);
  return item;
}
