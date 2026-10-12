// Stock changes (docs/specs/s1-mini-erp-workflow.md, section 2 step 8): by hand and at any time, an Admin adds material stock,
// deducts it when it is used, or adjusts it after a count. The production never changes the stock by itself.
//
// A stock change: { id, materialId, lotNumber, kind: "Add" | "Deduct" | "Adjust", change (+ or -), balance (of the lot after it),
//                   changeDate, note, initial (the first stock of a new material), orderId, userId, userName, at }   - never changed or deleted.
// The quantity of a lot changes only through a stock change (a material made with lots starts with an "Add" for each lot).

import { MockHttpError, MockResponse } from "./errors.js";
import { invalid, issue, materials, masterRoutes, number, text } from "./master.js";
import { orders } from "./orders.js";
import { materialView } from "./stockStatus.js";
import { userFromAuthorization } from "./users.js";

export const stockChanges = [];

const KINDS = ["Add", "Deduct", "Adjust"];
let nextId = 1;
const round = (value) => Math.round(value * 1000) / 1000; // quantities have up to 3 decimals
const sameLot = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

const isDay = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() === Number(match[2]) - 1 && date.getUTCDate() === Number(match[3]);
};

const findMaterial = (id) => {
  const material = materials.find((item) => item.id === Number(id));
  if (!material) throw new MockHttpError(404, "NOT_FOUND", "Material not found");
  return material;
};

const log = (material, lotNumber, kind, change, balance, extra, user) => {
  const entry = { id: nextId++, materialId: material.id, lotNumber, kind, change, balance, changeDate: extra.changeDate, note: extra.note ?? "", initial: extra.initial ?? false, orderId: extra.orderId ?? null, userId: user.id, userName: user.name, at: new Date().toISOString() };
  stockChanges.push(entry);
  return entry;
};

const view = (entry) => {
  const material = materials.find((item) => item.id === entry.materialId);
  return { ...entry, materialCode: material?.code ?? "", materialName: material?.name ?? "", orderNumber: orders.find((order) => order.id === entry.orderId)?.orderNumber ?? "" };
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const stockRoutes = {
  // the ledger of every stock change of every material (docs/specs/s4-stock-group.md, section 3.2); read only, any signed-in user
  "GET /stock-changes": ({ authorization, query }) => {
    userFromAuthorization(authorization);
    const q = text(query.q).toLowerCase();
    const type = text(query.type);
    const from = text(query.from);
    const to = text(query.to);
    const issues = [];
    if (type && !KINDS.includes(type)) issues.push(issue("type", "INVALID"));
    if (from && !isDay(from)) issues.push(issue("from", "INVALID_DATE"));
    if (to && !isDay(to)) issues.push(issue("to", "INVALID_DATE"));
    if (issues.length) invalid(issues);

    const rows = stockChanges
      .map(view)
      .filter((row) => (!type || row.kind === type) && (!from || row.changeDate >= from) && (!to || row.changeDate <= to))
      .filter((row) => !q || [row.materialCode, row.materialName, row.orderNumber, row.note, row.lotNumber].some((value) => String(value).toLowerCase().includes(q)))
      .sort((a, b) => b.changeDate.localeCompare(a.changeDate) || b.id - a.id);
    const pageSize = Math.max(1, Number(query.pageSize) || 20);
    const page = Math.max(1, Number(query.page) || 1);
    return new MockResponse({ data: rows.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total: rows.length } });
  },

  // a new material with lots: each lot starts with an "Add" in the history
  "POST /materials": (request) => {
    const response = masterRoutes["POST /materials"](request);
    const user = userFromAuthorization(request.authorization);
    const material = materials.find((item) => item.id === response.data.id);
    for (const lot of material.lots) log(material, lot.lotNumber, "Add", lot.quantity, lot.quantity, { changeDate: today(), note: "Initial stock", initial: true }, user);
    return response;
  },

  // the code and the name can change; the lots only through stock changes
  "PUT /materials/:id": (request) => {
    const material = findMaterial(request.params.id);
    return masterRoutes["PUT /materials/:id"]({ ...request, body: { ...request.body, lots: material.lots } });
  },

  "GET /materials/:id/stock-changes": ({ authorization, params }) => {
    userFromAuthorization(authorization);
    const material = findMaterial(params.id);
    return stockChanges
      .filter((entry) => entry.materialId === material.id)
      .reverse()
      .map(view);
  },

  "POST /materials/:id/stock-changes": ({ authorization, params, body }) => {
    const user = userFromAuthorization(authorization);
    if (user.role !== "Admin") throw new MockHttpError(403, "FORBIDDEN", "Admin only");
    const material = findMaterial(params.id);

    const kind = text(body.kind);
    const lotNumber = text(body.lotNumber);
    const quantity = round(number(body.quantity));
    const changeDate = text(body.changeDate);
    const note = text(body.note);
    const orderId = body.orderId === "" || body.orderId == null ? null : Number(body.orderId);
    const issues = [];

    if (!KINDS.includes(kind)) issues.push(issue("kind", "REQUIRED"));
    if (!lotNumber) issues.push(issue("lotNumber", "REQUIRED"));
    const lot = material.lots.find((item) => sameLot(item.lotNumber, lotNumber));
    if (lotNumber && !lot && kind !== "Add" && KINDS.includes(kind)) issues.push(issue("lotNumber", "LOT_NOT_FOUND"));
    if (!Number.isFinite(quantity) || quantity === 0 || (kind !== "Adjust" && quantity < 0)) issues.push(issue("quantity", "INVALID"));
    if (!changeDate) issues.push(issue("changeDate", "REQUIRED"));
    else if (!isDay(changeDate)) issues.push(issue("changeDate", "INVALID_DATE"));
    if (kind === "Adjust" && !note) issues.push(issue("note", "REQUIRED"));
    if (orderId !== null && !orders.some((order) => order.id === orderId)) issues.push(issue("orderId", "REQUIRED"));
    if (issues.length) invalid(issues);

    const change = kind === "Deduct" ? -quantity : quantity;
    const before = lot?.quantity ?? 0;
    const balance = round(before + change);
    if (balance < 0) throw new MockHttpError(409, "STOCK_NEGATIVE", "The lot cannot go below zero", [issue("quantity", "STOCK_NEGATIVE")]);

    let target = lot;
    if (!target) {
      target = { lotNumber, quantity: 0 };
      material.lots.push(target);
    }
    target.quantity = balance;
    material.updatedAt = new Date().toISOString();
    log(material, target.lotNumber, kind, change, balance, { changeDate, note, orderId }, user);
    return new MockResponse({ data: materialView(material), status: 201 });
  },
};
