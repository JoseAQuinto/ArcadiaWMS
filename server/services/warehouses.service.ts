import { eq } from "drizzle-orm";
import { db } from "../db";
import { warehouses } from "../db/schema";

export async function listWarehouses() {
  return db.select().from(warehouses).where(eq(warehouses.active, true)).orderBy(warehouses.name);
}
