import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// -----------------------------------------------------------------------------
// This file mirrors database/schema.sql exactly. It is used only to build
// type-safe queries from the API with Drizzle ORM — the database itself is
// created by running database/schema.sql directly in Neon, not by migrating
// from this file.
// -----------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "OPERATOR"]);
export const receiptStatusEnum = pgEnum("receipt_status", [
  "PENDING",
  "RECEIVING",
  "COMPLETED",
  "CANCELLED",
]);
export const outboundStatusEnum = pgEnum("outbound_status", [
  "PENDING",
  "PICKING",
  "COMPLETED",
  "CANCELLED",
]);
export const movementTypeEnum = pgEnum("movement_type", [
  "RECEIPT",
  "OUTBOUND",
  "TRANSFER",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
]);
export const adjustmentReasonEnum = pgEnum("adjustment_reason", [
  "INVENTORY_COUNT",
  "DAMAGE",
  "LOSS",
  "DATA_ERROR",
  "OTHER",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: varchar("full_name", { length: 150 }).notNull(),
  role: userRoleEnum("role").notNull().default("OPERATOR"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 150 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const items = pgTable(
  "items",
  {
    id: serial("id").primaryKey(),
    sku: varchar("sku", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    unit: varchar("unit", { length: 20 }).notNull().default("UD"),
    minimumStock: integer("minimum_stock").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_items_category").on(table.categoryId),
    index("idx_items_active").on(table.active),
    check("items_minimum_stock_check", sql`${table.minimumStock} >= 0`),
  ]
);

export const locations = pgTable(
  "locations",
  {
    id: serial("id").primaryKey(),
    warehouseId: integer("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "restrict" }),
    code: varchar("code", { length: 30 }).notNull(),
    zone: varchar("zone", { length: 20 }).notNull(),
    capacity: integer("capacity"),
    blocked: boolean("blocked").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("locations_warehouse_code_key").on(table.warehouseId, table.code),
    index("idx_locations_warehouse").on(table.warehouseId),
    index("idx_locations_zone").on(table.zone),
  ]
);

export const stock = pgTable(
  "stock",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "restrict" }),
    locationId: integer("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("stock_item_location_key").on(table.itemId, table.locationId),
    index("idx_stock_item").on(table.itemId),
    index("idx_stock_location").on(table.locationId),
    check("stock_quantity_check", sql`${table.quantity} >= 0`),
  ]
);

export const receipts = pgTable(
  "receipts",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 30 }).notNull().unique(),
    supplierName: varchar("supplier_name", { length: 200 }),
    externalReference: varchar("external_reference", { length: 100 }),
    status: receiptStatusEnum("status").notNull().default("PENDING"),
    expectedDate: date("expected_date"),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_receipts_status").on(table.status)]
);

export const receiptLines = pgTable(
  "receipt_lines",
  {
    id: serial("id").primaryKey(),
    receiptId: integer("receipt_id")
      .notNull()
      .references(() => receipts.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "restrict" }),
    expectedQuantity: integer("expected_quantity").notNull(),
    receivedQuantity: integer("received_quantity").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_receipt_lines_receipt").on(table.receiptId),
    index("idx_receipt_lines_item").on(table.itemId),
    check("receipt_lines_expected_check", sql`${table.expectedQuantity} >= 0`),
    check("receipt_lines_received_check", sql`${table.receivedQuantity} >= 0`),
    check("receipt_lines_received_le_expected", sql`${table.receivedQuantity} <= ${table.expectedQuantity}`),
  ]
);

export const outboundOrders = pgTable(
  "outbound_orders",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 30 }).notNull().unique(),
    customerName: varchar("customer_name", { length: 200 }),
    externalReference: varchar("external_reference", { length: 100 }),
    status: outboundStatusEnum("status").notNull().default("PENDING"),
    notes: text("notes"),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_outbound_orders_status").on(table.status)]
);

export const outboundOrderLines = pgTable(
  "outbound_order_lines",
  {
    id: serial("id").primaryKey(),
    outboundOrderId: integer("outbound_order_id")
      .notNull()
      .references(() => outboundOrders.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "restrict" }),
    requestedQuantity: integer("requested_quantity").notNull(),
    pickedQuantity: integer("picked_quantity").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_outbound_lines_order").on(table.outboundOrderId),
    index("idx_outbound_lines_item").on(table.itemId),
    check("outbound_lines_requested_check", sql`${table.requestedQuantity} >= 0`),
    check("outbound_lines_picked_check", sql`${table.pickedQuantity} >= 0`),
    check("outbound_lines_picked_le_requested", sql`${table.pickedQuantity} <= ${table.requestedQuantity}`),
  ]
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: serial("id").primaryKey(),
    type: movementTypeEnum("type").notNull(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    sourceLocationId: integer("source_location_id").references(() => locations.id, {
      onDelete: "restrict",
    }),
    destinationLocationId: integer("destination_location_id").references(() => locations.id, {
      onDelete: "restrict",
    }),
    referenceType: varchar("reference_type", { length: 30 }),
    referenceId: integer("reference_id"),
    reason: adjustmentReasonEnum("reason"),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_movements_item").on(table.itemId),
    index("idx_movements_created_at").on(table.createdAt),
    index("idx_movements_type").on(table.type),
    index("idx_movements_user").on(table.userId),
    check("stock_movements_quantity_check", sql`${table.quantity} > 0`),
  ]
);
