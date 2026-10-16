import { describe, expect, it } from "vitest";

import { mockRoutes } from "./routes.js";
import { mockUsers, tokenOf } from "./users.js";
import { makeOrderRoutes } from "@/test/orders";

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
const list = (query, who = admin) => call("GET /stock-changes", who, { query });
const change = (material, extra) => call("POST /materials/:id/stock-changes", admin, { params: { id: material.id }, body: { kind: "Add", lotNumber: "L1", quantity: 1, changeDate: "2099-10-05", note: "", ...extra } });

describe("GET /stock-changes of the mock: the movements of every material", () => {
  const steel = call("POST /materials", admin, { body: { code: "MV-STEEL", name: "Steel sheet", lots: [{ lotNumber: "L1", quantity: 100 }] } }).data;
  const foam = call("POST /materials", admin, { body: { code: "MV-FOAM", name: "Foam", lots: [{ lotNumber: "F1", quantity: 10 }] } }).data;
  const customer = call("POST /customers", admin, { body: { name: "Movements" } }).data;
  const product = call("POST /products", admin, { body: { code: "MV-P", name: "P", price: 1 } }).data;
  const qt = call("POST /qt", admin, { body: { qtNumber: "QT-MV", qtDate: "2026-10-01", customerId: customer.id, file: { name: "a.pdf", dataUrl: "data:application/pdf;base64,AA==" } } }).data;
  const order = makeOrderRoutes(call, admin, { qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 1, unitPrice: 1, processes: [] }] }).data;

  change(steel, { kind: "Deduct", quantity: 25, changeDate: "2099-10-03", note: "Cutting", orderId: order.id });
  change(foam, { kind: "Add", lotNumber: "F1", quantity: 5, changeDate: "2099-10-07" });
  change(steel, { kind: "Adjust", quantity: -2, changeDate: "2099-10-05", note: "Count of the week" });

  it("lists the changes of all materials together, with the material, newest date first, and a Worker may read it", () => {
    const { data, meta } = list({});
    expect(meta.total).toBe(5); // two first stocks and three changes
    expect(data.map((row) => [row.changeDate, row.materialCode, row.kind])).toEqual([
      ["2099-10-07", "MV-FOAM", "Add"],
      ["2099-10-05", "MV-STEEL", "Adjust"],
      ["2099-10-03", "MV-STEEL", "Deduct"],
      [data[3].changeDate, data[3].materialCode, "Add"], // the first stocks carry the day they were made
      [data[4].changeDate, data[4].materialCode, "Add"],
    ]);
    expect(data[2]).toMatchObject({ materialName: "Steel sheet", lotNumber: "L1", change: -25, balance: 75, orderNumber: order.orderNumber, userName: "Admin" });
    expect(list({}, worker).meta.total).toBe(5);
  });

  it("searches by material code or name, lot, production order and note", () => {
    expect(list({ q: "foam" }).data.map((row) => row.materialCode)).toEqual(["MV-FOAM", "MV-FOAM"]);
    expect(list({ q: "mv-steel" }).meta.total).toBe(3);
    expect(list({ q: "F1" }).meta.total).toBe(2);
    expect(list({ q: order.orderNumber }).data.map((row) => row.kind)).toEqual(["Deduct"]);
    expect(list({ q: "count of" }).data.map((row) => row.kind)).toEqual(["Adjust"]);
    expect(list({ q: "nothing like this" }).meta.total).toBe(0);
  });

  it("filters by type and by the date of the change, both ends included", () => {
    expect(list({ type: "Deduct" }).meta.total).toBe(1);
    expect(list({ type: "Add" }).meta.total).toBe(3);
    expect(list({ from: "2099-10-05" }).data.map((row) => row.kind)).toEqual(["Add", "Adjust"]);
    expect(list({ from: "2099-10-03", to: "2099-10-05" }).data.map((row) => row.kind)).toEqual(["Adjust", "Deduct"]);
    expect(list({ type: "Adjust", from: "2099-10-06" }).meta.total).toBe(0);
  });

  it("refuses a type that does not exist and a date that is not a day", () => {
    expect(fails(() => list({ type: "Steal" })).details).toEqual([{ path: ["type"], code: "INVALID" }]);
    expect(fails(() => list({ from: "2026-02-31" })).details).toEqual([{ path: ["from"], code: "INVALID_DATE" }]);
    expect(fails(() => list({ to: "tomorrow" })).details).toEqual([{ path: ["to"], code: "INVALID_DATE" }]);
  });

  it("pages the list, and forgets the changes of a material that was deleted", () => {
    expect(list({ pageSize: 2, page: 1 }).data).toHaveLength(2);
    expect(list({ pageSize: 2, page: 3 }).data).toHaveLength(1);
    expect(list({ pageSize: 2 }).meta).toEqual({ page: 1, pageSize: 2, total: 5 });

    const fresh = call("POST /materials", admin, { body: { code: "MV-GONE", name: "Gone", lots: [{ lotNumber: "G", quantity: 1 }] } }).data;
    expect(list({ q: "MV-GONE" }).meta.total).toBe(1); // its first stock
    call("DELETE /materials/:id", admin, { params: { id: fresh.id } });
    expect(list({ q: "MV-GONE" }).meta.total).toBe(0);
  });
});
