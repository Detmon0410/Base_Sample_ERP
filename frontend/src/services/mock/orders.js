// Production orders (docs/specs/s1-mini-erp-workflow.md, section 2 steps 2-5).
//
// An order: { id, orderNumber, qtId, customerId, orderDate, notes, started, startedAt, lines, history, createdAt, updatedAt }
//   line:    { id, productId, quantity, unitPrice, processes }
//   process: { id, sequence, name, instructions, status: "Not Started" | "In Progress" | "Completed", completedQuantity }
//   history: one entry for every progress update, never changed: { id, lineId, processId, status, completedQuantity, workDate, note, userId, userName, at }
//
// The status of the order is computed, nobody sets it: New (no process has started) -> In Progress (at least one process has started) -> Completed (every process of
// every line Completed). Every process needs the quantity of its line; "Completed" means the completed quantity equals it.
// Before the start an Admin may change the whole order; after it only progress is recorded.

import { MockHttpError, MockResponse } from "./errors.js";
import { customers, invalid, issue, number, products, text } from "./master.js";
import { qtReferences } from "./qt.js";
import { userFromAuthorization } from "./users.js";

export const orders = [];
/** The invoices live here too: an order that has an invoice cannot change any more (the store is filled by invoices.js). */
export const invoices = [];

const STATUSES = ["Not Started", "In Progress", "Completed"];
let nextId = 1;
const id = () => nextId++;
const stamp = () => new Date().toISOString();

const isDay = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
};

/** The status of an order, computed from its processes: New until a process has started, Completed when every process is Completed. */
export function orderStatus(order) {
  if (!order.started) return "New";
  const processes = order.lines.flatMap((line) => line.processes);
  if (processes.length > 0 && processes.every((process) => process.status === "Completed")) return "Completed";
  return processes.some((process) => process.status !== "Not Started") ? "In Progress" : "New";
}

function toView(order) {
  const lines = order.lines.map((line) => {
    const product = products.find((item) => item.id === line.productId);
    return { ...line, productCode: product?.code ?? "", productName: product?.name ?? "" };
  });
  const names = new Map();
  for (const line of lines) for (const process of line.processes) names.set(process.id, `${line.productCode} / ${process.sequence}. ${process.name}`);
  return {
    ...order,
    status: orderStatus(order),
    qtNumber: qtReferences.find((qt) => qt.id === order.qtId)?.qtNumber ?? "",
    customerName: customers.find((customer) => customer.id === order.customerId)?.name ?? "",
    invoice: (() => {
      const invoice = invoices.find((item) => item.orderId === order.id);
      return invoice ? { id: invoice.id, invoiceNumber: invoice.invoiceNumber, status: invoice.status, receiptNumber: invoice.receipt?.receiptNumber ?? null, receiptId: invoice.receipt?.id ?? null } : null;
    })(),
    lines,
    history: [...order.history].reverse().map((entry) => ({ ...entry, processName: names.get(entry.processId) ?? "" })),
  };
}

const toListView = (order) => {
  const { lines, history: _history, ...rest } = toView(order);
  return { ...rest, productCodes: lines.map((line) => line.productCode).join(" ") }; // the list is searched by product code too
};

function access(authorization, adminOnly) {
  const user = userFromAuthorization(authorization);
  if (adminOnly && user.role !== "Admin") throw new MockHttpError(403, "FORBIDDEN", "Admin only");
  return user;
}

function find(orderId) {
  const order = orders.find((item) => item.id === Number(orderId));
  if (!order) throw new MockHttpError(404, "NOT_FOUND", "Order not found");
  return order;
}

/** Checks the body of a new or changed order and returns the clean fields. */
function normalize(body) {
  const data = { qtId: Number(body.qtId), customerId: Number(body.customerId), orderDate: text(body.orderDate), notes: text(body.notes), lines: [] };
  const issues = [];
  if (!qtReferences.some((qt) => qt.id === data.qtId)) issues.push(issue("qtId", "REQUIRED"));
  if (!customers.some((customer) => customer.id === data.customerId)) issues.push(issue("customerId", "REQUIRED"));
  if (!data.orderDate) issues.push(issue("orderDate", "REQUIRED"));
  else if (!isDay(data.orderDate)) issues.push(issue("orderDate", "INVALID_DATE"));

  (Array.isArray(body.lines) ? body.lines : []).forEach((line, index) => {
    const productId = Number(line.productId);
    const quantity = number(line.quantity);
    const unitPrice = number(line.unitPrice);
    if (!products.some((product) => product.id === productId)) issues.push(issue(`lines.${index}.productId`, "REQUIRED"));
    if (!(Number.isInteger(quantity) && quantity > 0)) issues.push(issue(`lines.${index}.quantity`, "INVALID"));
    if (!(unitPrice >= 0)) issues.push(issue(`lines.${index}.unitPrice`, "INVALID"));
    const processes = (Array.isArray(line.processes) ? line.processes : []).map((process, step) => {
      const name = text(process.name);
      if (!name) issues.push(issue(`lines.${index}.processes.${step}.name`, "REQUIRED"));
      return { sequence: step + 1, name, instructions: text(process.instructions) };
    });
    data.lines.push({ productId, quantity, unitPrice, processes });
  });
  if (issues.length) invalid(issues);
  return data;
}

const withIds = (lines) =>
  lines.map((line) => ({
    id: id(),
    ...line,
    processes: line.processes.map((process) => ({ id: id(), ...process, status: "Not Started", completedQuantity: 0 })),
  }));

export const orderRoutes = {
  "GET /orders": ({ authorization, query }) => {
    access(authorization, false);
    const q = text(query.q).toLowerCase();
    let rows = orders.map(toListView).filter((row) => (!query.status || row.status === query.status) && (!q || [row.orderNumber, row.customerName, row.qtNumber, row.notes, row.productCodes].some((value) => String(value).toLowerCase().includes(q))));
    rows = rows.sort((a, b) => b.id - a.id);
    const pageSize = Math.max(1, Number(query.pageSize) || 20);
    const page = Math.max(1, Number(query.page) || 1);
    return new MockResponse({ data: rows.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total: rows.length } });
  },

  "GET /orders/:id": ({ authorization, params }) => {
    access(authorization, false);
    return toView(find(params.id));
  },

  "POST /orders": ({ authorization, body }) => {
    access(authorization, true);
    const data = normalize(body);
    const year = new Date().getFullYear();
    const count = orders.filter((order) => order.orderNumber.startsWith(`ORD-${year}-`)).length;
    const order = {
      id: id(),
      orderNumber: `ORD-${year}-${String(count + 1).padStart(4, "0")}`,
      ...data,
      lines: withIds(data.lines),
      started: false,
      startedAt: null,
      history: [],
      createdAt: stamp(),
      updatedAt: stamp(),
    };
    orders.push(order);
    return new MockResponse({ data: toView(order), status: 201 });
  },

  "PUT /orders/:id": ({ authorization, params, body }) => {
    access(authorization, true);
    const order = find(params.id);
    if (order.started) throw new MockHttpError(409, "ORDER_LOCKED", "The order has started; its products and processes cannot change");
    const data = normalize(body);
    Object.assign(order, data, { lines: withIds(data.lines), updatedAt: stamp() });
    return toView(order);
  },

  "POST /orders/:id/start": ({ authorization, params }) => {
    access(authorization, true);
    const order = find(params.id);
    if (order.started) throw new MockHttpError(409, "ALREADY_STARTED", "The order has started already");
    if (order.lines.length === 0 || order.lines.some((line) => line.processes.length === 0)) {
      throw new MockHttpError(409, "ORDER_NOT_READY", "Every order needs a product line, and every line needs a process");
    }
    order.started = true;
    order.startedAt = stamp();
    order.updatedAt = stamp();
    return toView(order);
  },

  "POST /orders/:id/progress": ({ authorization, params, body }) => {
    const user = access(authorization, false);
    const order = find(params.id);
    if (!order.started) throw new MockHttpError(409, "ORDER_NOT_STARTED", "The order has not started");
    if (invoices.some((invoice) => invoice.orderId === order.id)) throw new MockHttpError(409, "ORDER_INVOICED", "The order is invoiced; its progress cannot change");

    const processId = Number(body.processId);
    const line = order.lines.find((item) => item.processes.some((process) => process.id === processId));
    const process = line?.processes.find((item) => item.id === processId);
    if (!process) throw new MockHttpError(404, "NOT_FOUND", "Process not found");
    if (process.status === "Completed" && user.role !== "Admin") throw new MockHttpError(403, "COMPLETED_LOCKED", "Only an Admin can reopen a completed process");

    const entry = { status: text(body.status), completedQuantity: number(body.completedQuantity), workDate: text(body.workDate), note: text(body.note) };
    const required = line.quantity;
    const issues = [];
    if (!STATUSES.includes(entry.status)) issues.push(issue("status", "REQUIRED"));
    if (!Number.isInteger(entry.completedQuantity) || entry.completedQuantity < 0) issues.push(issue("completedQuantity", "INVALID"));
    else if (entry.completedQuantity > required) issues.push(issue("completedQuantity", "TOO_HIGH"));
    else if (entry.status === "Completed" && entry.completedQuantity !== required) issues.push(issue("completedQuantity", "MUST_EQUAL_REQUIRED"));
    else if (entry.status !== "Completed" && entry.completedQuantity === required && STATUSES.includes(entry.status)) issues.push(issue("status", "MUST_BE_COMPLETED"));
    else if (entry.status === "Not Started" && entry.completedQuantity !== 0) issues.push(issue("completedQuantity", "MUST_BE_ZERO"));
    if (!entry.workDate) issues.push(issue("workDate", "REQUIRED"));
    else if (!isDay(entry.workDate)) issues.push(issue("workDate", "INVALID_DATE"));
    if (process.status === "Completed" && entry.status !== "Completed" && !entry.note) issues.push(issue("note", "REOPEN_NOTE"));
    if (issues.length) invalid(issues);

    process.status = entry.status;
    process.completedQuantity = entry.completedQuantity; // the latest total, not a sum of the entries
    order.history.push({ id: id(), lineId: line.id, processId, ...entry, userId: user.id, userName: user.name, at: stamp() });
    order.updatedAt = stamp();
    return toView(order);
  },
};
