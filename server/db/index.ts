import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";
import { requireEnv } from "../utils/env";

// Node.js serverless functions don't have a native WebSocket global (unlike
// the browser or the Edge runtime), so Neon's driver needs one injected to
// open a real Postgres session over WebSocket. This is what lets us use
// interactive, multi-statement transactions (db.transaction(...)) instead of
// being limited to Neon's one-shot HTTP query mode — required for the
// atomic stock operations in server/services/stock.service.ts.
neonConfig.webSocketConstructor = ws;

const connectionString = requireEnv("DATABASE_URL");

// Declared at module scope so warm serverless invocations reuse the same
// pool instead of opening a new database connection per request. A cold
// start creates a fresh pool; Vercel keeps this module cached across
// invocations of the same function instance.
const pool = new Pool({ connectionString, max: 5 });

export const db = drizzle(pool, { schema });
export type Database = typeof db;
/** The transaction handle passed into db.transaction(async (tx) => ...). Services accept `Database | Tx` so the same query helpers work both standalone and inside a transaction. */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
