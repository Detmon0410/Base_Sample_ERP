import { describe, expect, it } from "vitest";

import { mockRoutes } from "./routes.js";
import { mockUsers, tokenOf } from "./users.js";

const admin = mockUsers[0];
const factory = mockUsers[1];
const sale = mockUsers[2];
const call = (route, who, { body = {}, params = {}, query = {} } = {}) => mockRoutes[route]({ body, authorization: `Bearer ${tokenOf(who)}`, params, query });
const fails = (fn) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("it should have failed");
};

const PDF = { name: "po-77.pdf", dataUrl: "data:application/pdf;base64,JVBERi0xLjQ=" };

describe("QT references of the mock (QT 2.0)", () => {
  const customer = call("POST /customers", admin, { body: { name: "QT Customer", address: "1 Main Street" } }).data;
  const fridge = call("POST /products", admin, { body: { code: "QT-FR", name: "Fridge", price: 45000 } }).data;
  const door = call("POST /products", admin, { body: { code: "QT-DR", name: "Door", price: 9000 } }).data;
  const lines = () => [
    { productId: fridge.id, quantity: 10, unitPrice: 45000 },
    { productId: door.id, quantity: 4, unitPrice: 9000 },
  ];
  const body = (extra = {}) => ({ qtNumber: "QT-001", qtDate: "2026-10-01", customerId: customer.id, notes: "first", lines: lines(), ...extra });
  const make = (extra) => call("POST /qt", sale, { body: body(extra) }).data;

  it("saves a Draft with its lines, the amounts and the total, and lists it without the lines", () => {
    const made = make();
    expect(made).toMatchObject({ qtNumber: "QT-001", customerName: "QT Customer", status: "Draft", total: 486000, productionOrderId: null, productionOrderNumber: null });
    expect(made.lines).toEqual([
      { productId: fridge.id, quantity: 10, unitPrice: 45000, productCode: "QT-FR", productName: "Fridge", amount: 450000 },
      { productId: door.id, quantity: 4, unitPrice: 9000, productCode: "QT-DR", productName: "Door", amount: 36000 },
    ]);
    const row = call("GET /qt", sale, { query: { q: "qt customer" } }).data[0];
    expect(row).toMatchObject({ status: "Draft", total: 486000 });
    expect(row.lines).toBeUndefined();
    expect(row.file).toBeUndefined(); // the files are attachments now
  });

  it("keeps the QT number unique and checks the date, the customer, the PO date and the lines", () => {
    expect(fails(() => make({ qtNumber: "qt-001" })).status).toBe(409);
    expect(fails(() => make({ qtNumber: "QT-2", qtDate: "2026-02-30" })).details).toEqual([{ path: ["qtDate"], code: "INVALID_DATE" }]);
    expect(fails(() => make({ qtNumber: "QT-3", customerId: 999 })).details).toEqual([{ path: ["customerId"], code: "REQUIRED" }]);
    expect(fails(() => make({ qtNumber: "QT-4", customerPoDate: "2026-13-01" })).details).toEqual([{ path: ["customerPoDate"], code: "INVALID_DATE" }]);
    const issues = fails(() => make({ qtNumber: "QT-5", lines: [{ productId: 999, quantity: 0, unitPrice: -1 }] })).details;
    expect(issues.map((item) => `${item.path.join(".")}:${item.code}`)).toEqual(["lines.0.productId:REQUIRED", "lines.0.quantity:INVALID", "lines.0.unitPrice:INVALID"]);
    expect(fails(() => make({ qtNumber: "QT-6", lines: [lines()[0], lines()[0]] })).details).toEqual([{ path: ["lines"], code: "DUPLICATE" }]);
  });

  it("changes a Draft freely, also to no lines at all", () => {
    const made = make({ qtNumber: "QT-DRAFT" });
    const changed = call("PUT /qt/:id", sale, { params: { id: made.id }, body: body({ qtNumber: "QT-DRAFT", notes: "second", customerPoNumber: "PO-9", customerPoDate: "2026-10-05", lines: [lines()[1]] }) });
    expect(changed).toMatchObject({ notes: "second", customerPoNumber: "PO-9", customerPoDate: "2026-10-05", total: 36000 });
    expect(call("PUT /qt/:id", sale, { params: { id: made.id }, body: body({ qtNumber: "QT-DRAFT", lines: [] }) }).total).toBe(0);
  });

  it("confirms once: the QT is Confirmed, one Draft order is made from its lines, and a second Confirm shows the same order", () => {
    const made = make({ qtNumber: "QT-CONFIRM", customerPoNumber: "PO-77", customerPoDate: "2026-10-03" });
    call("POST /attachments", sale, { body: { ownerType: "QtReference", ownerId: made.id, kind: "PO_FILE", file: PDF } });

    const result = call("POST /qt/:id/confirm", sale, { params: { id: made.id } });
    expect(result.alreadyConfirmed).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.qt).toMatchObject({ status: "Confirmed", productionOrderId: result.order.id, productionOrderNumber: result.order.orderNumber });
    expect(result.order).toMatchObject({ status: "Draft", qtId: made.id, qtNumber: "QT-CONFIRM", customerId: customer.id, customerPoNumber: "PO-77", started: false });
    expect(result.order.lines.map((line) => [line.productId, line.quantity, line.unitPrice, line.processes])).toEqual([
      [fridge.id, 10, 45000, []],
      [door.id, 4, 9000, []],
    ]); // the prices come along; the processes are added next

    // the PO of the customer is on the order too, for everybody who reads the order
    const copy = call("GET /attachments", factory, { query: { ownerType: "ProductionOrder", ownerId: result.order.id } });
    expect(copy.map((row) => [row.kind, row.fileName])).toEqual([["PO_FILE", "po-77.pdf"]]);

    const again = call("POST /qt/:id/confirm", sale, { params: { id: made.id } });
    expect(again.alreadyConfirmed).toBe(true);
    expect(again.order.id).toBe(result.order.id);
    expect(call("GET /orders", admin, { query: { q: "QT-CONFIRM" } }).meta.total).toBe(1);
  });

  it("warns, and does not stop, when the customer's PO file is missing; and needs a line", () => {
    const empty = make({ qtNumber: "QT-EMPTY", lines: [] });
    expect(fails(() => call("POST /qt/:id/confirm", sale, { params: { id: empty.id } })).details).toEqual([{ path: ["lines"], code: "REQUIRED" }]);
    const made = make({ qtNumber: "QT-NOPO" });
    expect(call("POST /qt/:id/confirm", sale, { params: { id: made.id } }).warnings).toEqual(["NO_PO_FILE"]);
  });

  it("locks the customer and the lines of a confirmed QT, lets the rest and the files change, and does not delete it", () => {
    const made = make({ qtNumber: "QT-LOCK" });
    call("POST /qt/:id/confirm", sale, { params: { id: made.id } });

    expect(fails(() => call("PUT /qt/:id", sale, { params: { id: made.id }, body: body({ qtNumber: "QT-LOCK", lines: [lines()[0]] }) })).code).toBe("QT_LOCKED");
    const other = call("POST /customers", admin, { body: { name: "Other Customer" } }).data;
    expect(fails(() => call("PUT /qt/:id", sale, { params: { id: made.id }, body: body({ qtNumber: "QT-LOCK", customerId: other.id }) })).code).toBe("QT_LOCKED");
    expect(call("PUT /qt/:id", sale, { params: { id: made.id }, body: body({ qtNumber: "QT-LOCK", notes: "still can", customerPoNumber: "PO-LATE" }) })).toMatchObject({ notes: "still can", customerPoNumber: "PO-LATE", status: "Confirmed" });

    // a PO file that comes later reaches the order too
    call("POST /attachments", sale, { body: { ownerType: "QtReference", ownerId: made.id, kind: "PO_FILE", file: PDF } });
    const orderId = call("GET /qt/:id", sale, { params: { id: made.id } }).productionOrderId;
    expect(call("GET /attachments", admin, { query: { ownerType: "ProductionOrder", ownerId: orderId } }).map((row) => row.kind)).toEqual(["PO_FILE"]);

    const error = fails(() => call("DELETE /qt/:id", sale, { params: { id: made.id } }));
    expect(error).toMatchObject({ status: 409, code: "IN_USE" });
    expect(error.details[0]).toMatchObject({ kind: "order", count: 1 });
  });

  it("deletes a Draft with its files", () => {
    const made = make({ qtNumber: "QT-GONE" });
    const file = call("POST /attachments", sale, { body: { ownerType: "QtReference", ownerId: made.id, kind: "OTHER", file: PDF } }).data;
    expect(call("DELETE /qt/:id", sale, { params: { id: made.id } })).toBeNull();
    expect(fails(() => call("GET /attachments/:id", admin, { params: { id: file.id } })).status).toBe(404);
  });

  it("is for the Admin and the Sale Worker, not for a Factory Worker", () => {
    expect(fails(() => call("GET /qt", factory)).status).toBe(403);
    expect(fails(() => call("POST /qt", factory, { body: body({ qtNumber: "QT-9" }) })).status).toBe(403);
    const made = make({ qtNumber: "QT-ADMIN" });
    expect(fails(() => call("POST /qt/:id/confirm", factory, { params: { id: made.id } })).status).toBe(403);
    expect(call("POST /qt/:id/confirm", admin, { params: { id: made.id } }).qt.status).toBe("Confirmed");
  });
});
