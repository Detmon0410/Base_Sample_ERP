import { describe, expect, it } from "vitest";

import { mockRoutes } from "./routes.js";
import { mockUsers, tokenOf } from "./users.js";
import { makeOrderRoutes } from "@/test/orders";

// Start production deducts the materials of the BOM by itself (the oldest lot first) and is refused when a material is short.

const admin = mockUsers[0];
const call = (route, who, { body = {}, params = {}, query = {} } = {}) => mockRoutes[route]({ body, authorization: `Bearer ${tokenOf(who)}`, params, query });
const fails = (fn) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("it should have failed");
};

const customer = call("POST /customers", admin, { body: { name: "Start Customer" } }).data;
const qt = call("POST /qt", admin, { body: { qtNumber: "QT-START", qtDate: "2026-10-01", customerId: customer.id } }).data;
const steel = call("POST /materials", admin, { body: { code: "SS-STEEL", name: "Steel", lots: [{ lotNumber: "OLD", quantity: 30 }, { lotNumber: "NEW", quantity: 100 }] } }).data;
const foam = call("POST /materials", admin, { body: { code: "SS-FOAM", name: "Foam", lots: [{ lotNumber: "F1", quantity: 5 }] } }).data;
const product = call("POST /products", admin, { body: { code: "SS-P", name: "Fridge", price: 100, bom: [{ materialId: steel.id, quantity: 4 }, { materialId: foam.id, quantity: 1 }] } }).data;

const order = (quantity) =>
  makeOrderRoutes(call, admin, { qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity, unitPrice: 100, processes: [{ name: "Cut" }] }] }).data;
const lotsOf = (material) => Object.fromEntries(call("GET /materials/:id", admin, { params: { id: material.id } }).lots.map((lot) => [lot.lotNumber, lot.quantity]));

describe("Start production and the stock", () => {
  it("refuses to start when a material is short, and changes nothing", () => {
    const big = order(10); // 40 steel (130 in stock), 10 foam (5 in stock)
    const error = fails(() => call("POST /orders/:id/start", admin, { params: { id: big.id } }));
    expect(error.status).toBe(409);
    expect(error.code).toBe("STOCK_SHORT");
    expect(error.details).toEqual([{ materialId: foam.id, materialCode: "SS-FOAM", materialName: "Foam", need: 10, have: 5 }]);
    expect(call("GET /orders/:id", admin, { params: { id: big.id } }).started).toBe(false);
    expect(lotsOf(steel)).toEqual({ OLD: 30, NEW: 100 });
    expect(lotsOf(foam)).toEqual({ F1: 5 });
  });

  it("deducts the BOM from the oldest lot first, as Deduct movements tied to the order", () => {
    const small = order(10 - 6); // 4 products: 16 steel, 4 foam
    call("POST /orders/:id/start", admin, { params: { id: small.id } });
    expect(lotsOf(steel)).toEqual({ OLD: 14, NEW: 100 });
    expect(lotsOf(foam)).toEqual({ F1: 1 });
    const moves = call("GET /stock-changes", admin, { query: { q: small.orderNumber } }).data;
    expect(moves.map((row) => [row.materialCode, row.kind, row.change, row.lotNumber])).toEqual(expect.arrayContaining([["SS-STEEL", "Deduct", -16, "OLD"], ["SS-FOAM", "Deduct", -4, "F1"]]));
  });

  it("takes from the next lot when the oldest is not enough", () => {
    const more = order(5); // 20 steel: OLD has 14 left, then 6 from NEW; 5 foam is short, so refuse first
    expect(fails(() => call("POST /orders/:id/start", admin, { params: { id: more.id } })).code).toBe("STOCK_SHORT");
    call("POST /materials/:id/stock-changes", admin, { params: { id: foam.id }, body: { kind: "Add", lotNumber: "F1", quantity: 10, changeDate: "2026-10-05" } });
    call("POST /orders/:id/start", admin, { params: { id: more.id } });
    expect(lotsOf(steel)).toEqual({ OLD: 0, NEW: 94 });
    expect(lotsOf(foam)).toEqual({ F1: 6 });
  });
});
