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
const codes = (error) => error.details.map((item) => `${item.path.join(".")}:${item.code}`);

// materials and suppliers
const steel = call("POST /materials", admin, { body: { code: "PU-STEEL", name: "Steel sheet", unit: "kg", minLevel: 50, lots: [{ lotNumber: "L1", quantity: 20 }] } }).data;
const foam = call("POST /materials", admin, { body: { code: "PU-FOAM", name: "Foam", minLevel: 10 } }).data; // no unit given: pcs
const bolts = call("POST /materials", admin, { body: { code: "PU-BOLT", name: "Bolts" } }).data;
const acme = call("POST /suppliers", admin, { body: { code: "SUP-ACME", name: "Acme Steel", contact: "Mr. Ito", address: "1 Steel Road", items: [{ materialId: steel.id, unitPrice: 300 }, { materialId: foam.id, unitPrice: 1200 }] } }).data;
const poBody = (extra = {}) => ({ supplierId: acme.id, requiredDate: "2026-11-01", department: "Factory", notes: "urgent", lines: [{ materialId: steel.id, quantity: 100, unitPrice: 300 }, { materialId: foam.id, quantity: 5, unitPrice: 1200 }], ...extra });
const makePo = (extra) => call("POST /purchase-orders", factory, { body: poBody(extra) }).data;
const lotsOf = (material) => Object.fromEntries(call("GET /materials/:id", admin, { params: { id: material.id } }).lots.map((lot) => [lot.lotNumber, lot.quantity]));

describe("suppliers of the mock", () => {
  it("keeps a supplier with its items, active by default, and a unit on every material", () => {
    expect(acme).toMatchObject({ code: "SUP-ACME", active: true });
    expect(acme.items).toEqual([
      { materialId: steel.id, unitPrice: 300, materialCode: "PU-STEEL", materialName: "Steel sheet", unit: "kg" },
      { materialId: foam.id, unitPrice: 1200, materialCode: "PU-FOAM", materialName: "Foam", unit: "pcs" },
    ]);
    expect(foam.unit).toBe("pcs");
    const row = call("GET /suppliers", factory, { query: { q: "acme" } }).data[0];
    expect(row).toMatchObject({ code: "SUP-ACME", itemCount: 2 });
    expect(row.items).toBeUndefined();
  });

  it("checks the code, the items and the price, and filters by active", () => {
    expect(fails(() => call("POST /suppliers", admin, { body: { code: "sup-acme", name: "Again" } })).status).toBe(409);
    expect(codes(fails(() => call("POST /suppliers", admin, { body: { code: "", name: "", items: [{ materialId: 999, unitPrice: 1.5 }] } })))).toEqual(["code:REQUIRED", "name:REQUIRED", "items.0.materialId:REQUIRED", "items.0.unitPrice:INVALID"]);
    expect(codes(fails(() => call("POST /suppliers", admin, { body: { code: "SUP-D", name: "Dup", items: [{ materialId: steel.id, unitPrice: 1 }, { materialId: steel.id, unitPrice: 2 }] } })))).toEqual(["items:DUPLICATE"]);
    const off = call("POST /suppliers", admin, { body: { code: "SUP-OFF", name: "Closed", active: false } }).data;
    expect(off.active).toBe(false);
    expect(call("GET /suppliers", admin, { query: { active: "true", q: "SUP-" } }).data.map((row) => row.code)).toEqual(["SUP-ACME"]);
    expect(call("GET /suppliers", admin, { query: { active: "false", q: "SUP-" } }).data.map((row) => row.code)).toEqual(["SUP-OFF"]);
  });

  it("is the Admin's to change, a Factory Worker's to look at", () => {
    expect(fails(() => call("POST /suppliers", factory, { body: { code: "X", name: "X" } })).status).toBe(403);
    expect(call("GET /suppliers/:id", factory, { params: { id: acme.id } }).code).toBe("SUP-ACME");
    expect(fails(() => call("GET /suppliers", sale)).status).toBe(403);
  });
});

describe("purchase orders of the mock", () => {
  it("makes a Draft numbered PO-year-0001 with the prices of the lines and the total", () => {
    const year = new Date().getFullYear();
    const po = makePo();
    expect(po.poNumber).toMatch(new RegExp(`^PO-${year}-\\d{4}$`));
    expect(po).toMatchObject({ status: "Draft", supplierName: "Acme Steel", supplierAddress: "1 Steel Road", department: "Factory", requiredDate: "2026-11-01", total: 36000, paid: false, payment: null, receivedAt: null, createdByName: "Worker" });
    expect(po.lines.map((line) => [line.materialCode, line.unit, line.quantity, line.unitPrice, line.amount, line.lotNumber])).toEqual([
      ["PU-STEEL", "kg", 100, 300, 30000, null],
      ["PU-FOAM", "pcs", 5, 1200, 6000, null],
    ]);
    const second = makePo();
    expect(Number(second.poNumber.slice(-4))).toBe(Number(po.poNumber.slice(-4)) + 1);
    const list = call("GET /purchase-orders", factory, { query: { q: "acme", status: "Draft" } });
    expect(list.meta.total).toBeGreaterThanOrEqual(2);
    expect(list.data[0].lines).toBeUndefined();
  });

  it("checks the PO: an active supplier, the date, the department, lines of the supplier, no duplicate", () => {
    const off = call("POST /suppliers", admin, { body: { code: "SUP-OFF2", name: "Closed 2", active: false, items: [{ materialId: bolts.id, unitPrice: 5 }] } }).data;
    expect(codes(fails(() => makePo({ supplierId: off.id, lines: [{ materialId: bolts.id, quantity: 1, unitPrice: 5 }] })))).toEqual(["supplierId:SUPPLIER_INACTIVE"]);
    expect(codes(fails(() => makePo({ supplierId: 999, requiredDate: "2026-02-30", department: "Kitchen", lines: [] })))).toEqual(["supplierId:REQUIRED", "requiredDate:INVALID_DATE", "department:INVALID", "lines:REQUIRED"]);
    expect(codes(fails(() => makePo({ lines: [{ materialId: bolts.id, quantity: 1, unitPrice: 5 }] })))).toEqual(["lines.0.materialId:NOT_SOLD_BY_SUPPLIER"]);
    expect(codes(fails(() => makePo({ lines: [{ materialId: steel.id, quantity: 0, unitPrice: 1.5 }] })))).toEqual(["lines.0.quantity:INVALID", "lines.0.unitPrice:INVALID"]);
    expect(codes(fails(() => makePo({ lines: [{ materialId: steel.id, quantity: 1, unitPrice: 1 }, { materialId: steel.id, quantity: 2, unitPrice: 1 }] })))).toEqual(["lines:DUPLICATE"]);
  });

  it("changes and deletes a Draft only; its files go with it", () => {
    const po = makePo();
    const changed = call("PUT /purchase-orders/:id", factory, { params: { id: po.id }, body: poBody({ notes: "changed", lines: [{ materialId: foam.id, quantity: 2, unitPrice: 1000 }] }) });
    expect(changed).toMatchObject({ notes: "changed", total: 2000 });
    const file = call("POST /attachments", factory, { body: { ownerType: "PurchaseOrder", ownerId: po.id, kind: "PO_FILE", file: { name: "po.pdf", dataUrl: "data:application/pdf;base64,AAAA" } } }).data;
    expect(call("DELETE /purchase-orders/:id", factory, { params: { id: po.id } })).toBeNull();
    expect(fails(() => call("GET /attachments/:id", admin, { params: { id: file.id } })).status).toBe(404);

    const sent = makePo();
    call("POST /purchase-orders/:id/status", factory, { params: { id: sent.id }, body: { status: "Sent" } });
    expect(fails(() => call("PUT /purchase-orders/:id", factory, { params: { id: sent.id }, body: poBody() })).code).toBe("PO_LOCKED");
    expect(fails(() => call("DELETE /purchase-orders/:id", factory, { params: { id: sent.id } })).code).toBe("PO_LOCKED");
  });

  it("moves the status one step forward by hand, and no other way", () => {
    const po = makePo();
    const move = (status, extra = {}) => call("POST /purchase-orders/:id/status", factory, { params: { id: po.id }, body: { status, ...extra } });
    expect(fails(() => move("Received")).code).toBe("INVALID_STATUS_CHANGE"); // not past Sent
    expect(fails(() => move("Draft")).code).toBe("INVALID_STATUS_CHANGE");
    expect(fails(() => move("Cancelled")).details).toEqual([{ path: ["status"], code: "INVALID" }]);
    expect(move("Sent").status).toBe("Sent");
    expect(fails(() => move("Sent")).code).toBe("INVALID_STATUS_CHANGE");
    expect(lotsOf(steel)).toEqual({ L1: 20 }); // Sent does not touch the stock
  });

  it("adds the stock when it is received, once, into the lot typed for each line, and links the movement to the PO", () => {
    const po = makePo();
    call("POST /purchase-orders/:id/status", factory, { params: { id: po.id }, body: { status: "Sent" } });
    const receive = (lots) => call("POST /purchase-orders/:id/status", factory, { params: { id: po.id }, body: { status: "Received", lots } });

    // every line needs a lot number
    expect(codes(fails(() => receive([{ lineId: po.lines[0].id, lotNumber: "L1" }])))).toEqual(["lots.1.lotNumber:REQUIRED"]);
    expect(lotsOf(steel)).toEqual({ L1: 20 }); // nothing was added

    const received = receive([{ lineId: po.lines[0].id, lotNumber: "l1" }, { lineId: po.lines[1].id, lotNumber: "F-NEW" }]); // l1 is the lot L1 (any case)
    expect(received.status).toBe("Received");
    expect(received.receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(received.lines.map((line) => line.lotNumber)).toEqual(["l1", "F-NEW"]);
    expect(lotsOf(steel)).toEqual({ L1: 120 }); // 20 + 100 in the lot that exists
    expect(lotsOf(foam)).toEqual({ "F-NEW": 5 }); // a new lot

    const moves = call("GET /materials/:id/stock-changes", factory, { params: { id: steel.id } });
    expect(moves[0]).toMatchObject({ kind: "Add", change: 100, balance: 120, lotNumber: "L1", purchaseOrderId: po.id, purchaseOrderNumber: po.poNumber, note: `Received ${po.poNumber}` });

    // once only: a second Received changes nothing
    expect(fails(() => receive([{ lineId: po.lines[0].id, lotNumber: "L1" }, { lineId: po.lines[1].id, lotNumber: "F-NEW" }])).code).toBe("INVALID_STATUS_CHANGE");
    expect(lotsOf(steel)).toEqual({ L1: 120 });
    expect(call("GET /stock-changes", factory, { query: { q: po.poNumber } }).meta.total).toBe(2);
  });

  it("takes the payment of a received PO once, equal to the total", () => {
    const po = makePo();
    const pay = (extra = {}) => call("POST /purchase-orders/:id/payment", factory, { params: { id: po.id }, body: { paymentDate: "2026-11-05", amount: 36000, method: "Bank transfer", referenceNo: "TT-1", note: "paid", ...extra } });
    expect(fails(() => pay()).code).toBe("PO_NOT_RECEIVED");
    call("POST /purchase-orders/:id/status", factory, { params: { id: po.id }, body: { status: "Sent" } });
    call("POST /purchase-orders/:id/status", factory, { params: { id: po.id }, body: { status: "Received", lots: po.lines.map((line) => ({ lineId: line.id, lotNumber: "P1" })) } });

    expect(codes(fails(() => pay({ paymentDate: "", amount: 100, method: "Gold" })))).toEqual(["paymentDate:REQUIRED", "amount:MUST_EQUAL_TOTAL", "method:REQUIRED"]);
    expect(fails(() => pay({ amount: "x" })).details).toEqual([{ path: ["amount"], code: "INVALID" }]);
    const paid = pay();
    expect(paid).toMatchObject({ paid: true, payment: { paymentDate: "2026-11-05", amount: 36000, method: "Bank transfer", referenceNo: "TT-1", note: "paid" } });
    expect(fails(() => pay()).code).toBe("ALREADY_PAID");
    expect(call("GET /purchase-orders", factory, { query: { paid: "true", q: po.poNumber } }).meta.total).toBe(1);
    expect(call("GET /purchase-orders", factory, { query: { paid: "false", q: po.poNumber } }).meta.total).toBe(0);
  });

  it("refuses to delete a supplier or a material that a PO uses, and says where", () => {
    const washers = call("POST /materials", admin, { body: { code: "PU-WASH", name: "Washers" } }).data;
    const supplier = call("POST /suppliers", admin, { body: { code: "SUP-USED", name: "Used", items: [{ materialId: washers.id, unitPrice: 5 }] } }).data;
    const po = makePo({ supplierId: supplier.id, lines: [{ materialId: washers.id, quantity: 1, unitPrice: 5 }] });
    expect(fails(() => call("DELETE /suppliers/:id", admin, { params: { id: supplier.id } })).details).toEqual([{ kind: "purchaseOrder", count: 1, items: [po.poNumber] }]);
    const material = fails(() => call("DELETE /materials/:id", admin, { params: { id: washers.id } }));
    expect(material.details).toEqual([
      { kind: "supplier", count: 1, items: ["SUP-USED"] },
      { kind: "purchaseOrder", count: 1, items: [po.poNumber] },
    ]);
    call("DELETE /purchase-orders/:id", factory, { params: { id: po.id } }); // a Draft goes
    call("PUT /suppliers/:id", admin, { params: { id: supplier.id }, body: { code: "SUP-USED", name: "Used", items: [] } });
    expect(call("DELETE /suppliers/:id", admin, { params: { id: supplier.id } })).toBeNull();
  });

  it("is for the Admin and the Factory Worker, not for a Sale Worker", () => {
    expect(fails(() => call("GET /purchase-orders", sale)).status).toBe(403);
    expect(fails(() => call("POST /purchase-orders", sale, { body: poBody() })).status).toBe(403);
    expect(call("POST /purchase-orders", admin, { body: poBody() }).status).toBe(201);
  });
});
