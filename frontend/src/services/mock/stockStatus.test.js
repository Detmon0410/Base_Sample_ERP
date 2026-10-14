import { describe, expect, it } from "vitest";

import { mockRoutes } from "./routes.js";
import { stockStatusOf, totalOf } from "./stockStatus.js";
import { mockUsers, tokenOf } from "./users.js";

const admin = mockUsers[0];
const worker = mockUsers[1];
const call = (route, who, { body = {}, params = {}, query = {} } = {}) => mockRoutes[route]({ body, authorization: `Bearer ${tokenOf(who)}`, params, query });
const fails = (fn) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("it should have failed");
};

describe("the stock status of a material (one function)", () => {
  const material = (minLevel, ...quantities) => ({ minLevel, lots: quantities.map((quantity, index) => ({ lotNumber: `L${index}`, quantity })) });

  it("is Out at a total of 0, Low at or below the minimum level, Normal above it", () => {
    expect(stockStatusOf(material(10, 0))).toBe("Out");
    expect(stockStatusOf(material(10, 4, 6))).toBe("Low"); // the total of the lots is 10: equal to the minimum
    expect(stockStatusOf(material(10, 3))).toBe("Low");
    expect(stockStatusOf(material(10, 10, 0.001))).toBe("Normal");
    expect(stockStatusOf(material(0, 0))).toBe("Out");
    expect(stockStatusOf(material(0, 1))).toBe("Normal");
  });

  it("has no status without a minimum level, and no lots is a total of 0", () => {
    expect(stockStatusOf(material(null, 0))).toBeNull();
    expect(stockStatusOf(material(undefined, 5))).toBeNull();
    expect(totalOf(material(null))).toBe(0);
    expect(stockStatusOf(material(5))).toBe("Out");
    expect(totalOf(material(null, 0.1, 0.2))).toBe(0.3); // no floating point noise
  });
});

describe("the minimum level on the materials of the mock", () => {
  const make = (code, minLevel, quantity) => call("POST /materials", admin, { body: { code, name: code, minLevel, lots: quantity === undefined ? [] : [{ lotNumber: "L", quantity }] } }).data;

  it("is optional, is checked, and comes back with the total and the status", () => {
    const none = make("ST-NONE", "", 5);
    expect(none).toMatchObject({ minLevel: null, total: 5, stockStatus: null });
    expect(make("ST-NUM", "12.5", 5)).toMatchObject({ minLevel: 12.5, total: 5, stockStatus: "Low" });
    expect(fails(() => make("ST-BAD", -1, 1)).details).toEqual([{ path: ["minLevel"], code: "INVALID" }]);
    expect(fails(() => make("ST-TXT", "lots", 1)).details).toEqual([{ path: ["minLevel"], code: "INVALID" }]);

    // a change of the minimum level on an existing material keeps its lots
    const made = make("ST-EDIT", 1, 5);
    const edited = call("PUT /materials/:id", admin, { params: { id: made.id }, body: { code: "ST-EDIT", name: "ST-EDIT", minLevel: 50 } });
    expect(edited).toMatchObject({ minLevel: 50, total: 5, stockStatus: "Low" });
    expect(edited.lots).toEqual([{ lotNumber: "L", quantity: 5 }]);
  });

  it("follows the stock changes: Normal, then Low after a deduction, then Out", () => {
    const made = make("ST-FLOW", 10, 30);
    const status = () => call("GET /materials/:id", worker, { params: { id: made.id } }).stockStatus;
    const deduct = (quantity) => call("POST /materials/:id/stock-changes", admin, { params: { id: made.id }, body: { kind: "Deduct", lotNumber: "L", quantity, changeDate: "2026-10-05" } });
    expect(status()).toBe("Normal");
    expect(deduct(20).data.stockStatus).toBe("Low"); // 10 left: equal to the minimum
    deduct(10);
    expect(status()).toBe("Out");
  });

  it("filters the list by the status", () => {
    make("ST-F-NORMAL", 1, 100);
    make("ST-F-LOW", 100, 3);
    make("ST-F-OUT", 5, 0);
    expect(call("GET /materials", admin, { query: { status: "Low", q: "ST-F-" } }).data.map((row) => row.code)).toEqual(["ST-F-LOW"]);
    expect(call("GET /materials", admin, { query: { status: "Out", q: "ST-F-" } }).data.map((row) => row.code)).toEqual(["ST-F-OUT"]);
    expect(call("GET /materials", admin, { query: { status: "Normal", q: "ST-F-" } }).data.map((row) => row.code)).toEqual(["ST-F-NORMAL"]);

  });
});
