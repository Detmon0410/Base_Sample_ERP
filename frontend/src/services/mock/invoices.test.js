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

const customer = call("POST /customers", admin, { body: { name: "Invoice Customer", address: "1 Ginza, Tokyo" } }).data;
const product = call("POST /products", admin, { body: { code: "INV-P", name: "Fridge", price: 1000 } }).data;
const qt = call("POST /qt", admin, { body: { qtNumber: "QT-INV", qtDate: "2026-10-01", customerId: customer.id, file: { name: "a.pdf", dataUrl: "data:application/pdf;base64,AA==" } } }).data;

/** An order of 10 pieces at 900 with one process; `complete` finishes it. */
const order = (complete) => {
  const made = call("POST /orders", admin, { body: { qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 10, unitPrice: 900, processes: [{ name: "Cut" }] }] } }).data;
  call("POST /orders/:id/start", admin, { params: { id: made.id } });
  if (complete) call("POST /orders/:id/progress", worker, { params: { id: made.id }, body: { processId: made.lines[0].processes[0].id, status: "Completed", completedQuantity: 10, workDate: "2026-10-03" } });
  return made;
};
const issue = (made, extra = {}) => call("POST /invoices", admin, { body: { orderId: made.id, invoiceDate: "2026-10-04", ...extra } });

describe("invoices, payments and receipts of the mock", () => {
  it("issues one invoice for a Completed order, as a snapshot, numbered INV-year-0001", () => {
    const made = order(true);
    const invoice = issue(made).data;
    expect(invoice).toMatchObject({ invoiceNumber: `INV-${new Date().getFullYear()}-0001`, status: "Unpaid", total: 9000, customerName: "Invoice Customer", customerAddress: "1 Ginza, Tokyo", orderNumber: made.orderNumber });
    expect(invoice.lines).toEqual([{ productCode: "INV-P", productName: "Fridge", quantity: 10, unitPrice: 900, amount: 9000 }]);

    // a later change of the customer or the product does not change the invoice
    call("PUT /customers/:id", admin, { params: { id: customer.id }, body: { name: "Renamed", address: "Elsewhere" } });
    call("PUT /products/:id", admin, { params: { id: product.id }, body: { code: "INV-P", name: "Renamed", price: 5 } });
    expect(call("GET /invoices/:id", admin, { params: { id: invoice.id } })).toMatchObject({ customerName: "Invoice Customer", total: 9000 });
    expect(call("GET /orders/:id", admin, { params: { id: made.id } }).invoice).toEqual({ id: invoice.id, invoiceNumber: invoice.invoiceNumber, status: "Unpaid" });
  });

  it("refuses an order that is not Completed, a second invoice for an order, and a Worker", () => {
    expect(fails(() => issue(order(false))).code).toBe("ORDER_NOT_COMPLETED");
    const made = order(true);
    issue(made);
    expect(fails(() => issue(made)).code).toBe("INVOICE_EXISTS");
    expect(fails(() => issue(order(true), { invoiceDate: "2026-02-30" })).details).toEqual([{ path: ["invoiceDate"], code: "INVALID_DATE" }]);
    expect(fails(() => call("GET /invoices", worker)).status).toBe(403);
    expect(fails(() => call("POST /invoices", worker, { body: { orderId: made.id, invoiceDate: "2026-10-04" } })).status).toBe(403);
  });

  it("takes the full payment once: the invoice is Paid and one receipt is issued", () => {
    const invoice = issue(order(true)).data;
    const pay = (extra) => call("POST /invoices/:id/payment", admin, { params: { id: invoice.id }, body: { paymentDate: "2026-10-10", amount: invoice.total, ...extra } });

    expect(fails(() => pay({ amount: invoice.total - 1 })).details).toEqual([{ path: ["amount"], code: "MUST_EQUAL_TOTAL" }]);
    expect(fails(() => pay({ paymentDate: "" })).details).toEqual([{ path: ["paymentDate"], code: "REQUIRED" }]);
    expect(call("GET /invoices/:id", admin, { params: { id: invoice.id } }).status).toBe("Unpaid");

    const paid = pay();
    expect(paid).toMatchObject({ status: "Paid", payment: { date: "2026-10-10", amount: invoice.total } });
    expect(paid.receipt).toMatchObject({ receiptNumber: `RC-${new Date().getFullYear()}-0001`, receiptDate: "2026-10-10", invoiceNumber: invoice.invoiceNumber, amount: invoice.total, customerName: "Renamed" }); // the customer as it was renamed by the first test, when this invoice was issued
    expect(fails(() => pay()).code).toBe("ALREADY_PAID");
  });

  it("locks the order once it has an invoice, and finds invoices by number, customer, order and status", () => {
    const made = order(true);
    const invoice = issue(made).data;
    expect(fails(() => call("POST /orders/:id/progress", admin, { params: { id: made.id }, body: { processId: made.lines[0].processes[0].id, status: "In Progress", completedQuantity: 1, workDate: "2026-10-05", note: "x" } })).code).toBe("ORDER_INVOICED");

    expect(call("GET /invoices", admin, { query: { q: invoice.invoiceNumber } }).meta.total).toBe(1);
    expect(call("GET /invoices", admin, { query: { q: made.orderNumber } }).data[0].id).toBe(invoice.id);
    expect(call("GET /invoices", admin, { query: { status: "Paid" } }).data.every((row) => row.status === "Paid")).toBe(true);
    expect(mockRoutes["DELETE /invoices/:id"]).toBeUndefined();
    expect(mockRoutes["PUT /invoices/:id"]).toBeUndefined();
  });
});
