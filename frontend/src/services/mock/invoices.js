// Invoices, payments and receipts (docs/specs/s1-mini-erp-workflow.md, section 2 steps 6-7). No tax anywhere.
//
// An invoice: { id, invoiceNumber, invoiceDate, orderId, customerName, customerAddress, lines, total, status: "Unpaid" | "Paid",
//               payment: { date, amount } | null,
//               receipt: { id, invoiceId, receiptNumber, receiptDate, customerName, customerAddress, invoiceNumber, amount } | null }
// It is a snapshot: later changes of the customer or the products do not change it. An issued invoice and its receipt are never
// changed or deleted. One invoice for a Completed order; one full payment (= the total) per invoice, which makes the invoice Paid and
// issues one receipt.

import { MockHttpError, MockResponse } from "./errors.js";
import { customers, invalid, issue, number, products, text } from "./master.js";
import { invoices, orderStatus, orders } from "./orders.js";
import { userFromAuthorization } from "./users.js";


const isDay = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
};

const admin = (authorization) => {
  const user = userFromAuthorization(authorization);
  if (user.role !== "Admin") throw new MockHttpError(403, "FORBIDDEN", "Admin only");
  return user;
};

const find = (id) => {
  const invoice = invoices.find((item) => item.id === Number(id));
  if (!invoice) throw new MockHttpError(404, "NOT_FOUND", "Invoice not found");
  return invoice;
};

const next = (prefix, existing) => {
  const year = new Date().getFullYear();
  const count = existing.filter((number) => number.startsWith(`${prefix}-${year}-`)).length;
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
};

const orderNumber = (invoice) => orders.find((order) => order.id === invoice.orderId)?.orderNumber ?? "";
const view = (invoice) => ({ ...invoice, orderNumber: orderNumber(invoice) });

let nextId = 1;
let nextReceiptId = 1;

/** A receipt as the app sees it: the receipt with the day of its invoice. */
const receiptView = (invoice) => ({ ...invoice.receipt });

export const invoiceRoutes = {
  // the receipts: one list of all of them, and one receipt (the page /receipts, docs/specs/s5-accounting-group.md); Admin only
  "GET /receipts": ({ authorization, query }) => {
    admin(authorization);
    const q = text(query.q).toLowerCase();
    const rows = invoices
      .filter((invoice) => invoice.receipt)
      .map(receiptView)
      .filter((row) => !q || [row.receiptNumber, row.customerName, row.invoiceNumber].some((value) => String(value).toLowerCase().includes(q)))
      .sort((a, b) => b.id - a.id);
    const pageSize = Math.max(1, Number(query.pageSize) || 20);
    const page = Math.max(1, Number(query.page) || 1);
    return new MockResponse({ data: rows.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total: rows.length } });
  },

  "GET /receipts/:id": ({ authorization, params }) => {
    admin(authorization);
    const invoice = invoices.find((item) => item.receipt && item.receipt.id === Number(params.id));
    if (!invoice) throw new MockHttpError(404, "NOT_FOUND", "Receipt not found");
    return receiptView(invoice);
  },

  "GET /invoices": ({ authorization, query }) => {
    admin(authorization);
    const q = text(query.q).toLowerCase();
    let rows = invoices.map(view).filter((row) => (!query.status || row.status === query.status) && (!q || [row.invoiceNumber, row.customerName, row.orderNumber].some((value) => String(value).toLowerCase().includes(q))));
    rows = rows.sort((a, b) => b.id - a.id);
    const pageSize = Math.max(1, Number(query.pageSize) || 20);
    const page = Math.max(1, Number(query.page) || 1);
    return new MockResponse({ data: rows.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total: rows.length } });
  },

  "GET /invoices/:id": ({ authorization, params }) => {
    admin(authorization);
    return view(find(params.id));
  },

  "POST /invoices": ({ authorization, body }) => {
    admin(authorization);
    const order = orders.find((item) => item.id === Number(body.orderId));
    const invoiceDate = text(body.invoiceDate);
    const issues = [];
    if (!order) issues.push(issue("orderId", "REQUIRED"));
    if (!invoiceDate) issues.push(issue("invoiceDate", "REQUIRED"));
    else if (!isDay(invoiceDate)) issues.push(issue("invoiceDate", "INVALID_DATE"));
    if (issues.length) invalid(issues);
    if (orderStatus(order) !== "Completed") throw new MockHttpError(409, "ORDER_NOT_COMPLETED", "Only a Completed order is invoiced", [issue("orderId", "ORDER_NOT_COMPLETED")]);
    if (invoices.some((item) => item.orderId === order.id)) throw new MockHttpError(409, "INVOICE_EXISTS", "The order has an invoice already", [issue("orderId", "INVOICE_EXISTS")]);

    const customer = customers.find((item) => item.id === order.customerId);
    const lines = order.lines.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      return { productCode: product?.code ?? "", productName: product?.name ?? "", quantity: line.quantity, unitPrice: line.unitPrice, amount: line.quantity * line.unitPrice };
    });
    const invoice = {
      id: nextId++,
      invoiceNumber: next("INV", invoices.map((item) => item.invoiceNumber)),
      invoiceDate,
      orderId: order.id,
      customerName: customer?.name ?? "",
      customerAddress: customer?.address ?? "",
      lines,
      total: lines.reduce((sum, line) => sum + line.amount, 0),
      status: "Unpaid",
      payment: null,
      receipt: null,
      createdAt: new Date().toISOString(),
    };
    invoices.push(invoice);
    return new MockResponse({ data: view(invoice), status: 201 });
  },

  "POST /invoices/:id/payment": ({ authorization, params, body }) => {
    admin(authorization);
    const invoice = find(params.id);
    if (invoice.status === "Paid") throw new MockHttpError(409, "ALREADY_PAID", "The invoice is paid already");
    const date = text(body.paymentDate);
    const amount = number(body.amount);
    const issues = [];
    if (!date) issues.push(issue("paymentDate", "REQUIRED"));
    else if (!isDay(date)) issues.push(issue("paymentDate", "INVALID_DATE"));
    if (!Number.isFinite(amount) || amount < 0) issues.push(issue("amount", "INVALID"));
    else if (amount !== invoice.total) issues.push(issue("amount", "MUST_EQUAL_TOTAL"));
    if (issues.length) invalid(issues);

    invoice.payment = { date, amount };
    invoice.status = "Paid";
    invoice.receipt = {
      id: nextReceiptId++,
      invoiceId: invoice.id,
      receiptNumber: next("RC", invoices.filter((item) => item.receipt).map((item) => item.receipt.receiptNumber)),
      receiptDate: date,
      customerName: invoice.customerName,
      customerAddress: invoice.customerAddress,
      invoiceNumber: invoice.invoiceNumber,
      amount,
    };
    return view(invoice);
  },
};
