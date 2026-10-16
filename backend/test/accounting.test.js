import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { codes, completeOrder, makeCustomer, makeMaterial, makeOrder, makeProduct, must, start, today, year } from "../test-support/harness.js";

describe("invoices, payments and receipts", () => {
  let t;
  let customer;
  let product;
  let done; // a Completed order
  let invoice;

  before(async () => {
    t = await start();
    customer = await makeCustomer(t.as.admin, "Snapshot Co");
    const mat = await makeMaterial(t.as.admin, "M", [{ lotNumber: "L", quantity: 1000 }]);
    product = await makeProduct(t.as.admin, "WIDGET", [{ materialId: mat.id, quantity: 1 }], 3000);
    const { order } = await makeOrder(t.as.admin, { product, customer, quantity: 3, unitPrice: 3000, qtNumber: "QT-A1" });
    await t.as.factory.post(`/orders/${order.id}/start`);
    done = await completeOrder(t.as.factory, order);
  });
  after(() => t.stop());

  const pay = (id, body) => t.as.admin.post(`/invoices/${id}/payment`, { paymentDate: today(), ...body });

  it("is for the Admin only; the role check is before the lookup", async () => {
    for (const c of [t.as.sales, t.as.factory, t.as.accounting]) {
      for (const [m, p] of [["get", "/invoices"], ["get", "/invoices/99999"], ["post", "/invoices"], ["post", "/invoices/1/payment"], ["get", "/receipts"], ["get", "/receipts/99999"]]) {
        assert.equal((await c[m](p, {})).status, 403, `${m} ${p}`);
      }
    }
  });

  it("an order that is not Completed cannot be invoiced (ORDER_NOT_COMPLETED)", async () => {
    const { order } = await makeOrder(t.as.admin, { product, customer, qtNumber: "QT-A2" });
    const res = await t.as.admin.post("/invoices", { orderId: order.id, invoiceDate: today() });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "ORDER_NOT_COMPLETED");
  });

  it("validates orderId and invoiceDate; a missing order is 404", async () => {
    assert.deepEqual(codes(await t.as.admin.post("/invoices", {})), ["orderId:REQUIRED", "invoiceDate:REQUIRED"]);
    assert.deepEqual(codes(await t.as.admin.post("/invoices", { orderId: done.id, invoiceDate: "2026-02-30" })), ["invoiceDate:INVALID_DATE"]);
    assert.equal((await t.as.admin.post("/invoices", { orderId: 99999, invoiceDate: today() })).status, 404);
  });

  it("issues an invoice: a numbered snapshot of the order and the customer", async () => {
    invoice = must(await t.as.admin.post("/invoices", { orderId: done.id, invoiceDate: "2026-10-04" }), 201);
    assert.equal(invoice.invoiceNumber, `INV-${year()}-0001`);
    assert.equal(invoice.invoiceDate, "2026-10-04");
    assert.equal(invoice.orderNumber, done.orderNumber);
    assert.equal(invoice.customerName, "Snapshot Co");
    assert.equal(invoice.customerAddress, "1 Main St");
    assert.deepEqual(invoice.lines, [{ productCode: "WIDGET", productName: "Product WIDGET", quantity: 3, unitPrice: 3000, amount: 9000 }]);
    assert.equal(invoice.total, 9000);
    assert.equal(invoice.status, "Unpaid");
    assert.equal(invoice.payment, null);
    assert.equal(invoice.receipt, null);
  });

  it("one invoice per order (INVOICE_EXISTS)", async () => {
    const res = await t.as.admin.post("/invoices", { orderId: done.id, invoiceDate: today() });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "INVOICE_EXISTS");
  });

  it("later changes of the customer and the product do not change the invoice", async () => {
    must(await t.as.admin.put(`/customers/${customer.id}`, { name: "Renamed Co", address: "Elsewhere", email: "", telephone: "" }));
    must(await t.as.admin.put(`/products/${product.id}`, { code: "WIDGET", name: "New name", price: 1, bom: [] }));
    const got = must(await t.as.admin.get(`/invoices/${invoice.id}`));
    assert.equal(got.customerName, "Snapshot Co");
    assert.equal(got.customerAddress, "1 Main St");
    assert.equal(got.lines[0].productName, "Product WIDGET");
  });

  it("lists and reads invoices; filters by q and status; pages; no PUT or DELETE", async () => {
    const list = await t.as.admin.get("/invoices");
    assert.equal(list.body.meta.total, 1);
    assert.equal("lines" in list.body.data[0], false);
    assert.equal((await t.as.admin.get("/invoices?q=Snapshot")).body.data.length, 1);
    assert.equal((await t.as.admin.get(`/invoices?q=${done.orderNumber}`)).body.data.length, 1);
    assert.equal((await t.as.admin.get("/invoices?q=INV-")).body.data.length, 1);
    assert.equal((await t.as.admin.get("/invoices?status=Paid")).body.data.length, 0);
    assert.equal((await t.as.admin.get("/invoices?status=Unpaid")).body.data.length, 1);
    assert.equal((await t.as.admin.get("/invoices?status=Late")).status, 400);
    assert.equal((await t.as.admin.get("/invoices/99999")).status, 404);
    assert.equal((await t.as.admin.put(`/invoices/${invoice.id}`, {})).status, 404);
    assert.equal((await t.as.admin.delete(`/invoices/${invoice.id}`)).status, 404);
  });

  it("the dashboard shows the unpaid invoice to the Admin and nothing to a Worker", async () => {
    const admin = must(await t.as.admin.get("/dashboard"));
    assert.deepEqual(admin.orders, { Draft: 1, InProgress: 0, Completed: 1 });
    assert.deepEqual(admin.invoicing, { unpaid: { count: 1, total: 9000 }, paidThisMonth: { count: 0, total: 0 } });
    for (const c of [t.as.sales, t.as.factory]) {
      const w = must(await c.get("/dashboard"));
      assert.deepEqual(w.orders, { Draft: 1, InProgress: 0, Completed: 1 });
      assert.equal(w.invoicing, null);
    }
  });

  it("payment must equal the total (MUST_EQUAL_TOTAL) and have a real date", async () => {
    assert.deepEqual(codes(await pay(invoice.id, { amount: 8000 })), ["amount:MUST_EQUAL_TOTAL"]);
    assert.deepEqual(codes(await pay(invoice.id, { amount: "9000" })), ["amount:INVALID"]);
    assert.deepEqual(codes(await pay(invoice.id, { amount: undefined })), ["amount:REQUIRED"]);
    assert.deepEqual(codes(await pay(invoice.id, { amount: 9000, paymentDate: "x" })), ["paymentDate:INVALID_DATE"]);
    assert.deepEqual(codes(await t.as.admin.post(`/invoices/${invoice.id}/payment`, { amount: 9000 })), ["paymentDate:REQUIRED"]);
    assert.equal((await pay(99999, { amount: 1 })).status, 404);
    assert.equal(must(await t.as.admin.get(`/invoices/${invoice.id}`)).status, "Unpaid");
  });

  it("the full payment marks it Paid and issues one numbered receipt", async () => {
    const paid = must(await pay(invoice.id, { amount: 9000, paymentDate: "2026-10-10" }));
    assert.equal(paid.status, "Paid");
    assert.deepEqual(paid.payment, { date: "2026-10-10", amount: 9000 });
    assert.deepEqual(
      { ...paid.receipt, id: undefined },
      {
        id: undefined,
        invoiceId: invoice.id,
        receiptNumber: `RC-${year()}-0001`,
        receiptDate: "2026-10-10",
        customerName: "Snapshot Co",
        customerAddress: "1 Main St",
        invoiceNumber: invoice.invoiceNumber,
        amount: 9000
      }
    );
  });

  it("a second payment is 409 ALREADY_PAID", async () => {
    const res = await pay(invoice.id, { amount: 9000 });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "ALREADY_PAID");
  });

  it("the order links to its invoice and receipt", async () => {
    const o = must(await t.as.sales.get(`/orders/${done.id}`));
    assert.equal(o.invoice.status, "Paid");
    assert.equal(o.invoice.receiptNumber, `RC-${year()}-0001`);
    assert.ok(o.invoice.receiptId);
  });

  it("dashboard: the payment counts in this month", async () => {
    // The first payment is dated 2026-10-10, which is in "this month" only in that month, so pay one dated today
    const { order } = await makeOrder(t.as.admin, { product, customer, quantity: 1, unitPrice: 500, qtNumber: "QT-A3" });
    await t.as.factory.post(`/orders/${order.id}/start`);
    await completeOrder(t.as.factory, order);
    const inv = must(await t.as.admin.post("/invoices", { orderId: order.id, invoiceDate: today() }), 201);
    must(await pay(inv.id, { amount: 500, paymentDate: today() }));
    const after = must(await t.as.admin.get("/dashboard"));
    assert.ok(after.invoicing.paidThisMonth.count >= 1);
    assert.ok(after.invoicing.paidThisMonth.total >= 500);
    assert.equal(after.invoicing.unpaid.count, 0);
  });

  it("receipts: list, search, read; no writes", async () => {
    const list = await t.as.admin.get("/receipts");
    assert.ok(list.body.meta.total >= 2);
    assert.equal(list.body.data[0].receiptNumber, `RC-${year()}-0002`, "newest first");
    assert.equal((await t.as.admin.get("/receipts?q=Snapshot")).body.data.length >= 1, true);
    assert.equal((await t.as.admin.get(`/receipts?q=${invoice.invoiceNumber}`)).body.data.length, 1);
    assert.equal((await t.as.admin.get("/receipts?q=RC-")).body.data.length >= 2, true);
    assert.equal((await t.as.admin.get("/receipts?pageSize=1")).body.data.length, 1);

    const id = (await t.as.admin.get(`/receipts?q=${invoice.invoiceNumber}`)).body.data[0].id;
    const one = must(await t.as.admin.get(`/receipts/${id}`));
    assert.equal(one.invoiceNumber, invoice.invoiceNumber);
    assert.equal(one.customerName, "Snapshot Co", "the copy kept in the invoice");
    assert.equal((await t.as.admin.get("/receipts/99999")).status, 404);
    assert.equal((await t.as.admin.post("/receipts", {})).status, 404);
    assert.equal((await t.as.admin.delete(`/receipts/${id}`)).status, 404);
  });

  it("numbers run on within the year", async () => {
    const list = (await t.as.admin.get("/invoices")).body.data;
    assert.deepEqual(list.map((i) => i.invoiceNumber), [`INV-${year()}-0002`, `INV-${year()}-0001`]);
  });
});
