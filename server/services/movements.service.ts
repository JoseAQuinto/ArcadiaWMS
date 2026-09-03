import { and, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "../db";
import { items, locations, stockMovements, users } from "../db/schema";
import { ApiError } from "../utils/errors";
import { firstRow } from "../utils/db";
import { decreaseStock, increaseStock, recordMovement } from "./stock.service";
import { requireActiveItem } from "./items.service";
import { requireLocation } from "./locations.service";
import type { CreateTransferInput } from "../validators/transfers";
import type { CreateAdjustmentInput } from "../validators/adjustments";
import type { MovementListQuery } from "../validators/movements";

export async function createTransfer(input: CreateTransferInput, userId: number) {
  return db.transaction(async (tx) => {
    const item = await requireActiveItem(input.itemId, tx);
    const source = await requireLocation(input.sourceLocationId, tx);
    const destination = await requireLocation(input.destinationLocationId, tx);

    if (destination.blocked) {
      throw ApiError.badRequest(`La ubicación de destino ${destination.code} está bloqueada.`);
    }

    await decreaseStock(tx, item.id, source.id, input.quantity, source.code);
    await increaseStock(tx, item.id, destination.id, input.quantity);

    await recordMovement(tx, {
      type: "TRANSFER",
      itemId: item.id,
      quantity: input.quantity,
      sourceLocationId: source.id,
      destinationLocationId: destination.id,
      referenceType: "TRANSFER",
      userId,
      notes: input.notes ?? null,
    });
  });
}

export async function createAdjustment(input: CreateAdjustmentInput, userId: number) {
  return db.transaction(async (tx) => {
    const item = await requireActiveItem(input.itemId, tx);
    const location = await requireLocation(input.locationId, tx);

    if (input.direction === "INCREMENT") {
      if (location.blocked) {
        throw ApiError.badRequest(`La ubicación ${location.code} está bloqueada y no admite entradas.`);
      }
      await increaseStock(tx, item.id, location.id, input.quantity);
      await recordMovement(tx, {
        type: "ADJUSTMENT_IN",
        itemId: item.id,
        quantity: input.quantity,
        destinationLocationId: location.id,
        referenceType: "ADJUSTMENT",
        reason: input.reason,
        userId,
        notes: input.notes ?? null,
      });
    } else {
      await decreaseStock(tx, item.id, location.id, input.quantity, location.code);
      await recordMovement(tx, {
        type: "ADJUSTMENT_OUT",
        itemId: item.id,
        quantity: input.quantity,
        sourceLocationId: location.id,
        referenceType: "ADJUSTMENT",
        reason: input.reason,
        userId,
        notes: input.notes ?? null,
      });
    }
  });
}

export async function listMovements(query: MovementListQuery) {
  const conditions: SQL[] = [];
  if (query.itemId) conditions.push(eq(stockMovements.itemId, query.itemId));
  if (query.type) conditions.push(eq(stockMovements.type, query.type));
  if (query.userId) conditions.push(eq(stockMovements.userId, query.userId));
  if (query.locationId) {
    const condition = or(
      eq(stockMovements.sourceLocationId, query.locationId),
      eq(stockMovements.destinationLocationId, query.locationId)
    );
    if (condition) conditions.push(condition);
  }
  if (query.dateFrom) conditions.push(gte(stockMovements.createdAt, new Date(query.dateFrom)));
  if (query.dateTo) conditions.push(lte(stockMovements.createdAt, new Date(`${query.dateTo}T23:59:59.999Z`)));
  if (query.search) {
    const term = `%${query.search}%`;
    const condition = or(ilike(items.sku, term), ilike(items.name, term));
    if (condition) conditions.push(condition);
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: stockMovements.id,
      type: stockMovements.type,
      itemId: stockMovements.itemId,
      sku: items.sku,
      itemName: items.name,
      quantity: stockMovements.quantity,
      sourceLocationId: stockMovements.sourceLocationId,
      destinationLocationId: stockMovements.destinationLocationId,
      referenceType: stockMovements.referenceType,
      referenceId: stockMovements.referenceId,
      reason: stockMovements.reason,
      userName: users.fullName,
      notes: stockMovements.notes,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .innerJoin(items, eq(stockMovements.itemId, items.id))
    .leftJoin(users, eq(stockMovements.userId, users.id))
    .where(whereClause)
    .orderBy(desc(stockMovements.createdAt))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  const locationIds = new Set<number>();
  rows.forEach((row) => {
    if (row.sourceLocationId) locationIds.add(row.sourceLocationId);
    if (row.destinationLocationId) locationIds.add(row.destinationLocationId);
  });

  const locationCodes = locationIds.size
    ? await db
        .select({ id: locations.id, code: locations.code })
        .from(locations)
        .where(inArray(locations.id, Array.from(locationIds)))
    : [];
  const codeById = new Map(locationCodes.map((l) => [l.id, l.code]));

  const enrichedRows = rows.map((row) => ({
    ...row,
    sourceLocationCode: row.sourceLocationId ? codeById.get(row.sourceLocationId) ?? null : null,
    destinationLocationCode: row.destinationLocationId ? codeById.get(row.destinationLocationId) ?? null : null,
  }));

  const { count } = firstRow(
    await db
      .select({ count: sql<number>`count(*)::int` })
      .from(stockMovements)
      .innerJoin(items, eq(stockMovements.itemId, items.id))
      .where(whereClause)
  );

  return { rows: enrichedRows, total: count, page: query.page, pageSize: query.pageSize };
}
