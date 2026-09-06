/**
 * Minimal RFC 4180-style CSV serialisation.
 *
 * The delimiter is ";" and the file is prefixed with a UTF-8 BOM on purpose:
 * the whole app is in Spanish and Excel under a Spanish locale uses ";" as its
 * list separator and needs the BOM to read accents correctly. With "," and no
 * BOM the export opens as a single mangled column, which is exactly the kind of
 * detail that makes people stop trusting an export.
 */
const DELIMITER = ";";
const BOM = "﻿";

export type CsvValue = string | number | boolean | Date | null | undefined;

function escapeValue(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const raw = value instanceof Date ? value.toISOString() : String(value);
  if (raw.includes(DELIMITER) || raw.includes('"') || raw.includes("\n") || raw.includes("\r")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

/** Builds a CSV document from a header row and its data rows, CRLF-terminated. */
export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeValue).join(DELIMITER));
  return BOM + lines.join("\r\n") + "\r\n";
}

/** Filenames are user-visible; keep them predictable and free of anything a browser or OS would choke on. */
export function csvFilename(prefix: string, date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  return `${prefix}-${stamp}.csv`;
}
