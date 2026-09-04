import { sql } from "drizzle-orm";
import type { Database, Tx } from "../db/index.js";

async function nextFromSequence(executor: Database | Tx, sequence: string): Promise<number> {
  const result = await executor.execute(sql.raw(`SELECT nextval('${sequence}') AS value`));
  const rows = result.rows as Array<{ value: string }>;
  return Number(rows[0]?.value);
}

export async function nextReceiptCode(executor: Database | Tx): Promise<string> {
  const value = await nextFromSequence(executor, "receipt_code_seq");
  return `REC-${String(value).padStart(6, "0")}`;
}

export async function nextOutboundCode(executor: Database | Tx): Promise<string> {
  const value = await nextFromSequence(executor, "outbound_code_seq");
  return `SAL-${String(value).padStart(6, "0")}`;
}
