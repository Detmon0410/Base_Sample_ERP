// Purchase orders (docs/api/purchase.md): the user checks the stock, makes a PO to a supplier, prints it, moves the status by hand
// Draft -> Sent -> Received (one step at a time), and records the payment. Receiving adds the stock, once.
//
// A PO: { id, poNumber, supplierId, department, requiredDate, notes, status, lines, payment, receivedAt, createdBy, createdAt, updatedAt }
//   line     { id, materialId, quantity, unitPrice, lotNumber | null }       lotNumber is set when the PO is received
//   payment  { paymentDate, amount, method, referenceNo, note } | null

import { MockHttpError, MockResponse } from "./errors.js";
import { invalid, issue, materials, number, text } from "./master.js";
import { removeAttachmentsOf } from "./attachments.js";
import { receiveIntoStock } from "./stock.js";
import { suppliers } from "./suppliers.js";
import { mockUsers, requireCan } from "./users.js";
import { DEPARTMENTS } from "@/utils/permissions";

export const purchaseOrders = [];

const PAYMENT_METHODS = ["Cash", "Bank transfer", "Cheque", "Credit card", "Other"];
const STEPS = ["Draft", "Sent", "Received"];
let nextId = 1;
let nextLineId = 1;
const round3 = (value) => Math.round(value * 1000) / 1000;
const stamp = () => new Date().toISOString();

const isDay = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
};

const lineView = (line) => {
  const material = materials.find((item) => item.id === line.materialId);
  return { ...line, materialCode: material?.code ?? "", materialName: material?.name ?? "", unit: material?.unit ?? "", amount: Math.round(line.quantity * line.unitPrice) };
};
const totalOf = (po) => po.lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitPrice), 0);

const toView = (po) => {
  const supplier = suppliers.find((item) => item.id === po.supplierId);
  return {
    ...po,
    supplierName: supplier?.name ?? "",
    supplierAddress: supplier?.address ?? "",
    lines: po.lines.map(lineView),
    total: totalOf(po),
    paid: po.payment !== null,
    createdByName: mockUsers.find((user) => user.id === po.createdBy)?.name ?? "",
  };
};
const toListView = (po) => {
  const { lines: _lines, ...rest } = toView(po);
  return rest;
};

function find(id) {
  const po = purchaseOrders.find((item) => item.id === Number(id));
  if (!po) throw new MockHttpError(404, "NOT_FOUND", "Purchase order not found");
  return po;
}

const lockedUnlessDraft = (po) => {
  if (po.status !== "Draft") throw new MockHttpError(409, "PO_LOCKED", "Only a Draft purchase order can be changed or deleted");
};

/** Checks the body of a new or changed PO and returns the clean fields. */
function normalize(body) {
  const data = { supplierId: Number(body.supplierId), requiredDate: text(body.requiredDate), department: text(body.department), notes: text(body.notes), lines: [] };
  const issues = [];
  const supplier = suppliers.find((item) => item.id === data.supplierId);
  if (!supplier) issues.push(issue("supplierId", "REQUIRED"));
  else if (!supplier.active) issues.push(issue("supplierId", "SUPPLIER_INACTIVE"));
  if (!data.requiredDate) issues.push(issue("requiredDate", "REQUIRED"));
  else if (!isDay(data.requiredDate)) issues.push(issue("requiredDate", "INVALID_DATE"));
  if (!data.department) issues.push(issue("department", "REQUIRED"));
  else if (!DEPARTMENTS.includes(data.department)) issues.push(issue("department", "INVALID"));

  const given = Array.isArray(body.lines) ? body.lines : [];
  if (given.length === 0) issues.push(issue("lines", "REQUIRED"));
  given.forEach((line, index) => {
    const materialId = Number(line.materialId);
    const quantity = round3(number(line.quantity));
    const unitPrice = number(line.unitPrice);
    if (!materials.some((material) => material.id === materialId)) issues.push(issue(`lines.${index}.materialId`, "REQUIRED"));
    else if (supplier && !supplier.items.some((item) => item.materialId === materialId)) issues.push(issue(`lines.${index}.materialId`, "NOT_SOLD_BY_SUPPLIER"));
    if (!(quantity > 0)) issues.push(issue(`lines.${index}.quantity`, "INVALID"));
    if (!(Number.isInteger(unitPrice) && unitPrice >= 0)) issues.push(issue(`lines.${index}.unitPrice`, "INVALID"));
    data.lines.push({ materialId, quantity, unitPrice, lotNumber: null });
  });
  if (new Set(data.lines.map((line) => line.materialId)).size < data.lines.length) issues.push(issue("lines", "DUPLICATE"));
  if (issues.length) invalid(issues);
  return data;
}

const withIds = (lines) => lines.map((line) => ({ id: nextLineId++, ...line }));

export const purchaseRoutes = {
  "GET /purchase-orders": ({ authorization, query }) => {
    requireCan(authorization, "purchase.use");
    const q = text(query.q).toLowerCase();
    const rows = purchaseOrders
      .map(toListView)
      .filter((row) => (!query.status || row.status === query.status) && (!query.supplierId || row.supplierId === Number(query.supplierId)) && (query.paid === undefined || query.paid === "" || String(row.paid) === String(query.paid)))
      .filter((row) => !q || [row.poNumber, row.supplierName, row.notes].some((value) => String(value).toLowerCase().includes(q)))
      .sort((a, b) => b.id - a.id);
    const pageSize = Math.max(1, Number(query.pageSize) || 20);
    const page = Math.max(1, Number(query.page) || 1);
    return new MockResponse({ data: rows.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total: rows.length } });
  },

  "GET /purchase-orders/:id": ({ authorization, params }) => {
    requireCan(authorization, "purchase.use");
    return toView(find(params.id));
  },

  "POST /purchase-orders": ({ authorization, body }) => {
    const user = requireCan(authorization, "purchase.use");
    const data = normalize(body);
    const year = new Date().getFullYear();
    const count = purchaseOrders.filter((po) => po.poNumber.startsWith(`PO-${year}-`)).length;
    const po = {
      id: nextId++,
      poNumber: `PO-${year}-${String(count + 1).padStart(4, "0")}`,
      ...data,
      lines: withIds(data.lines),
      status: "Draft",
      payment: null,
      receivedAt: null,
      createdBy: user.id,
      createdAt: stamp(),
      updatedAt: stamp(),
    };
    purchaseOrders.push(po);
    return new MockResponse({ data: toView(po), status: 201 });
  },

  "PUT /purchase-orders/:id": ({ authorization, params, body }) => {
    requireCan(authorization, "purchase.use");
    const po = find(params.id);
    lockedUnlessDraft(po);
    const data = normalize(body);
    Object.assign(po, data, { lines: withIds(data.lines), updatedAt: stamp() });
    return toView(po);
  },

  "DELETE /purchase-orders/:id": ({ authorization, params }) => {
    requireCan(authorization, "purchase.use");
    const po = find(params.id);
    lockedUnlessDraft(po);
    purchaseOrders.splice(purchaseOrders.indexOf(po), 1);
    removeAttachmentsOf("PurchaseOrder", po.id); // the files go with the PO
    return null;
  },

  // the status moves one step forward, by hand; Received adds the stock, once, into the lot typed for each line
  "POST /purchase-orders/:id/status": ({ authorization, params, body }) => {
    const user = requireCan(authorization, "purchase.use");
    const po = find(params.id);
    const next = text(body.status);
    if (!STEPS.includes(next)) invalid([issue("status", next ? "INVALID" : "REQUIRED")]);
    if (STEPS.indexOf(next) !== STEPS.indexOf(po.status) + 1) throw new MockHttpError(409, "INVALID_STATUS_CHANGE", "The status moves one step forward: Draft, Sent, Received");

    if (next === "Received") {
      const given = Array.isArray(body.lots) ? body.lots : [];
      const issues = [];
      const lotOf = po.lines.map((line, index) => {
        const lot = given.find((item) => Number(item.lineId) === line.id);
        const lotNumber = text(lot?.lotNumber);
        if (!lotNumber) issues.push(issue(`lots.${index}.lotNumber`, "REQUIRED"));
        return lotNumber;
      });
      if (issues.length) invalid(issues);
      po.lines.forEach((line, index) => {
        line.lotNumber = lotOf[index];
        receiveIntoStock(materials.find((material) => material.id === line.materialId), line.lotNumber, line.quantity, po, user);
      });
      po.receivedAt = stamp();
    }
    po.status = next;
    po.updatedAt = stamp();
    return toView(po);
  },

  "POST /purchase-orders/:id/payment": ({ authorization, params, body }) => {
    requireCan(authorization, "purchase.use");
    const po = find(params.id);
    if (po.status !== "Received") throw new MockHttpError(409, "PO_NOT_RECEIVED", "Only a received purchase order is paid");
    if (po.payment) throw new MockHttpError(409, "ALREADY_PAID", "The purchase order is paid already");

    const payment = { paymentDate: text(body.paymentDate), amount: number(body.amount), method: text(body.method), referenceNo: text(body.referenceNo), note: text(body.note) };
    const issues = [];
    if (!payment.paymentDate) issues.push(issue("paymentDate", "REQUIRED"));
    else if (!isDay(payment.paymentDate)) issues.push(issue("paymentDate", "INVALID_DATE"));
    if (!Number.isFinite(payment.amount) || payment.amount < 0) issues.push(issue("amount", "INVALID"));
    else if (payment.amount !== totalOf(po)) issues.push(issue("amount", "MUST_EQUAL_TOTAL"));
    if (!PAYMENT_METHODS.includes(payment.method)) issues.push(issue("method", "REQUIRED"));
    if (issues.length) invalid(issues);

    po.payment = payment;
    po.updatedAt = stamp();
    return toView(po);
  },
};
