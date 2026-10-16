// QT references (QT 2.0): a quotation with lines, printed from the system, with the customer's PO, that Confirm turns into a production order.
//
// A QT: { id, qtNumber, qtDate, customerId, notes, customerPoNumber, customerPoDate, status: "Draft" | "Confirmed",
//         lines: [{ productId, quantity, unitPrice }], productionOrderId | null, createdAt, updatedAt }
// The files of a QT (the quotation, the customer's PO file) are attachments (attachments.js). Confirming makes one production order
// (qtConfirm.js); after that the customer and the lines cannot change (409 QT_LOCKED) and the QT cannot be deleted.

import { MockHttpError } from "./errors.js";
import { customers, invalid, issue, number, products, resource, text } from "./master.js";
import { orders } from "./orders.js";

export const qtReferences = [];

/** "YYYY-MM-DD" that is a real day. */
const isDay = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
};

const customerName = (record) => customers.find((customer) => customer.id === record.customerId)?.name ?? "";
const orderOf = (record) => orders.find((order) => order.id === record.productionOrderId);

const lineView = (line) => {
  const product = products.find((item) => item.id === line.productId);
  return { ...line, productCode: product?.code ?? "", productName: product?.name ?? "", amount: line.quantity * line.unitPrice };
};
const totalOf = (record) => record.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

/** The whole QT, with the names, the amounts, the total and the order made from it. */
const toView = (record) => ({
  ...record,
  customerName: customerName(record),
  customerAddress: customers.find((customer) => customer.id === record.customerId)?.address ?? "",
  lines: record.lines.map(lineView),
  total: totalOf(record),
  productionOrderNumber: orderOf(record)?.orderNumber ?? null,
});

/** A row of the list: no lines. */
const toListView = (record) => {
  const { lines: _lines, ...rest } = toView(record);
  return rest;
};

const sameLines = (a, b) => a.length === b.length && a.every((line, index) => line.productId === b[index].productId && line.quantity === b[index].quantity && line.unitPrice === b[index].unitPrice);

export const qtRoutes = resource({
  path: "/qt",
  store: qtReferences,
  readAction: "qt.use",
  writeAction: "qt.use",
  unique: ["qtNumber"],
  searchIn: ["qtNumber", "notes", "customerPoNumber", customerName],
  toView,
  toListView,
  filter: (record, query) => !query.status || record.status === query.status, // the list can be filtered by Draft or Confirmed
  normalize: (body, record) => {
    const data = {
      qtNumber: text(body.qtNumber),
      qtDate: text(body.qtDate),
      customerId: Number(body.customerId),
      notes: text(body.notes),
      customerPoNumber: text(body.customerPoNumber),
      customerPoDate: text(body.customerPoDate),
      lines: [],
      status: record?.status ?? "Draft",
      productionOrderId: record?.productionOrderId ?? null,
    };
    const issues = [];
    if (!data.qtNumber) issues.push(issue("qtNumber", "REQUIRED"));
    if (!data.qtDate) issues.push(issue("qtDate", "REQUIRED"));
    else if (!isDay(data.qtDate)) issues.push(issue("qtDate", "INVALID_DATE"));
    if (!customers.some((customer) => customer.id === data.customerId)) issues.push(issue("customerId", "REQUIRED"));
    if (data.customerPoDate && !isDay(data.customerPoDate)) issues.push(issue("customerPoDate", "INVALID_DATE"));

    (Array.isArray(body.lines) ? body.lines : []).forEach((line, index) => {
      const productId = Number(line.productId);
      const quantity = number(line.quantity);
      const unitPrice = number(line.unitPrice);
      if (!products.some((product) => product.id === productId)) issues.push(issue(`lines.${index}.productId`, "REQUIRED"));
      if (!(Number.isInteger(quantity) && quantity > 0)) issues.push(issue(`lines.${index}.quantity`, "INVALID"));
      if (!(unitPrice >= 0)) issues.push(issue(`lines.${index}.unitPrice`, "INVALID"));
      data.lines.push({ productId, quantity, unitPrice });
    });
    if (new Set(data.lines.map((line) => line.productId)).size < data.lines.length) issues.push(issue("lines", "DUPLICATE"));
    if (issues.length) invalid(issues);

    // a confirmed QT keeps its customer and its lines (its order was made from them)
    if (record?.status === "Confirmed" && (data.customerId !== record.customerId || !sameLines(data.lines, record.lines))) {
      throw new MockHttpError(409, "QT_LOCKED", "The QT is confirmed; its customer and its lines cannot change");
    }
    return data;
  },
});
