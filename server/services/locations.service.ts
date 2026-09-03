import { and, eq, ilike, sql, type SQL } from "drizzle-orm";
import { db, type Database, type Tx } from "../db";
import { items, locations, stock, warehouses } from "../db/schema";
import { ApiError } from "../utils/errors";
import { mapUniqueViolation } from "../utils/db-errors";
import type { CreateLocationInput, LocationStatus, UpdateLocationInput } from "../validators/locations";
import type { LocationListQuery } from "../validators/locations";

type Executor = Database | Tx;

export function computeLocationStatus(params: {
  blocked: boolean;
  quantity: number;
  capacity: number | null;
}): LocationStatus {
  if (params.blocked) return "BLOCKED";
  if (params.quantity <= 0) return "AVAILABLE";
  if (params.capacity !== null && params.quantity >= params.capacity) return "OCCUPIED";
  return "PARTIAL";
}

export function computeOccupancyPercent(quantity: number, capacity: number | null): number | null {
  if (!capacity) return null;
  return Math.min(100, Math.round((quantity / capacity) * 100));
}

export async function listLocations(query: LocationListQuery) {
  const conditions: SQL[] = [eq(locations.active, true)];
  if (query.warehouseId) conditions.push(eq(locations.warehouseId, query.warehouseId));
  if (query.zone) conditions.push(eq(locations.zone, query.zone));
  if (query.search) conditions.push(ilike(locations.code, `%${query.search}%`));

  const stockTotals = db
    .select({
      locationId: stock.locationId,
      totalQuantity: sql<number>`sum(${stock.quantity})`.as("total_quantity"),
    })
    .from(stock)
    .groupBy(stock.locationId)
    .as("stock_totals");

  const rows = await db
    .select({
      id: locations.id,
      warehouseId: locations.warehouseId,
      warehouseCode: warehouses.code,
      code: locations.code,
      zone: locations.zone,
      capacity: locations.capacity,
      blocked: locations.blocked,
      quantity: sql<number>`COALESCE(${stockTotals.totalQuantity}, 0)::int`,
    })
    .from(locations)
    .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
    .leftJoin(stockTotals, eq(stockTotals.locationId, locations.id))
    .where(and(...conditions))
    .orderBy(locations.zone, locations.code);

  const mapped = rows.map((row) => ({
    ...row,
    status: computeLocationStatus({ blocked: row.blocked, quantity: row.quantity, capacity: row.capacity }),
    occupancyPercent: computeOccupancyPercent(row.quantity, row.capacity),
  }));

  return query.status ? mapped.filter((row) => row.status === query.status) : mapped;
}

export async function getLocationById(id: number) {
  const [location] = await db
    .select({
      id: locations.id,
      warehouseId: locations.warehouseId,
      warehouseCode: warehouses.code,
      code: locations.code,
      zone: locations.zone,
      capacity: locations.capacity,
      blocked: locations.blocked,
      active: locations.active,
    })
    .from(locations)
    .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
    .where(eq(locations.id, id))
    .limit(1);

  if (!location) throw ApiError.notFound("Ubicación no encontrada.");

  const stockRows = await db
    .select({
      itemId: stock.itemId,
      sku: items.sku,
      itemName: items.name,
      unit: items.unit,
      quantity: stock.quantity,
    })
    .from(stock)
    .innerJoin(items, eq(stock.itemId, items.id))
    .where(and(eq(stock.locationId, id), sql`${stock.quantity} > 0`))
    .orderBy(items.name);

  const quantity = stockRows.reduce((sum, row) => sum + row.quantity, 0);

  return {
    ...location,
    quantity,
    status: computeLocationStatus({ blocked: location.blocked, quantity, capacity: location.capacity }),
    occupancyPercent: computeOccupancyPercent(quantity, location.capacity),
    stockItems: stockRows,
  };
}

export async function createLocation(input: CreateLocationInput) {
  try {
    const [row] = await db
      .insert(locations)
      .values({
        warehouseId: input.warehouseId,
        code: input.code,
        zone: input.zone,
        capacity: input.capacity ?? null,
        blocked: input.blocked ?? false,
      })
      .returning();
    return row;
  } catch (error) {
    mapUniqueViolation(error, `Ya existe una ubicación con el código "${input.code}" en ese almacén.`);
  }
}

export async function updateLocation(id: number, input: UpdateLocationInput) {
  const [row] = await db.update(locations).set(input).where(eq(locations.id, id)).returning();
  if (!row) throw ApiError.notFound("Ubicación no encontrada.");
  return row;
}

export async function requireLocation(id: number, executor: Executor = db) {
  const [location] = await executor.select().from(locations).where(eq(locations.id, id)).limit(1);
  if (!location || !location.active) throw ApiError.notFound("Ubicación no encontrada.");
  return location;
}
