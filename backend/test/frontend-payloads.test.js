import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { codes, makeCustomer, must, start, today } from "../test-support/harness.js";

// The frontend forms send what the user typed: every number is a string. The mock API of the frontend
// converts them with Number(), so the real API must accept the same bodies.
describe("bodies as the frontend forms send them (numbers as strings)", () => {
  let t;
  before(async () => {
    t = await start();
  });
  after(() => t.stop());

  it("the whole sale and billing chain works with string numbers", async () => {
    const customer = await makeCustomer(t.as.admin);

    const mat = must(await t.as.admin.post("/materials", { code: "M1", name: "Steel", minLevel: "5", lots: [{ lotNumber: "L1", quantity: "100" }] }), 201);
    assert.equal(mat.minLevel, 5);
    assert.equal(mat.total, 100);

    const product = must(await t.as.admin.post("/products", { code: "P1", name: "Frame", price: "45000", bom: [{ materialId: String(mat.id), quantity: "2.5" }] }), 201);
    assert.equal(product.price, 45000);
    assert.equal(product.bom[0].quantity, 2.5);

    const qt = must(
      await t.as.sales.post("/qt", {
        qtNumber: "QT-S1",
        qtDate: today(),
        customerId: String(customer.id),
        notes: "",
        customerPoNumber: "",
        customerPoDate: "",
        lines: [{ productId: String(product.id), quantity: "10", unitPrice: "45000" }]
      }),
      201
    );
    assert.equal(qt.total, 450000);
    assert.equal(qt.customerPoDate, null, "an empty PO date is no date");

    const { order } = must(await t.as.sales.post(`/qt/${qt.id}/confirm`));
    must(
      await t.as.factory.put(`/orders/${order.id}`, {
        orderDate: today(),
        notes: "",
        lines: [{ productId: String(product.id), quantity: "10", unitPrice: "45000", processes: [{ name: "Cut", instructions: "" }] }]
      })
    );

    const started = must(await t.as.factory.post(`/orders/${order.id}/start`));
    assert.equal(started.started, true);

    const processId = started.lines[0].processes[0].id;
    const done = must(await t.as.factory.post(`/orders/${order.id}/progress`, { processId: String(processId), status: "Completed", completedQuantity: "10", workDate: today(), note: "" }));
    assert.equal(done.status, "Completed");

    const invoice = must(await t.as.admin.post("/invoices", { orderId: String(order.id), invoiceDate: today() }), 201);
    const paid = must(await t.as.admin.post(`/invoices/${invoice.id}/payment`, { paymentDate: today(), amount: String(invoice.total) }));
    assert.equal(paid.status, "Paid");
  });

  it("stock changes with string numbers; an empty orderId is no order", async () => {
    const m = (await t.as.admin.get("/materials")).body.data[0];
    const add = must(await t.as.factory.post(`/materials/${m.id}/stock-changes`, { kind: "Add", lotNumber: "L2", quantity: "7.5", changeDate: today(), orderId: "", note: "" }), 201);
    assert.equal(add.lots.find((l) => l.lotNumber === "L2").quantity, 7.5);
    const adjust = must(await t.as.admin.post(`/materials/${m.id}/stock-changes`, { kind: "Adjust", lotNumber: "L2", quantity: "-2", changeDate: today(), note: "count" }), 201);
    assert.equal(adjust.lots.find((l) => l.lotNumber === "L2").quantity, 5.5);
  });

  it("text and empty values are still rejected by the validators", async () => {
    const res = await t.as.admin.post("/products", { code: "P2", name: "x", price: "abc", bom: [{ materialId: "", quantity: "" }] });
    assert.equal(res.status, 400);
    assert.deepEqual(codes(res), ["price:INVALID", "bom.0.materialId:REQUIRED"]);
    const qty = await t.as.admin.post("/materials", { code: "M9", name: "x", lots: [{ lotNumber: "L", quantity: "" }] });
    assert.deepEqual(codes(qty), ["lots.0.quantity:INVALID"]);
  });

  it("codes and numbers typed as text stay text (lot numbers, PO numbers, codes)", async () => {
    const m = must(await t.as.admin.post("/materials", { code: "0042", name: "Numeric looking code", lots: [{ lotNumber: "007", quantity: "1" }] }), 201);
    assert.equal(m.code, "0042");
    assert.equal(m.lots[0].lotNumber, "007");
  });
});
