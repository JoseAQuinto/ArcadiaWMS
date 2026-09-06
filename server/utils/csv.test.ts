import { describe, expect, it } from "vitest";
import { csvFilename, toCsv } from "./csv.js";

describe("toCsv", () => {
  it("writes a BOM and joins cells with semicolons", () => {
    const csv = toCsv(["a", "b"], [[1, 2]]);
    expect(csv).toBe("﻿a;b\r\n1;2\r\n");
  });

  it("quotes cells containing the delimiter, quotes or newlines", () => {
    const csv = toCsv(["notes"], [['dice "hola"'], ["a;b"], ["dos\nlineas"]]);
    expect(csv).toContain('"dice ""hola"""');
    expect(csv).toContain('"a;b"');
    expect(csv).toContain('"dos\nlineas"');
  });

  it("renders empty cells for null and undefined", () => {
    expect(toCsv(["a", "b"], [[null, undefined]])).toBe("﻿a;b\r\n;\r\n");
  });

  it("serialises dates as ISO strings", () => {
    expect(toCsv(["at"], [[new Date("2025-03-01T10:00:00.000Z")]])).toContain("2025-03-01T10:00:00.000Z");
  });
});

describe("csvFilename", () => {
  it("stamps the date on the prefix", () => {
    expect(csvFilename("movimientos", new Date("2025-03-01T10:00:00.000Z"))).toBe("movimientos-2025-03-01.csv");
  });
});
