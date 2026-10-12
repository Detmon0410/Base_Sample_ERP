import { describe, expect, it } from "vitest";

import { mockRoutes } from "./routes.js";
import { mockUsers, tokenOf } from "./users.js";

const admin = mockUsers[0];
const worker = mockUsers[1];
const call = (route, who, { body = {}, params = {}, query = {} } = {}) => mockRoutes[route]({ body, authorization: `Bearer ${tokenOf(who)}`, params, query });
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const pdf = { name: "a.pdf", dataUrl: "data:application/pdf;base64,AA==" };

describe("GET /dashboard of the mock", () => {
  it("is empty at the start: zeros, no list, six months", () => {
    const data = call("GET /dashboard", admin);
    expect(data.orders).toEqual({ New: 0, InProgress: 0, Completed: 0 });
    expect(data.inProgress).toEqual([]);
    expect(data.leastStock).toEqual([]);
    expect(data.invoicing.months).toHaveLength(6);
    expect(data.invoicing.months.every((month) => month.invoiced === 0 && month.paid === 0)).toBe(true);
    expect(data.invoicing.months[5].month).toBe(today().slice(0, 7)); // the current month is the last
  });

  it("counts the orders, ranks the progress and the stock, and totals the money; a Worker gets no money", () => {
    const customer = call("POST /customers", admin, { body: { name: "Dash" } }).data;
    const product = call("POST /products", admin, { body: { code: "D-P", name: "P", price: 1 } }).data;
    const qt = call("POST /qt", admin, { body: { qtNumber: "QT-D", qtDate: "2026-10-01", customerId: customer.id, file: pdf } }).data;
    const order = (lines) => call("POST /orders", admin, { body: { qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines } }).data;
    const progress = (made, status, completedQuantity) =>
      call("POST /orders/:id/progress", worker, { params: { id: made.id }, body: { processId: made.lines[0].processes[0].id, status, completedQuantity, workDate: today() } });
    const start = (made) => call("POST /orders/:id/start", admin, { params: { id: made.id } });

    // two processes of 10 pieces: 5 + 0 of 20 = 25%
    const half = order([{ productId: product.id, quantity: 10, unitPrice: 100, processes: [{ name: "Cut" }, { name: "Weld" }] }]);
    start(half);
    progress(half, "In Progress", 5);
    const finished = order([{ productId: product.id, quantity: 2, unitPrice: 250, processes: [{ name: "Cut" }] }]);
    start(finished);
    progress(finished, "Completed", 2);
    order([{ productId: product.id, quantity: 1, unitPrice: 1, processes: [{ name: "Cut" }] }]); // New

    const invoice = call("POST /invoices", admin, { body: { orderId: finished.id, invoiceDate: today() } }).data;
    for (const [code, quantity] of [["D-M-HIGH", 50], ["D-M-LOW", 3], ["D-M-MID", 20]]) call("POST /materials", admin, { body: { code, name: code, lots: [{ lotNumber: "L", quantity }] } });

    let data = call("GET /dashboard", admin);
    expect(data.orders).toEqual({ New: 1, InProgress: 1, Completed: 1 });
    expect(data.inProgress).toEqual([{ id: half.id, orderNumber: half.orderNumber, customerName: "Dash", done: 5, required: 20, percent: 25 }]);
    expect(data.leastStock.map((row) => row.code)).toEqual(["D-M-LOW", "D-M-MID", "D-M-HIGH"]);
    expect(data.invoicing.unpaid).toEqual({ count: 1, total: 500 });
    expect(data.invoicing.unpaidList.map((row) => row.invoiceNumber)).toEqual([invoice.invoiceNumber]);
    expect(data.invoicing.months[5]).toMatchObject({ invoiced: 500, paid: 0 });
    expect(data.invoicing.paidThisMonth).toEqual({ count: 0, total: 0 });

    call("POST /invoices/:id/payment", admin, { params: { id: invoice.id }, body: { paymentDate: today(), amount: 500 } });
    data = call("GET /dashboard", admin);
    expect(data.invoicing.unpaid).toEqual({ count: 0, total: 0 });
    expect(data.invoicing.paidThisMonth).toEqual({ count: 1, total: 500 });
    expect(data.invoicing.months[5]).toMatchObject({ invoiced: 500, paid: 500 });

    const forWorker = call("GET /dashboard", worker);
    expect(forWorker.invoicing).toBeNull();
    expect(forWorker.orders).toEqual(data.orders);
  });

  it("lists at most five orders in progress and five materials", () => {
    const customer = call("POST /customers", admin, { body: { name: "Many" } }).data;
    const product = call("POST /products", admin, { body: { code: "D-P2", name: "P", price: 1 } }).data;
    const qt = call("POST /qt", admin, { body: { qtNumber: "QT-MANY", qtDate: "2026-10-01", customerId: customer.id, file: pdf } }).data;
    for (let n = 0; n < 7; n += 1) {
      const made = call("POST /orders", admin, { body: { qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 4, unitPrice: 1, processes: [{ name: "Cut" }] }] } }).data;
      call("POST /orders/:id/start", admin, { params: { id: made.id } });
      call("POST /orders/:id/progress", worker, { params: { id: made.id }, body: { processId: made.lines[0].processes[0].id, status: "In Progress", completedQuantity: 1, workDate: today() } });
    }
    expect(call("GET /dashboard", admin).inProgress.length).toBe(5);
    expect(call("GET /dashboard", admin).leastStock.length).toBeLessThanOrEqual(5);
  });
});
