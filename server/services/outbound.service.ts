import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, type Database, type Tx } from "../db/index.js";
import { items, outboundOrderLines, outboundOrders, users } from "../db/schema.js";
import { ApiError } from "../utils/errors.js";
import { firstRow } from "../utils/db.js";
import { nextOutboundCode } from "../utils/codes.js";
import { decreaseStock, recordMovement } from "./stock.service.js";
import { requireLocation } from "./locations.service.js";
import type {
  CreateOutboundOrderInput,
  OutboundListQuery,
  PickLineInput,
  UpdateOutboundOrderInput,
} from "../validators/outbound.js";

type Executor = Database | Tx;

async function withLines(executor: Executor, orderId: number) {
  return executor
    .select({
      id: outboundOrderLines.id,
      itemId: outboundOrderLines.itemId,
      sku: items.sku,
      itemName: items.name,
      unit: items.unit,
      requestedQuantity: outboundOrderLines.requestedQuantity,
      pickedQuantity: outboundOrderLines.pickedQuantity,
    })
    .from(outboundOrderLines)
    .innerJoin(items, eq(outboundOrderLines.itemId, items.id))
    .where(eq(outboundOrderLines.outboundOrderId, orderId))
    .orderBy(outboundOrderLines.id);
}

export async function listOutboundOrders(query: OutboundListQuery) {
  const conditions: SQL[] = [];
  if (query.status) conditions.push(eq(outboundOrders.status, query.status));
  if (query.search) {
    const term = `%${query.search}%`;
    const condition = or(ilike(outboundOrders.code, term), ilike(outboundOrders.customerName, term));
    if (condition) conditions.push(condition);
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: outboundOrders.id,
      code: outboundOrders.code,
      customerName: outboundOrders.customerName,
      externalReference: outboundOrders.externalReference,
      status: outboundOrders.status,
      createdByName: users.fullName,
      createdAt: outboundOrders.createdAt,
      updatedAt: outboundOrders.updatedAt,
    })
    .from(outboundOrders)
    .leftJoin(users, eq(outboundOrders.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(outboundOrders.createdAt))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  const { count } = firstRow(
    await db.select({ count: sql<number>`count(*)::int` }).from(outboundOrders).where(whereClause)
  );

  return { rows, total: count, page: query.page, pageSize: query.pageSize };
}

export async function getOutboundOrderById(id: number, executor: Executor = db) {
  const [order] = await executor
    .select({
      id: outboundOrders.id,
      code: outboundOrders.code,
      customerName: outboundOrders.customerName,
      externalReference: outboundOrders.externalReference,
      status: outboundOrders.status,
      notes: outboundOrders.notes,
      createdByName: users.fullName,
      createdAt: outboundOrders.createdAt,
      updatedAt: outboundOrders.updatedAt,
    })
    .from(outboundOrders)
    .leftJoin(users, eq(outboundOrders.createdBy, users.id))
    .where(eq(outboundOrders.id, id))
    .limit(1);

  if (!order) throw ApiError.notFound("Pedido de salida no encontrado.");

  const lines = await withLines(executor, id);
  return { ...order, lines };
}

export async function createOutboundOrder(input: CreateOutboundOrderInput, userId: number) {
  return db.transaction(async (tx) => {
    const code = await nextOutboundCode(tx);
    const order = firstRow(
      await tx
        .insert(outboundOrders)
        .values({
          code,
          customerName: input.customerName ?? null,
          externalReference: input.externalReference ?? null,
          notes: input.notes ?? null,
          createdBy: userId,
          status: "PENDING",
        })
        .returning()
    );

    await tx.insert(outboundOrderLines).values(
      input.lines.map((line) => ({
        outboundOrderId: order.id,
        itemId: line.itemId,
        requestedQuantity: line.requestedQuantity,
      }))
    );

    return getOutboundOrderById(order.id, tx);
  });
}

export async function updateOutboundOrder(id: number, input: UpdateOutboundOrderInput) {
  // PENDING/PICKING/COMPLETED are derived from the picked quantities on the
  // lines, so the only status a client may set by hand is CANCELLED.
  if (input.status && input.status !== "CANCELLED") {
    throw ApiError.badRequest("El estado del pedido se calcula automáticamente a partir de sus líneas.");
  }

  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(outboundOrders).where(eq(outboundOrders.id, id)).limit(1).for("update");
    if (!current) throw ApiError.notFound("Pedido de salida no encontrado.");
    if (current.status === "COMPLETED" || current.status === "CANCELLED") {
      throw ApiError.badRequest("Este pedido ya está cerrado y no admite cambios.");
    }

    await tx
      .update(outboundOrders)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(outboundOrders.id, id));

    return getOutboundOrderById(id, tx);
  });
}

export async function pickLine(orderId: number, input: PickLineInput, userId: number) {
  return db.transaction(async (tx) => {
    // FOR UPDATE serialises every concurrent operation on the same order.
    // Without it two requests fired at once (a double-clicked button, a retried
    // POST) both read the same pickedQuantity, both remove stock, and the order
    // ends up counting only one of them — stock silently disappears.
    const [order] = await tx.select().from(outboundOrders).where(eq(outboundOrders.id, orderId)).limit(1).for("update");
    if (!order) throw ApiError.notFound("Pedido de salida no encontrado.");
    if (order.status === "COMPLETED" || order.status === "CANCELLED") {
      throw ApiError.badRequest("Este pedido ya está cerrado y no admite más preparación.");
    }

    const [line] = await tx
      .select()
      .from(outboundOrderLines)
      .where(and(eq(outboundOrderLines.id, input.lineId), eq(outboundOrderLines.outboundOrderId, orderId)))
      .limit(1);
    if (!line) throw ApiError.notFound("Línea de pedido no encontrada.");

    const remaining = line.requestedQuantity - line.pickedQuantity;
    if (input.quantity > remaining) {
      throw ApiError.badRequest(`La cantidad indicada supera lo pendiente de preparar (${remaining}).`);
    }

    // A blocked location can still be picked from (lets an operator empty it
    // out); the block only stops new stock from being placed into it.
    const location = await requireLocation(input.locationId, tx);

    await decreaseStock(tx, line.itemId, input.locationId, input.quantity, location.code);

    const newPickedQuantity = line.pickedQuantity + input.quantity;
    await tx.update(outboundOrderLines).set({ pickedQuantity: newPickedQuantity }).where(eq(outboundOrderLines.id, line.id));

    await recordMovement(tx, {
      type: "OUTBOUND",
      itemId: line.itemId,
      quantity: input.quantity,
      sourceLocationId: input.locationId,
      referenceType: "OUTBOUND_ORDER",
      referenceId: orderId,
      userId,
    });

    const allLines = await tx.select().from(outboundOrderLines).where(eq(outboundOrderLines.outboundOrderId, orderId));
    const effectiveLines = allLines.map((l) => (l.id === line.id ? { ...l, pickedQuantity: newPickedQuantity } : l));
    const allComplete = effectiveLines.every((l) => l.pickedQuantity >= l.requestedQuantity);
    const anyPicked = effectiveLines.some((l) => l.pickedQuantity > 0);
    const newStatus = allComplete ? "COMPLETED" : anyPicked ? "PICKING" : "PENDING";

    await tx.update(outboundOrders).set({ status: newStatus, updatedAt: new Date() }).where(eq(outboundOrders.id, orderId));

    return getOutboundOrderById(orderId, tx);
  });
}
