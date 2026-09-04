import { describe, expect, it } from "vitest";
import { computeLocationStatus, computeOccupancyPercent } from "./locations.service.js";

describe("computeLocationStatus", () => {
  it("is BLOCKED regardless of quantity when blocked is true", () => {
    expect(computeLocationStatus({ blocked: true, quantity: 0, capacity: 100 })).toBe("BLOCKED");
    expect(computeLocationStatus({ blocked: true, quantity: 50, capacity: 100 })).toBe("BLOCKED");
  });

  it("is AVAILABLE when empty and not blocked", () => {
    expect(computeLocationStatus({ blocked: false, quantity: 0, capacity: 100 })).toBe("AVAILABLE");
    expect(computeLocationStatus({ blocked: false, quantity: 0, capacity: null })).toBe("AVAILABLE");
  });

  it("is OCCUPIED when quantity reaches capacity", () => {
    expect(computeLocationStatus({ blocked: false, quantity: 100, capacity: 100 })).toBe("OCCUPIED");
    expect(computeLocationStatus({ blocked: false, quantity: 120, capacity: 100 })).toBe("OCCUPIED");
  });

  it("is PARTIAL otherwise", () => {
    expect(computeLocationStatus({ blocked: false, quantity: 40, capacity: 100 })).toBe("PARTIAL");
  });

  it("is PARTIAL when quantity > 0 and capacity is unlimited", () => {
    expect(computeLocationStatus({ blocked: false, quantity: 40, capacity: null })).toBe("PARTIAL");
  });
});

describe("computeOccupancyPercent", () => {
  it("returns null when capacity is not set", () => {
    expect(computeOccupancyPercent(40, null)).toBeNull();
  });

  it("computes a rounded percentage", () => {
    expect(computeOccupancyPercent(33, 100)).toBe(33);
    expect(computeOccupancyPercent(1, 3)).toBe(33);
  });

  it("caps at 100 even if quantity somehow exceeds capacity", () => {
    expect(computeOccupancyPercent(150, 100)).toBe(100);
  });
});
