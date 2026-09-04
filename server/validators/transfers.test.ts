import { describe, expect, it } from "vitest";
import { createTransferSchema } from "./transfers.js";

describe("createTransferSchema", () => {
  it("accepts a valid transfer", () => {
    const result = createTransferSchema.safeParse({
      itemId: 1,
      sourceLocationId: 2,
      destinationLocationId: 3,
      quantity: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects when source and destination are the same location", () => {
    const result = createTransferSchema.safeParse({
      itemId: 1,
      sourceLocationId: 2,
      destinationLocationId: 2,
      quantity: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero or negative quantity", () => {
    expect(
      createTransferSchema.safeParse({ itemId: 1, sourceLocationId: 2, destinationLocationId: 3, quantity: 0 }).success
    ).toBe(false);
    expect(
      createTransferSchema.safeParse({ itemId: 1, sourceLocationId: 2, destinationLocationId: 3, quantity: -5 }).success
    ).toBe(false);
  });
});
