import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, type Database, type Tx } from "../db";
import { items, receiptLines, receipts, users } from "../db/schema";
import { ApiError } from "../utils/errors";
import { firstRow } from "../utils/db";
import { nextReceiptCode } from "../utils/codes";
import { increaseStock, recordMovement } from "./stock.service";
import { requireLocation } from "./locations.service";
import type {
  CreateReceiptInput,
  ReceiveLineInput,
  ReceiptListQuery,
  UpdateReceiptInput,
} from "../validators/receipts";

type Executor = Database | Tx;

async function withLines(executor: Executor, receiptId: number) {
  return executor
    .select({
      id: receiptLines.id,
      itemId: receiptLines.itemId,
      sku: items.sku,
      itemName: items.name,
      unit: items.unit,
      expectedQuantity: receiptLines.expectedQuantity,
      receivedQuantity: receiptLines.receivedQuantity,
    })
    .from(receiptLines)
    .innerJoin(items, eq(receiptLines.itemId, items.id))
    .where(eq(receiptLines.receiptId, receiptId))
    .orderBy(receiptLines.id);
}

export async function listReceipts(query: ReceiptListQuery) {
  const conditions: SQL[] = [];
  if (query.status) conditions.push(eq(receipts.status, query.status));
  if (query.search) {
    const term = `%${query.search}%`;
    const condition = or(ilike(receipts.code, term), ilike(receipts.supplierName, term));
    if (condition) conditions.push(condition);
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: receipts.id,
      code: receipts.code,
      supplierName: receipts.supplierName,
      externalReference: receipts.externalReference,
      status: receipts.status,
      expectedDate: receipts.expectedDate,
      createdByName: users.fullName,
      createdAt: receipts.createdAt,
      updatedAt: receipts.updatedAt,
    })
    .from(receipts)
    .leftJoin(users, eq(receipts.createdBy, users.id))
    .where(whereClause)
    .orderBy(desc(receipts.createdAt))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize);

  const { count } = firstRow(await db.select({ count: sql<number>`count(*)::int` }).from(receipts).where(whereClause));

  return { rows, total: count, page: query.page, pageSize: query.pageSize };
}

export async function getReceiptById(id: number, executor: Executor = db) {
  const [receipt] = await executor
    .select({
      id: receipts.id,
      code: receipts.code,
      supplierName: receipts.supplierName,
      externalReference: receipts.externalReference,
      status: receipts.status,
      expectedDate: receipts.expectedDate,
      notes: receipts.notes,
      createdByName: users.fullName,
      createdAt: receipts.createdAt,
      updatedAt: receipts.updatedAt,
    })
    .from(receipts)
    .leftJoin(users, eq(receipts.createdBy, users.id))
    .where(eq(receipts.id, id))
    .limit(1);

  if (!receipt) throw ApiError.notFound("Recepción no encontrada.");

  const lines = await withLines(executor, id);
  return { ...receipt, lines };
}

export async function createReceipt(input: CreateReceiptInput, userId: number) {
  return db.transaction(async (tx) => {
    const code = await nextReceiptCode(tx);
    const receipt = firstRow(
      await tx
        .insert(receipts)
        .values({
          code,
          supplierName: input.supplierName ?? null,
          externalReference: input.externalReference ?? null,
          expectedDate: input.expectedDate ?? null,
          notes: input.notes ?? null,
          createdBy: userId,
          status: "PENDING",
        })
        .returning()
    );

    await tx.insert(receiptLines).values(
      input.lines.map((line) => ({
        receiptId: receipt.id,
        itemId: line.itemId,
        expectedQuantity: line.expectedQuantity,
      }))
    );

    return getReceiptById(receipt.id, tx);
  });
}

export async function updateReceipt(id: number, input: UpdateReceiptInput) {
  // PENDING/RECEIVING/COMPLETED are derived from the received quantities on the
  // lines, so the only status a client may set by hand is CANCELLED.
  if (input.status && input.status !== "CANCELLED") {
    throw ApiError.badRequest("El estado de la recepción se calcula automáticamente a partir de sus líneas.");
  }

  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(receipts).where(eq(receipts.id, id)).limit(1).for("update");
    if (!current) throw ApiError.notFound("Recepción no encontrada.");
    if (current.status === "COMPLETED" || current.status === "CANCELLED") {
      throw ApiError.badRequest("Esta recepción ya está cerrada y no admite cambios.");
    }

    await tx
      .update(receipts)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(receipts.id, id));

    return getReceiptById(id, tx);
  });
}

export async function receiveLine(receiptId: number, input: ReceiveLineInput, userId: number) {
  return db.transaction(async (tx) => {
    // FOR UPDATE serialises every concurrent operation on the same receipt.
    // Without it two requests fired at once (a double-clicked button, a retried
    // POST) both read the same receivedQuantity, both add stock, and the line
    // ends up counting only one of them.
    const [receipt] = await tx.select().from(receipts).where(eq(receipts.id, receiptId)).limit(1).for("update");
    if (!receipt) throw ApiError.notFound("Recepción no encontrada.");
    if (receipt.status === "COMPLETED" || receipt.status === "CANCELLED") {
      throw ApiError.badRequest("Esta recepción ya está cerrada y no admite más entradas.");
    }

    const [line] = await tx
      .select()
      .from(receiptLines)
      .where(and(eq(receiptLines.id, input.lineId), eq(receiptLines.receiptId, receiptId)))
      .limit(1);
    if (!line) throw ApiError.notFound("Línea de recepción no encontrada.");

    const remaining = line.expectedQuantity - line.receivedQuantity;
    if (input.quantity > remaining) {
      throw ApiError.badRequest(`La cantidad indicada supera lo pendiente de recibir (${remaining}).`);
    }

    const location = await requireLocation(input.locationId, tx);
    if (location.blocked) {
      throw ApiError.badRequest(`La ubicación ${location.code} está bloqueada y no admite entradas.`);
    }

    await increaseStock(tx, line.itemId, input.locationId, input.quantity);

    const newReceivedQuantity = line.receivedQuantity + input.quantity;
    await tx.update(receiptLines).set({ receivedQuantity: newReceivedQuantity }).where(eq(receiptLines.id, line.id));

    await recordMovement(tx, {
      type: "RECEIPT",
      itemId: line.itemId,
      quantity: input.quantity,
      destinationLocationId: input.locationId,
      referenceType: "RECEIPT",
      referenceId: receiptId,
      userId,
    });

    const allLines = await tx.select().from(receiptLines).where(eq(receiptLines.receiptId, receiptId));
    const effectiveLines = allLines.map((l) => (l.id === line.id ? { ...l, receivedQuantity: newReceivedQuantity } : l));
    const allComplete = effectiveLines.every((l) => l.receivedQuantity >= l.expectedQuantity);
    const anyReceived = effectiveLines.some((l) => l.receivedQuantity > 0);
    const newStatus = allComplete ? "COMPLETED" : anyReceived ? "RECEIVING" : "PENDING";

    await tx.update(receipts).set({ status: newStatus, updatedAt: new Date() }).where(eq(receipts.id, receiptId));

    return getReceiptById(receiptId, tx);
  });
}
