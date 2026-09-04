import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { warehouses } from "../db/schema.js";

export async function listWarehouses() {
  return db.select().from(warehouses).where(eq(warehouses.active, true)).orderBy(warehouses.name);
}
