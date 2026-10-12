import { describe, expect, it } from "vitest";

import { mockRoutes } from "./routes.js";
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
const file = { name: "a.pdf", dataUrl: "data:application/pdf;base64,AA==" };
const exists = (resource, id) => call(`GET /${resource}`, admin, { query: { pageSize: 200 } }).data.some((row) => row.id === id);

describe("delete of master data", () => {
  it("deletes a record nobody uses, and answers 404 for it afterwards", () => {
    const customer = call("POST /customers", admin, { body: { name: "Free" } }).data;
    expect(call("DELETE /customers/:id", admin, { params: { id: customer.id } })).toBeNull();
    expect(exists("customers", customer.id)).toBe(false);
    expect(fails(() => call("DELETE /customers/:id", admin, { params: { id: customer.id } })).status).toBe(404);
  });

  it("is for the Admin only", () => {
    const customer = call("POST /customers", admin, { body: { name: "Kept" } }).data;
    expect(fails(() => call("DELETE /customers/:id", worker, { params: { id: customer.id } })).status).toBe(403);
    expect(exists("customers", customer.id)).toBe(true);
  });

  it("refuses a customer used by a QT reference or an order, and says where", () => {
    const customer = call("POST /customers", admin, { body: { name: "Busy" } }).data;
    const qt = call("POST /qt", admin, { body: { qtNumber: "QT-DEL", qtDate: "2026-10-01", customerId: customer.id, file } }).data;
    const error = fails(() => call("DELETE /customers/:id", admin, { params: { id: customer.id } }));
    expect(error).toMatchObject({ status: 409, code: "IN_USE" });
    expect(error.details).toEqual([{ kind: "qt", count: 1, items: ["QT-DEL"] }]);

    const product = call("POST /products", admin, { body: { code: "DEL-P", name: "P", price: 1 } }).data;
    const order = call("POST /orders", admin, { body: { qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 1, unitPrice: 1, processes: [] }] } }).data;
    expect(fails(() => call("DELETE /customers/:id", admin, { params: { id: customer.id } })).details).toEqual([
      { kind: "qt", count: 1, items: ["QT-DEL"] },
      { kind: "order", count: 1, items: [order.orderNumber] },
    ]);
    expect(exists("customers", customer.id)).toBe(true);

    // the QT reference and the product are used by that order too
    expect(fails(() => call("DELETE /qt/:id", admin, { params: { id: qt.id } })).details).toEqual([{ kind: "order", count: 1, items: [order.orderNumber] }]);
    expect(fails(() => call("DELETE /products/:id", admin, { params: { id: product.id } })).details).toEqual([{ kind: "order", count: 1, items: [order.orderNumber] }]);
  });

  it("lists only the first five names and gives the count", () => {
    const customer = call("POST /customers", admin, { body: { name: "Many" } }).data;
    for (let n = 1; n <= 7; n += 1) call("POST /qt", admin, { body: { qtNumber: `QT-MANY-${n}`, qtDate: "2026-10-01", customerId: customer.id, file } });
    const [place] = fails(() => call("DELETE /customers/:id", admin, { params: { id: customer.id } })).details;
    expect(place).toMatchObject({ kind: "qt", count: 7 });
    expect(place.items).toHaveLength(5);
  });

  it("deletes a product with its BOM, and a QT reference nobody uses", () => {
    const steel = call("POST /materials", admin, { body: { code: "DEL-M", name: "Steel" } }).data;
    const product = call("POST /products", admin, { body: { code: "DEL-P2", name: "P2", price: 1, bom: [{ materialId: steel.id, quantity: 2 }] } }).data;
    const customer = call("POST /customers", admin, { body: { name: "Q" } }).data;
    const qt = call("POST /qt", admin, { body: { qtNumber: "QT-FREE", qtDate: "2026-10-01", customerId: customer.id, file } }).data;
    call("DELETE /qt/:id", admin, { params: { id: qt.id } });
    expect(exists("qt", qt.id)).toBe(false);

    // the BOM of the product holds the material
    expect(fails(() => call("DELETE /materials/:id", admin, { params: { id: steel.id } })).details).toEqual([{ kind: "product", count: 1, items: ["DEL-P2"] }]);
    call("DELETE /products/:id", admin, { params: { id: product.id } });
    expect(exists("products", product.id)).toBe(false);
    call("DELETE /materials/:id", admin, { params: { id: steel.id } }); // now free
    expect(exists("materials", steel.id)).toBe(false);
  });

  it("deletes a material with its first stock, but not one that had a stock change after it", () => {
    const fresh = call("POST /materials", admin, { body: { code: "DEL-M2", name: "Fresh", lots: [{ lotNumber: "L1", quantity: 5 }] } }).data;
    call("DELETE /materials/:id", admin, { params: { id: fresh.id } });
    expect(exists("materials", fresh.id)).toBe(false);

    const used = call("POST /materials", admin, { body: { code: "DEL-M3", name: "Used", lots: [{ lotNumber: "L1", quantity: 5 }] } }).data;
    call("POST /materials/:id/stock-changes", admin, { params: { id: used.id }, body: { kind: "Deduct", lotNumber: "L1", quantity: 1, changeDate: "2026-10-03" } });
    expect(fails(() => call("DELETE /materials/:id", admin, { params: { id: used.id } })).details).toEqual([{ kind: "stockChange", count: 1, items: [expect.any(String)] }]);
    expect(exists("materials", used.id)).toBe(true);
  });

  it("refuses to delete yourself, the last Admin, and a user who recorded something; deletes a new user", () => {
    // (the Admin has recorded stock changes in the tests above, which is a third reason)
    expect(fails(() => call("DELETE /users/:id", admin, { params: { id: admin.id } })).details.map((place) => place.kind)).toEqual(["self", "lastAdmin", "stock"]);

    // with a second Admin the first one is no longer the last, but still cannot delete themselves
    const second = call("POST /users", admin, { body: { name: "Second", department: "Sales", email: "second@x.jp", role: "Admin", password: "secret1" } }).data;
    const secondUser = mockUsers.find((user) => user.id === second.id);
    expect(fails(() => call("DELETE /users/:id", admin, { params: { id: admin.id } })).details.map((place) => place.kind)).toEqual(["self", "stock"]);

    // the Admin recorded stock changes, so the second Admin cannot delete them
    const material = call("POST /materials", admin, { body: { code: "DEL-M4", name: "By admin", lots: [{ lotNumber: "L1", quantity: 1 }] } }).data;
    call("POST /materials/:id/stock-changes", admin, { params: { id: material.id }, body: { kind: "Add", lotNumber: "L1", quantity: 1, changeDate: "2026-10-03" } });
    expect(fails(() => call("DELETE /users/:id", secondUser, { params: { id: admin.id } })).details.map((place) => place.kind)).toEqual(["stock"]);

    // the Worker recorded a progress update, so they cannot be deleted either
    const customer = call("POST /customers", admin, { body: { name: "For progress" } }).data;
    const qt = call("POST /qt", admin, { body: { qtNumber: "QT-USER", qtDate: "2026-10-01", customerId: customer.id, file } }).data;
    const product = call("POST /products", admin, { body: { code: "DEL-P3", name: "P3", price: 1 } }).data;
    const order = call("POST /orders", admin, { body: { qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 2, unitPrice: 1, processes: [{ name: "Cut" }] }] } }).data;
    call("POST /orders/:id/start", admin, { params: { id: order.id } });
    call("POST /orders/:id/progress", worker, { params: { id: order.id }, body: { processId: order.lines[0].processes[0].id, status: "Completed", completedQuantity: 2, workDate: "2026-10-03" } });
    expect(fails(() => call("DELETE /users/:id", admin, { params: { id: worker.id } })).details.map((place) => place.kind)).toEqual(["progress"]);

    // a user who recorded nothing is deleted, and can no longer sign in
    call("DELETE /users/:id", admin, { params: { id: second.id } });
    expect(exists("users", second.id)).toBe(false);
  });
});
