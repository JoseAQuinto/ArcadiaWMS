-- =============================================================================
-- Arcadia WMS — Database schema + demo data
-- =============================================================================
-- Target: Neon PostgreSQL (or any PostgreSQL 14+).
--
-- HOW TO USE
--   1. Create a project in Neon (https://neon.tech).
--   2. Open the SQL Editor for that project.
--   3. Paste the entire contents of this file and run it.
--   4. Copy the pooled connection string into DATABASE_URL (see .env.example).
--
-- This script is self-contained and safe to re-run: it drops every object it
-- owns before recreating them, so it can be executed against a brand new
-- database or used to reset an existing Arcadia WMS database back to the
-- demo dataset.
--
-- The structure here is the single source of truth for the schema. The
-- Drizzle schema at server/db/schema.ts mirrors it exactly and is used only
-- to build type-safe queries from the Node.js API — Drizzle Kit is not used
-- to create the initial database.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Clean slate (safe to re-run)
-- -----------------------------------------------------------------------------
DROP SEQUENCE IF EXISTS receipt_code_seq;
DROP SEQUENCE IF EXISTS outbound_code_seq;

DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS outbound_order_lines CASCADE;
DROP TABLE IF EXISTS outbound_orders CASCADE;
DROP TABLE IF EXISTS receipt_lines CASCADE;
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS movement_type CASCADE;
DROP TYPE IF EXISTS adjustment_reason CASCADE;
DROP TYPE IF EXISTS outbound_status CASCADE;
DROP TYPE IF EXISTS receipt_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- -----------------------------------------------------------------------------
-- 1. Enum types
-- -----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('ADMIN', 'OPERATOR');

CREATE TYPE receipt_status AS ENUM ('PENDING', 'RECEIVING', 'COMPLETED', 'CANCELLED');

CREATE TYPE outbound_status AS ENUM ('PENDING', 'PICKING', 'COMPLETED', 'CANCELLED');

CREATE TYPE movement_type AS ENUM (
  'RECEIPT',
  'OUTBOUND',
  'TRANSFER',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT'
);

CREATE TYPE adjustment_reason AS ENUM (
  'INVENTORY_COUNT',
  'DAMAGE',
  'LOSS',
  'DATA_ERROR',
  'OTHER'
);

-- Sequences used to generate human-readable, collision-free document codes
-- (REC-000001, SAL-000001, ...) with a single atomic nextval() call — safe
-- under concurrent requests without any extra locking logic in the API.
CREATE SEQUENCE receipt_code_seq START WITH 1;
CREATE SEQUENCE outbound_code_seq START WITH 1;

-- -----------------------------------------------------------------------------
-- 2. Core tables
-- -----------------------------------------------------------------------------

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  role          user_role NOT NULL DEFAULT 'OPERATOR',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE warehouses (
  id         SERIAL PRIMARY KEY,
  code       VARCHAR(20) NOT NULL UNIQUE,
  name       VARCHAR(150) NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id              SERIAL PRIMARY KEY,
  sku             VARCHAR(50) NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  description     TEXT,
  category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  unit            VARCHAR(20) NOT NULL DEFAULT 'UD',
  minimum_stock   INTEGER NOT NULL DEFAULT 0 CONSTRAINT items_minimum_stock_check CHECK (minimum_stock >= 0),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE locations (
  id            SERIAL PRIMARY KEY,
  warehouse_id  INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  code          VARCHAR(30) NOT NULL,
  zone          VARCHAR(20) NOT NULL,
  capacity      INTEGER CONSTRAINT locations_capacity_check CHECK (capacity IS NULL OR capacity > 0),
  blocked       BOOLEAN NOT NULL DEFAULT FALSE,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, code)
);

-- Stock is always keyed by item + location. It must never be written to
-- directly by the API — only receipts, picks, transfers and adjustments
-- (all transactional) are allowed to change it. See server/services/stock.service.ts.
CREATE TABLE stock (
  id          SERIAL PRIMARY KEY,
  item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  quantity    INTEGER NOT NULL DEFAULT 0 CONSTRAINT stock_quantity_check CHECK (quantity >= 0),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, location_id)
);

CREATE TABLE receipts (
  id                  SERIAL PRIMARY KEY,
  code                VARCHAR(30) NOT NULL UNIQUE,
  supplier_name       VARCHAR(200),
  external_reference  VARCHAR(100),
  status              receipt_status NOT NULL DEFAULT 'PENDING',
  expected_date       DATE,
  notes               TEXT,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE receipt_lines (
  id                 SERIAL PRIMARY KEY,
  receipt_id         INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  item_id            INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  expected_quantity  INTEGER NOT NULL CONSTRAINT receipt_lines_expected_check CHECK (expected_quantity >= 0),
  received_quantity  INTEGER NOT NULL DEFAULT 0 CONSTRAINT receipt_lines_received_check CHECK (received_quantity >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT receipt_lines_received_le_expected CHECK (received_quantity <= expected_quantity)
);

CREATE TABLE outbound_orders (
  id                  SERIAL PRIMARY KEY,
  code                VARCHAR(30) NOT NULL UNIQUE,
  customer_name       VARCHAR(200),
  external_reference  VARCHAR(100),
  status              outbound_status NOT NULL DEFAULT 'PENDING',
  notes               TEXT,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outbound_order_lines (
  id                  SERIAL PRIMARY KEY,
  outbound_order_id   INTEGER NOT NULL REFERENCES outbound_orders(id) ON DELETE CASCADE,
  item_id             INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  requested_quantity  INTEGER NOT NULL CONSTRAINT outbound_lines_requested_check CHECK (requested_quantity >= 0),
  picked_quantity     INTEGER NOT NULL DEFAULT 0 CONSTRAINT outbound_lines_picked_check CHECK (picked_quantity >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT outbound_lines_picked_le_requested CHECK (picked_quantity <= requested_quantity)
);

-- Central, append-only ledger of every stock change. Nothing should ever
-- update stock without writing a row here in the same transaction.
CREATE TABLE stock_movements (
  id                      SERIAL PRIMARY KEY,
  type                    movement_type NOT NULL,
  item_id                 INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity                INTEGER NOT NULL CONSTRAINT stock_movements_quantity_check CHECK (quantity > 0),
  source_location_id      INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
  destination_location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
  -- Polymorphic pointer to the document that caused this movement
  -- ('RECEIPT' -> receipts.id, 'OUTBOUND_ORDER' -> outbound_orders.id). No FK
  -- because it targets different tables depending on reference_type; kept
  -- intentionally simple rather than introducing a junction table per type.
  reference_type          VARCHAR(30) CONSTRAINT stock_movements_reference_type_check CHECK (reference_type IN ('RECEIPT', 'OUTBOUND_ORDER', 'TRANSFER', 'ADJUSTMENT')),
  reference_id             INTEGER,
  reason                  adjustment_reason,
  user_id                 INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stock_movements_locations_check CHECK (
    (type = 'RECEIPT'         AND source_location_id IS NULL     AND destination_location_id IS NOT NULL) OR
    (type = 'OUTBOUND'        AND source_location_id IS NOT NULL AND destination_location_id IS NULL) OR
    (type = 'TRANSFER'        AND source_location_id IS NOT NULL AND destination_location_id IS NOT NULL) OR
    (type = 'ADJUSTMENT_IN'   AND source_location_id IS NULL     AND destination_location_id IS NOT NULL) OR
    (type = 'ADJUSTMENT_OUT'  AND source_location_id IS NOT NULL AND destination_location_id IS NULL)
  ),
  CONSTRAINT stock_movements_distinct_locations_check CHECK (source_location_id IS NULL OR destination_location_id IS NULL OR source_location_id <> destination_location_id),
  CONSTRAINT stock_movements_reason_check CHECK ((type IN ('ADJUSTMENT_IN', 'ADJUSTMENT_OUT')) = (reason IS NOT NULL))
);

-- -----------------------------------------------------------------------------
-- 3. Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_active ON items(active);
CREATE INDEX idx_items_name_trgm ON items USING btree (lower(name));

CREATE INDEX idx_locations_warehouse ON locations(warehouse_id);
CREATE INDEX idx_locations_zone ON locations(zone);

CREATE INDEX idx_stock_item ON stock(item_id);
CREATE INDEX idx_stock_location ON stock(location_id);

CREATE INDEX idx_receipt_lines_receipt ON receipt_lines(receipt_id);
CREATE INDEX idx_receipt_lines_item ON receipt_lines(item_id);
CREATE INDEX idx_receipts_status ON receipts(status);

CREATE INDEX idx_outbound_lines_order ON outbound_order_lines(outbound_order_id);
CREATE INDEX idx_outbound_lines_item ON outbound_order_lines(item_id);
CREATE INDEX idx_outbound_orders_status ON outbound_orders(status);

CREATE INDEX idx_movements_item ON stock_movements(item_id);
CREATE INDEX idx_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX idx_movements_type ON stock_movements(type);
CREATE INDEX idx_movements_user ON stock_movements(user_id);
CREATE INDEX idx_movements_source_location ON stock_movements(source_location_id);
CREATE INDEX idx_movements_destination_location ON stock_movements(destination_location_id);

-- =============================================================================
-- 4. Demo data
-- =============================================================================
-- Realistic, internally consistent dataset for a small electronics /
-- IT-hardware distributor. Every stock quantity below is derived from the
-- stock_movements ledger (see step 4.7), never entered by hand, so the demo
-- data demonstrates the exact same integrity rules the API enforces at
-- runtime.

-- 4.1 Users -------------------------------------------------------------------
-- Demo credentials (see README.md):
--   admin    / Admin123!
--   operator / Operator123!
-- Hashes below are bcrypt (cost 10) of those passwords.
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
  ('admin',    'admin@arcadiawms.com',    '$2a$10$uQagEf.hrvK7ZRX3MYlpU.bNttVBhAgDfuNMj3yqkSOlGkBuVFF8i', 'Ana Martínez', 'ADMIN'),
  ('operator', 'operator@arcadiawms.com', '$2a$10$DA6nKJHASJ98A46oSPid3ONAbkU18pbFofLV/rfiIMdyt5ckdwy8a', 'Carlos Ruiz',  'OPERATOR');

-- 4.2 Warehouse -----------------------------------------------------------
INSERT INTO warehouses (code, name) VALUES
  ('ARC-01', 'Almacén Principal');

-- 4.3 Locations -------------------------------------------------------------
-- Zone A: standard shelving, capacity 100. Zone B: standard shelving,
-- capacity 80. Zone C: bulk pallet storage, capacity 150. C-01-04 is
-- deliberately BLOCKED (e.g. under maintenance) to showcase that state.
INSERT INTO locations (warehouse_id, code, zone, capacity, blocked) VALUES
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'A-01-01', 'A', 100, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'A-01-02', 'A', 100, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'A-01-03', 'A', 100, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'A-01-04', 'A', 100, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'A-02-01', 'A', 100, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'A-02-02', 'A', 100, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'A-02-03', 'A', 100, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'A-02-04', 'A', 100, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'A-03-01', 'A', 100, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'A-03-02', 'A', 100, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'A-03-03', 'A', 100, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'A-03-04', 'A', 100, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'B-01-01', 'B', 80,  FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'B-01-02', 'B', 80,  FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'B-01-03', 'B', 80,  FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'B-01-04', 'B', 80,  FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'B-02-01', 'B', 80,  FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'B-02-02', 'B', 80,  FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'B-02-03', 'B', 80,  FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'B-02-04', 'B', 80,  FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'C-01-01', 'C', 150, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'C-01-02', 'C', 150, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'C-01-03', 'C', 150, FALSE),
  ((SELECT id FROM warehouses WHERE code = 'ARC-01'), 'C-01-04', 'C', 150, TRUE);

-- 4.4 Categories --------------------------------------------------------------
INSERT INTO categories (name, description) VALUES
  ('Informática',               'Ordenadores, portátiles y monitores'),
  ('Periféricos',               'Teclados, ratones y accesorios de entrada'),
  ('Cableado y Conectividad',   'Cables, adaptadores y hubs'),
  ('Componentes',                'Piezas internas: almacenamiento, memoria y alimentación'),
  ('Audio y Vídeo',             'Auriculares, webcams y accesorios multimedia');

-- 4.5 Items ---------------------------------------------------------------
INSERT INTO items (sku, name, description, category_id, unit, minimum_stock) VALUES
  ('MON-24-FHD',     'Monitor 24" Full HD',               'Panel IPS 1920x1080, 75Hz',                 (SELECT id FROM categories WHERE name = 'Informática'),             'UD', 5),
  ('MON-27-QHD',     'Monitor 27" QHD',                   'Panel IPS 2560x1440, 100Hz',                (SELECT id FROM categories WHERE name = 'Informática'),             'UD', 3),
  ('LAP-14-PRO',     'Portátil 14" Pro',                  'Ultrabook 14", 16GB RAM, 512GB SSD',        (SELECT id FROM categories WHERE name = 'Informática'),             'UD', 4),
  ('TEC-MEC-001',    'Teclado mecánico retroiluminado',   'Switches rojos, RGB, formato TKL',          (SELECT id FROM categories WHERE name = 'Periféricos'),             'UD', 10),
  ('TEC-INAL-002',   'Teclado inalámbrico compacto',      'Bluetooth + USB, perfil bajo',              (SELECT id FROM categories WHERE name = 'Periféricos'),             'UD', 10),
  ('RAT-WLS-001',    'Ratón inalámbrico',                 '2.4GHz, sensor óptico 1600dpi',             (SELECT id FROM categories WHERE name = 'Periféricos'),             'UD', 15),
  ('RAT-GAM-002',    'Ratón gaming óptico',                'Sensor 16000dpi, 6 botones programables',   (SELECT id FROM categories WHERE name = 'Periféricos'),             'UD', 8),
  ('CAB-USB-C-2M',   'Cable USB-C 2m',                    'USB-C a USB-C, carga rápida 100W',          (SELECT id FROM categories WHERE name = 'Cableado y Conectividad'), 'UD', 20),
  ('CAB-HDMI-2M',    'Cable HDMI 2m',                     'HDMI 2.1, hasta 4K@120Hz',                  (SELECT id FROM categories WHERE name = 'Cableado y Conectividad'), 'UD', 20),
  ('CAB-RED-CAT6-5M','Cable de red Cat6 5m',              'UTP Cat6, conectores RJ45',                 (SELECT id FROM categories WHERE name = 'Cableado y Conectividad'), 'UD', 15),
  ('HUB-USB-C-7P',   'Hub USB-C 7 puertos',               '3x USB-A, HDMI, SD, PD 100W',               (SELECT id FROM categories WHERE name = 'Cableado y Conectividad'), 'UD', 6),
  ('SSD-NVME-1TB',   'Disco SSD NVMe 1TB',                 'PCIe 4.0, hasta 7000MB/s',                  (SELECT id FROM categories WHERE name = 'Componentes'),             'UD', 6),
  ('RAM-DDR4-16G',   'Módulo RAM DDR4 16GB',              '3200MHz, CL16',                             (SELECT id FROM categories WHERE name = 'Componentes'),             'UD', 8),
  -- Deliberately set above its current stock (15 uds) so the demo data also
  -- exercises the "below minimum" indicator on an item that DOES have stock,
  -- not only on items with none.
  ('FUE-ALIM-650W',  'Fuente de alimentación 650W',        '80 Plus Gold, modular',                     (SELECT id FROM categories WHERE name = 'Componentes'),             'UD', 20),
  ('AUR-DIAD-001',   'Auriculares con diadema',            'Inalámbricos, cancelación de ruido activa', (SELECT id FROM categories WHERE name = 'Audio y Vídeo'),           'UD', 8);

-- 4.6 Documents (receipts, outbound orders) and their lines --------------------

INSERT INTO receipts (code, supplier_name, external_reference, status, expected_date, created_by, created_at, updated_at) VALUES
  ('REC-000001', 'TechDistrib S.L.',          'PO-8841', 'COMPLETED', (now() - interval '11 days')::date, (SELECT id FROM users WHERE username = 'admin'),    now() - interval '11 days', now() - interval '10 days'),
  ('REC-000002', 'Componentes Ibérica S.A.',  'PO-8850', 'COMPLETED', (now() - interval '7 days')::date,  (SELECT id FROM users WHERE username = 'admin'),    now() - interval '7 days',  now() - interval '6 days'),
  ('REC-000003', 'Global Peripherals Corp.',  'PO-8862', 'RECEIVING', (now() + interval '2 days')::date,  (SELECT id FROM users WHERE username = 'operator'), now() - interval '1 day',   now() - interval '1 day'),
  ('REC-000004', 'Nordic Cable Supply',       NULL,      'PENDING',   (now() + interval '5 days')::date,  (SELECT id FROM users WHERE username = 'admin'),    now() - interval '2 hours', now() - interval '2 hours');

INSERT INTO receipt_lines (receipt_id, item_id, expected_quantity) VALUES
  ((SELECT id FROM receipts WHERE code = 'REC-000001'), (SELECT id FROM items WHERE sku = 'MON-24-FHD'),   40),
  ((SELECT id FROM receipts WHERE code = 'REC-000001'), (SELECT id FROM items WHERE sku = 'TEC-MEC-001'),  60),
  ((SELECT id FROM receipts WHERE code = 'REC-000001'), (SELECT id FROM items WHERE sku = 'CAB-USB-C-2M'), 100),
  ((SELECT id FROM receipts WHERE code = 'REC-000002'), (SELECT id FROM items WHERE sku = 'SSD-NVME-1TB'), 20),
  ((SELECT id FROM receipts WHERE code = 'REC-000002'), (SELECT id FROM items WHERE sku = 'RAM-DDR4-16G'), 35),
  ((SELECT id FROM receipts WHERE code = 'REC-000002'), (SELECT id FROM items WHERE sku = 'FUE-ALIM-650W'),15),
  ((SELECT id FROM receipts WHERE code = 'REC-000003'), (SELECT id FROM items WHERE sku = 'RAT-WLS-001'),  100),
  ((SELECT id FROM receipts WHERE code = 'REC-000003'), (SELECT id FROM items WHERE sku = 'RAT-GAM-002'),  45),
  ((SELECT id FROM receipts WHERE code = 'REC-000004'), (SELECT id FROM items WHERE sku = 'CAB-HDMI-2M'),  50),
  ((SELECT id FROM receipts WHERE code = 'REC-000004'), (SELECT id FROM items WHERE sku = 'HUB-USB-C-7P'), 30);

INSERT INTO outbound_orders (code, customer_name, external_reference, status, notes, created_by, created_at, updated_at) VALUES
  ('SAL-000001', 'Retail Norte S.L.',        'SO-5521', 'COMPLETED', NULL,                                  (SELECT id FROM users WHERE username = 'operator'), now() - interval '5 days', now() - interval '4 days'),
  ('SAL-000002', 'Oficinas del Sur S.C.',    'SO-5538', 'PICKING',   NULL,                                  (SELECT id FROM users WHERE username = 'operator'), now() - interval '1 day',  now() - interval '10 hours'),
  ('SAL-000003', 'Distribuciones Este S.A.', NULL,      'PENDING',   NULL,                                  (SELECT id FROM users WHERE username = 'admin'),    now() - interval '3 hours', now() - interval '3 hours'),
  ('SAL-000004', 'Cliente de prueba',        NULL,      'CANCELLED', 'Cancelado a petición del cliente',    (SELECT id FROM users WHERE username = 'admin'),    now() - interval '8 days', now() - interval '8 days');

INSERT INTO outbound_order_lines (outbound_order_id, item_id, requested_quantity) VALUES
  ((SELECT id FROM outbound_orders WHERE code = 'SAL-000001'), (SELECT id FROM items WHERE sku = 'TEC-MEC-001'),  10),
  ((SELECT id FROM outbound_orders WHERE code = 'SAL-000001'), (SELECT id FROM items WHERE sku = 'CAB-USB-C-2M'), 30),
  ((SELECT id FROM outbound_orders WHERE code = 'SAL-000002'), (SELECT id FROM items WHERE sku = 'MON-24-FHD'),   15),
  ((SELECT id FROM outbound_orders WHERE code = 'SAL-000002'), (SELECT id FROM items WHERE sku = 'RAT-GAM-002'),  20),
  ((SELECT id FROM outbound_orders WHERE code = 'SAL-000003'), (SELECT id FROM items WHERE sku = 'SSD-NVME-1TB'), 5),
  ((SELECT id FROM outbound_orders WHERE code = 'SAL-000003'), (SELECT id FROM items WHERE sku = 'RAM-DDR4-16G'), 8),
  ((SELECT id FROM outbound_orders WHERE code = 'SAL-000004'), (SELECT id FROM items WHERE sku = 'AUR-DIAD-001'), 5);

-- 4.7 Stock movements ---------------------------------------------------------
-- This ledger is the single source of truth. The `stock` table below is
-- derived entirely from it (step 4.8), never entered independently.

-- Initial inventory load (warehouse go-live count)
INSERT INTO stock_movements (type, item_id, quantity, destination_location_id, reference_type, reason, user_id, notes, created_at) VALUES
  ('ADJUSTMENT_IN', (SELECT id FROM items WHERE sku = 'MON-27-QHD'),      30, (SELECT id FROM locations WHERE code = 'A-01-02'), 'ADJUSTMENT', 'INVENTORY_COUNT', (SELECT id FROM users WHERE username = 'admin'), 'Carga inicial de inventario', now() - interval '20 days'),
  ('ADJUSTMENT_IN', (SELECT id FROM items WHERE sku = 'LAP-14-PRO'),      20, (SELECT id FROM locations WHERE code = 'A-01-03'), 'ADJUSTMENT', 'INVENTORY_COUNT', (SELECT id FROM users WHERE username = 'admin'), 'Carga inicial de inventario', now() - interval '20 days'),
  ('ADJUSTMENT_IN', (SELECT id FROM items WHERE sku = 'TEC-INAL-002'),    55, (SELECT id FROM locations WHERE code = 'A-02-02'), 'ADJUSTMENT', 'INVENTORY_COUNT', (SELECT id FROM users WHERE username = 'admin'), 'Carga inicial de inventario', now() - interval '20 days'),
  ('ADJUSTMENT_IN', (SELECT id FROM items WHERE sku = 'CAB-RED-CAT6-5M'), 50, (SELECT id FROM locations WHERE code = 'A-03-03'), 'ADJUSTMENT', 'INVENTORY_COUNT', (SELECT id FROM users WHERE username = 'admin'), 'Carga inicial de inventario', now() - interval '20 days'),
  ('ADJUSTMENT_IN', (SELECT id FROM items WHERE sku = 'CAB-RED-CAT6-5M'), 80, (SELECT id FROM locations WHERE code = 'C-01-02'), 'ADJUSTMENT', 'INVENTORY_COUNT', (SELECT id FROM users WHERE username = 'admin'), 'Carga inicial de inventario', now() - interval '20 days'),
  ('ADJUSTMENT_IN', (SELECT id FROM items WHERE sku = 'AUR-DIAD-001'),    28, (SELECT id FROM locations WHERE code = 'B-01-04'), 'ADJUSTMENT', 'INVENTORY_COUNT', (SELECT id FROM users WHERE username = 'admin'), 'Carga inicial de inventario', now() - interval '20 days'),
  ('ADJUSTMENT_IN', (SELECT id FROM items WHERE sku = 'CAB-USB-C-2M'),   150, (SELECT id FROM locations WHERE code = 'C-01-01'), 'ADJUSTMENT', 'INVENTORY_COUNT', (SELECT id FROM users WHERE username = 'admin'), 'Carga inicial de inventario', now() - interval '20 days');

-- REC-000001 (fully received)
INSERT INTO stock_movements (type, item_id, quantity, destination_location_id, reference_type, reference_id, user_id, created_at) VALUES
  ('RECEIPT', (SELECT id FROM items WHERE sku = 'MON-24-FHD'),   40, (SELECT id FROM locations WHERE code = 'A-01-01'), 'RECEIPT', (SELECT id FROM receipts WHERE code = 'REC-000001'), (SELECT id FROM users WHERE username = 'admin'), now() - interval '10 days'),
  ('RECEIPT', (SELECT id FROM items WHERE sku = 'TEC-MEC-001'),  60, (SELECT id FROM locations WHERE code = 'A-02-01'), 'RECEIPT', (SELECT id FROM receipts WHERE code = 'REC-000001'), (SELECT id FROM users WHERE username = 'admin'), now() - interval '10 days'),
  ('RECEIPT', (SELECT id FROM items WHERE sku = 'CAB-USB-C-2M'), 100,(SELECT id FROM locations WHERE code = 'A-03-01'), 'RECEIPT', (SELECT id FROM receipts WHERE code = 'REC-000001'), (SELECT id FROM users WHERE username = 'admin'), now() - interval '10 days');

-- REC-000002 (fully received)
INSERT INTO stock_movements (type, item_id, quantity, destination_location_id, reference_type, reference_id, user_id, created_at) VALUES
  ('RECEIPT', (SELECT id FROM items WHERE sku = 'SSD-NVME-1TB'), 20, (SELECT id FROM locations WHERE code = 'B-01-01'), 'RECEIPT', (SELECT id FROM receipts WHERE code = 'REC-000002'), (SELECT id FROM users WHERE username = 'admin'), now() - interval '6 days'),
  ('RECEIPT', (SELECT id FROM items WHERE sku = 'RAM-DDR4-16G'), 35, (SELECT id FROM locations WHERE code = 'B-01-02'), 'RECEIPT', (SELECT id FROM receipts WHERE code = 'REC-000002'), (SELECT id FROM users WHERE username = 'admin'), now() - interval '6 days'),
  ('RECEIPT', (SELECT id FROM items WHERE sku = 'FUE-ALIM-650W'),15, (SELECT id FROM locations WHERE code = 'B-01-03'), 'RECEIPT', (SELECT id FROM receipts WHERE code = 'REC-000002'), (SELECT id FROM users WHERE username = 'admin'), now() - interval '6 days');

-- REC-000003 (partially received -> RECEIVING)
INSERT INTO stock_movements (type, item_id, quantity, destination_location_id, reference_type, reference_id, user_id, created_at) VALUES
  ('RECEIPT', (SELECT id FROM items WHERE sku = 'RAT-WLS-001'), 90, (SELECT id FROM locations WHERE code = 'A-02-03'), 'RECEIPT', (SELECT id FROM receipts WHERE code = 'REC-000003'), (SELECT id FROM users WHERE username = 'operator'), now() - interval '1 day'),
  ('RECEIPT', (SELECT id FROM items WHERE sku = 'RAT-GAM-002'), 45, (SELECT id FROM locations WHERE code = 'A-02-04'), 'RECEIPT', (SELECT id FROM receipts WHERE code = 'REC-000003'), (SELECT id FROM users WHERE username = 'operator'), now() - interval '1 day');

-- Internal transfers (rebalancing between locations)
INSERT INTO stock_movements (type, item_id, quantity, source_location_id, destination_location_id, reference_type, user_id, notes, created_at) VALUES
  ('TRANSFER', (SELECT id FROM items WHERE sku = 'MON-24-FHD'), 15, (SELECT id FROM locations WHERE code = 'A-01-01'), (SELECT id FROM locations WHERE code = 'B-02-01'), 'TRANSFER', (SELECT id FROM users WHERE username = 'admin'),    'Rebalanceo de stock entre ubicaciones', now() - interval '9 days'),
  ('TRANSFER', (SELECT id FROM items WHERE sku = 'RAT-WLS-001'), 20, (SELECT id FROM locations WHERE code = 'A-02-03'), (SELECT id FROM locations WHERE code = 'B-02-03'), 'TRANSFER', (SELECT id FROM users WHERE username = 'operator'), 'Rebalanceo de stock entre ubicaciones', now() - interval '20 hours');

-- SAL-000001 (fully picked -> COMPLETED)
INSERT INTO stock_movements (type, item_id, quantity, source_location_id, reference_type, reference_id, user_id, created_at) VALUES
  ('OUTBOUND', (SELECT id FROM items WHERE sku = 'TEC-MEC-001'),  10, (SELECT id FROM locations WHERE code = 'A-02-01'), 'OUTBOUND_ORDER', (SELECT id FROM outbound_orders WHERE code = 'SAL-000001'), (SELECT id FROM users WHERE username = 'operator'), now() - interval '4 days'),
  ('OUTBOUND', (SELECT id FROM items WHERE sku = 'CAB-USB-C-2M'), 30, (SELECT id FROM locations WHERE code = 'A-03-01'), 'OUTBOUND_ORDER', (SELECT id FROM outbound_orders WHERE code = 'SAL-000001'), (SELECT id FROM users WHERE username = 'operator'), now() - interval '4 days');

-- SAL-000002 (partially picked -> PICKING)
INSERT INTO stock_movements (type, item_id, quantity, source_location_id, reference_type, reference_id, user_id, created_at) VALUES
  ('OUTBOUND', (SELECT id FROM items WHERE sku = 'MON-24-FHD'),  8,  (SELECT id FROM locations WHERE code = 'A-01-01'), 'OUTBOUND_ORDER', (SELECT id FROM outbound_orders WHERE code = 'SAL-000002'), (SELECT id FROM users WHERE username = 'operator'), now() - interval '10 hours'),
  ('OUTBOUND', (SELECT id FROM items WHERE sku = 'RAT-GAM-002'), 20, (SELECT id FROM locations WHERE code = 'A-02-04'), 'OUTBOUND_ORDER', (SELECT id FROM outbound_orders WHERE code = 'SAL-000002'), (SELECT id FROM users WHERE username = 'operator'), now() - interval '10 hours');

-- Stock regularizations
INSERT INTO stock_movements (type, item_id, quantity, source_location_id, destination_location_id, reference_type, reason, user_id, notes, created_at) VALUES
  ('ADJUSTMENT_OUT', (SELECT id FROM items WHERE sku = 'CAB-RED-CAT6-5M'), 5, (SELECT id FROM locations WHERE code = 'A-03-03'), NULL, 'ADJUSTMENT', 'DAMAGE',           (SELECT id FROM users WHERE username = 'operator'), 'Cable dañado en manipulación', now() - interval '2 days'),
  ('ADJUSTMENT_IN',  (SELECT id FROM items WHERE sku = 'RAM-DDR4-16G'),   3, NULL, (SELECT id FROM locations WHERE code = 'B-01-02'), 'ADJUSTMENT', 'INVENTORY_COUNT', (SELECT id FROM users WHERE username = 'admin'),    'Ajuste tras recuento cíclico: se encontraron 3 unidades adicionales', now() - interval '22 hours');

-- 4.8 Derive stock from the movement ledger (guarantees consistency) --------
INSERT INTO stock (item_id, location_id, quantity)
SELECT item_id, location_id, SUM(delta) AS quantity
FROM (
  SELECT item_id, destination_location_id AS location_id, quantity AS delta
  FROM stock_movements
  WHERE destination_location_id IS NOT NULL
  UNION ALL
  SELECT item_id, source_location_id AS location_id, -quantity AS delta
  FROM stock_movements
  WHERE source_location_id IS NOT NULL
) ledger
GROUP BY item_id, location_id
HAVING SUM(delta) > 0;

-- 4.9 Derive received/picked quantities on document lines from the same ledger
UPDATE receipt_lines rl
SET received_quantity = COALESCE((
  SELECT SUM(sm.quantity)
  FROM stock_movements sm
  WHERE sm.reference_type = 'RECEIPT'
    AND sm.reference_id = rl.receipt_id
    AND sm.item_id = rl.item_id
), 0);

UPDATE outbound_order_lines ol
SET picked_quantity = COALESCE((
  SELECT SUM(sm.quantity)
  FROM stock_movements sm
  WHERE sm.reference_type = 'OUTBOUND_ORDER'
    AND sm.reference_id = ol.outbound_order_id
    AND sm.item_id = ol.item_id
), 0);

-- 4.10 Advance the code sequences past the demo documents created above ------
SELECT setval('receipt_code_seq', (SELECT COUNT(*) FROM receipts));
SELECT setval('outbound_code_seq', (SELECT COUNT(*) FROM outbound_orders));

-- =============================================================================
-- Done. You should now have 2 users, 1 warehouse, 24 locations, 5 categories,
-- 15 items, 4 receipts, 4 outbound orders and a full movement history.
-- =============================================================================
