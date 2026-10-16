import { describe, expect, it } from "vitest";

import { mockRoutes } from "./routes.js";
import { mockUsers, tokenOf } from "./users.js";

const admin = mockUsers[0];
const worker = mockUsers[1]; // a Factory Worker
const sale = mockUsers[2]; // a Sale Worker
const call = (route, who, { body = {}, params = {}, query = {} } = {}) => mockRoutes[route]({ body, authorization: `Bearer ${tokenOf(who)}`, params, query });
const fails = (fn) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("it should have failed");
};

const material = call("POST /materials", admin, { body: { code: "ST-1", name: "Steel", lots: [{ lotNumber: "L1", quantity: 10 }] } }).data;
const change = (extra) => call("POST /materials/:id/stock-changes", admin, { params: { id: material.id }, body: { kind: "Add", lotNumber: "L1", quantity: 1, changeDate: "2026-10-05", note: "", ...extra } });
const history = () => call("GET /materials/:id/stock-changes", worker, { params: { id: material.id } });
const lots = () => call("GET /materials/:id", worker, { params: { id: material.id } }).lots;

describe("stock changes of the mock", () => {
  it("starts the history with the lots a material was made with", () => {
    expect(history()).toMatchObject([{ lotNumber: "L1", kind: "Add", change: 10, balance: 10, note: "Initial stock" }]);
  });

  it("adds to a lot, opens a new lot, deducts, and keeps every change with who and when", () => {
    change({ quantity: 5.5 });
    change({ lotNumber: "L2", quantity: 3 });
    change({ kind: "Deduct", quantity: 2.25, note: "Cutting" });
    expect(lots()).toEqual([{ lotNumber: "L1", quantity: 13.25 }, { lotNumber: "L2", quantity: 3 }]);

    const last = history()[0];
    expect(last).toMatchObject({ kind: "Deduct", change: -2.25, balance: 13.25, lotNumber: "L1", userName: "Admin", note: "Cutting" });
    expect(history()).toHaveLength(4);
  });

  it("refuses a change that would make a lot negative, and leaves the lot as it was", () => {
    const error = fails(() => change({ kind: "Deduct", quantity: 100 }));
    expect(error.status).toBe(409);
    expect(error.details).toEqual([{ path: ["quantity"], code: "STOCK_NEGATIVE" }]);
    expect(lots()[0].quantity).toBe(13.25);
  });

  it("adjusts after a count with a plus or a minus, and the adjustment needs a note", () => {
    expect(fails(() => change({ kind: "Adjust", quantity: -1 })).details).toEqual([{ path: ["note"], code: "REQUIRED" }]);
    change({ kind: "Adjust", quantity: -0.25, note: "Count of October" });
    expect(lots()[0].quantity).toBe(13);
    expect(history()[0]).toMatchObject({ kind: "Adjust", change: -0.25 });
  });

  it("checks the fields", () => {
    expect(fails(() => change({ kind: "Deduct", lotNumber: "NOPE" })).details).toEqual([{ path: ["lotNumber"], code: "LOT_NOT_FOUND" }]);
    expect(fails(() => change({ quantity: -2 })).details).toEqual([{ path: ["quantity"], code: "INVALID" }]);
    expect(fails(() => change({ changeDate: "2026-02-31" })).details).toEqual([{ path: ["changeDate"], code: "INVALID_DATE" }]);
    expect(fails(() => change({ orderId: 9999 })).details).toEqual([{ path: ["orderId"], code: "REQUIRED" }]);
  });

  it("changes the lots only through stock changes, and only for an Admin or a Factory Worker", () => {
    call("PUT /materials/:id", admin, { params: { id: material.id }, body: { code: "ST-1", name: "Steel sheet", lots: [{ lotNumber: "X", quantity: 999 }] } });
    expect(lots().map((lot) => lot.lotNumber)).toEqual(["L1", "L2"]);
    const add = (who) => call("POST /materials/:id/stock-changes", who, { params: { id: material.id }, body: { kind: "Add", lotNumber: "L1", quantity: 1, changeDate: "2026-10-05" } });
    expect(fails(() => add(sale)).status).toBe(403); // a Sale Worker cannot
    expect(add(worker).status).toBe(201); // a Factory Worker can
  });
});
