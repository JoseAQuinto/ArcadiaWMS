import { describe, expect, it } from "vitest";
import { createAdjustmentSchema } from "./adjustments.js";

describe("createAdjustmentSchema", () => {
  it("accepts a valid decrement adjustment", () => {
    const result = createAdjustmentSchema.safeParse({
      itemId: 1,
      locationId: 2,
      direction: "DECREMENT",
      quantity: 3,
      reason: "DAMAGE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid reason", () => {
    const result = createAdjustmentSchema.safeParse({
      itemId: 1,
      locationId: 2,
      direction: "DECREMENT",
      quantity: 3,
      reason: "BECAUSE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive quantity", () => {
    const result = createAdjustmentSchema.safeParse({
      itemId: 1,
      locationId: 2,
      direction: "INCREMENT",
      quantity: 0,
      reason: "OTHER",
    });
    expect(result.success).toBe(false);
  });
});
