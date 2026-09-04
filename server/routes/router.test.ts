import { describe, expect, it } from "vitest";
import { matchRoute, pathSegments } from "./router";

/**
 * The whole API is dispatched by this table, so a typo in a pattern would take
 * an endpoint down silently. These tests pin the URL shapes the frontend calls.
 */
describe("pathSegments", () => {
  it.each([
    ["/api/items", ["items"]],
    ["/api/items/42", ["items", "42"]],
    ["/api/receipts/4/receive", ["receipts", "4", "receive"]],
    ["/api/stock/item/7", ["stock", "item", "7"]],
    ["/api/items?page=2&pageSize=50", ["items"]],
    ["/api/locations/", ["locations"]],
    ["/api/outbound-orders/12/pick", ["outbound-orders", "12", "pick"]],
  ])("splits %s", (url, expected) => {
    expect(pathSegments(url)).toEqual(expected);
  });

  it("survives a missing url", () => {
    expect(pathSegments(undefined)).toEqual([]);
  });
});

describe("matchRoute", () => {
  it.each([
    ["auth/login", ["auth", "login"]],
    ["auth/me", ["auth", "me"]],
    ["items", ["items"]],
    ["categories", ["categories"]],
    ["warehouses", ["warehouses"]],
    ["locations", ["locations"]],
    ["stock", ["stock"]],
    ["receipts", ["receipts"]],
    ["outbound-orders", ["outbound-orders"]],
    ["transfers", ["transfers"]],
    ["adjustments", ["adjustments"]],
    ["movements", ["movements"]],
    ["dashboard", ["dashboard"]],
  ])("resolves the static route %s", (_label, segments) => {
    expect(matchRoute(segments)).not.toBeNull();
  });

  it.each([
    [["items", "42"], { id: "42" }],
    [["categories", "3"], { id: "3" }],
    [["locations", "9"], { id: "9" }],
    [["receipts", "4"], { id: "4" }],
    [["receipts", "4", "receive"], { id: "4" }],
    [["outbound-orders", "12"], { id: "12" }],
    [["outbound-orders", "12", "pick"], { id: "12" }],
    [["stock", "item", "7"], { id: "7" }],
  ])("captures the id from %j", (segments, params) => {
    expect(matchRoute(segments)?.params).toEqual(params);
  });

  it("does not confuse a nested route with its parent", () => {
    const detail = matchRoute(["receipts", "4"]);
    const receive = matchRoute(["receipts", "4", "receive"]);
    expect(detail).not.toBeNull();
    expect(receive).not.toBeNull();
    expect(detail?.handler).not.toBe(receive?.handler);
  });

  it("prefers the literal segment over the parameter", () => {
    // "stock/item/:id" must not be swallowed by a hypothetical "stock/:id/..."
    expect(matchRoute(["stock", "item", "7"])?.params).toEqual({ id: "7" });
  });

  it.each([
    [[]],
    [["nope"]],
    [["items", "42", "extra"]],
    [["auth"]],
    [["auth", "login", "extra"]],
    [["stock", "location", "3"]],
  ])("returns null for an unknown path %j", (segments) => {
    expect(matchRoute(segments)).toBeNull();
  });

  it("every route resolves to a callable handler", () => {
    for (const segments of [["items"], ["items", "1"], ["dashboard"], ["receipts", "1", "receive"]]) {
      expect(typeof matchRoute(segments)?.handler).toBe("function");
    }
  });
});
