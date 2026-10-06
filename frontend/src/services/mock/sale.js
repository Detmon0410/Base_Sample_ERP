// In-memory Sale documents for VITE_USE_MOCK=true (docs/specs/f6-sale.md). Everything is manual: a status only
// changes when a person calls an action (POST /sale/<kind>/:id/<action>). The data lives until a full reload.

import { MockHttpError, MockResponse } from "./errors.js";

const TAX_RATE = 0.1; // consumption tax (spec Q3)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const matches = (value, text) => String(value ?? "").toLowerCase().includes(text);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date, days) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------------------------------------------------
// Who may do what: Sale Worker = everyday steps, Sale Manager / Admin = approve, cancel in production, close,
// revert (spec 2 and Q14). Anybody else gets 403.
// ---------------------------------------------------------------------------------------------------------
function saleRole(user) {
  if (user.memberships.some((membership) => membership.role === "Admin")) return "Admin";
  return user.memberships.find((membership) => membership.department === "Sale")?.role ?? null;
}
const isManager = (role) => role === "Manager" || role === "Admin";

function requireSale(userFromAuthorization, authorization) {
  const user = userFromAuthorization(authorization);
  const role = saleRole(user);
  if (!role) throw new MockHttpError(403, "FORBIDDEN", "Sale department only");
  return { user, role };
}

const forbid = () => new MockHttpError(403, "FORBIDDEN", "You may not do this");
const wrongStatus = () => new MockHttpError(409, "INVALID_STATUS", "This is not possible in the current status");

// ---------------------------------------------------------------------------------------------------------
// Numbers, totals, lines
// ---------------------------------------------------------------------------------------------------------
const counters = {};
function nextNumber(prefix, date) {
  const year = String(date).slice(0, 4);
  const key = `${prefix}-${year}`;
  counters[key] = (counters[key] ?? 0) + 1;
  return `${key}-${String(counters[key]).padStart(4, "0")}`;
}
function seedNumber(prefix, date, serial) {
  const year = String(date).slice(0, 4);
  const key = `${prefix}-${year}`;
  counters[key] = Math.max(counters[key] ?? 0, serial);
  return `${key}-${String(serial).padStart(4, "0")}`;
}

const lineAmount = (line) => line.qty * line.unitPrice;
function totalsOf(lines) {
  const subtotal = lines.reduce((sum, line) => sum + lineAmount(line), 0);
  const tax = Math.floor(subtotal * TAX_RATE);
  return { subtotal, tax, total: subtotal + tax, taxRate: TAX_RATE };
}

export function saleRoutes({ userFromAuthorization, getStore }) {
  const store = () => getStore();
  const guard = (authorization) => requireSale(userFromAuthorization, authorization);

  const quotations = [];
  const orders = [];
  const customerPos = [];
  const deliveries = [];
  let seq = { qt: 1, so: 1, po: 1, dn: 1 };
  let logId = 1;

  const customerOf = (id) => store().customers.find((row) => row.id === Number(id));
  const productOf = (id) => store().products.find((row) => row.id === Number(id));
  const employeeOf = (id) => store().employees.find((row) => row.id === Number(id));

  // ---- price: the active price list row of the customer that covers the date, else the selling price ----
  function priceFor(productId, customerId, date) {
    const row = store().prices.find(
      (price) =>
        price.status === "active" &&
        price.productId === Number(productId) &&
        price.customerId === Number(customerId) &&
        price.validFrom <= date &&
        (price.validTo == null || date <= price.validTo),
    );
    return row ? row.price : (productOf(productId)?.sellingPrice ?? 0);
  }

  // ---- material availability (aditional_req 1) ----
  function availability(lines) {
    const needs = new Map(); // materialId -> required
    const noBom = [];
    for (const line of lines) {
      const bom = store().bom.filter((item) => item.productId === Number(line.productId));
      if (bom.length === 0) noBom.push(Number(line.productId));
      for (const item of bom) needs.set(item.materialId, (needs.get(item.materialId) ?? 0) + item.qty * line.qty);
    }
    const shortages = [];
    const materials = [];
    for (const [materialId, required] of needs) {
      const material = store().materials.find((row) => row.id === materialId);
      const available = material?.onHand ?? 0;
      const row = {
        materialId,
        materialCode: material?.code,
        materialName: material?.name,
        uom: material?.uom,
        required: Math.round(required * 1000) / 1000,
        available,
        missing: Math.max(0, Math.round((required - available) * 1000) / 1000),
      };
      materials.push(row);
      if (row.missing > 0) shortages.push(row);
    }
    return {
      canProduce: shortages.length === 0 && noBom.length === 0,
      checkedAt: new Date().toISOString(),
      materials,
      shortages,
      noBom: noBom.map((id) => ({ productId: id, productCode: productOf(id)?.code, productName: productOf(id)?.name })),
    };
  }

  // ---- shaping documents for the API ----
  const shapeLines = (lines) =>
    lines.map((line) => {
      const product = productOf(line.productId);
      return {
        productId: line.productId,
        productCode: product?.code,
        productName: product?.name,
        uom: product?.uom,
        qty: line.qty,
        unitPrice: line.unitPrice,
        amount: lineAmount(line),
        priceEdited: Boolean(line.priceEdited),
      };
    });

  const historyOf = (doc) =>
    [...doc.log]
      .sort((a, b) => b.id - a.id)
      .map((entry) => ({ id: entry.id, action: entry.action, status: entry.status, actor: entry.actor, at: entry.at, note: entry.note ?? null }));

  function linksOf(kind, doc) {
    const links = [];
    if (kind === "quotation") {
      for (const so of orders.filter((order) => order.quotationId === doc.id)) links.push({ id: `so-${so.id}`, type: "order", number: so.number, status: so.status, to: `/sale/orders/${so.id}` });
      for (const po of customerPos.filter((item) => item.quotationId === doc.id)) links.push({ id: `po-${po.id}`, type: "customerPo", number: po.poNumber, to: `/sale/customer-pos/${po.id}` });
    }
    if (kind === "order") {
      const qt = quotations.find((item) => item.id === doc.quotationId);
      if (qt) links.push({ id: `qt-${qt.id}`, type: "quotation", number: qt.number, status: qt.status, to: `/sale/quotations/${qt.id}` });
      const po = customerPos.find((item) => item.id === doc.customerPoId);
      if (po) links.push({ id: `po-${po.id}`, type: "customerPo", number: po.poNumber, to: `/sale/customer-pos/${po.id}` });
      for (const dn of deliveries.filter((item) => item.saleOrderId === doc.id)) links.push({ id: `dn-${dn.id}`, type: "delivery", number: dn.number, status: dn.status, to: `/sale/deliveries/${dn.id}` });
      if (["in_production", "ready_to_deliver", "delivered", "closed"].includes(doc.status)) links.push({ id: `wo-${doc.id}`, type: "workOrder", number: null });
      if (["delivered", "closed"].includes(doc.status)) links.push({ id: `inv-${doc.id}`, type: "invoice", number: null });
    }
    if (kind === "delivery") {
      const so = orders.find((item) => item.id === doc.saleOrderId);
      if (so) links.push({ id: `so-${so.id}`, type: "order", number: so.number, status: so.status, to: `/sale/orders/${so.id}` });
    }
    if (kind === "customerPo") {
      const qt = quotations.find((item) => item.id === doc.quotationId);
      if (qt) links.push({ id: `qt-${qt.id}`, type: "quotation", number: qt.number, status: qt.status, to: `/sale/quotations/${qt.id}` });
      for (const so of orders.filter((order) => order.customerPoId === doc.id)) links.push({ id: `so-${so.id}`, type: "order", number: so.number, status: so.status, to: `/sale/orders/${so.id}` });
    }
    return links;
  }

  const base = (kind, doc) => ({
    ...doc,
    customerCode: customerOf(doc.customerId)?.code,
    customerName: customerOf(doc.customerId)?.name,
    salesPersonName: employeeOf(doc.salesPersonId)?.name ?? null,
    log: undefined,
    history: historyOf(doc),
    links: linksOf(kind, doc),
  });

  const shapeQuotation = (doc) => ({ ...base("quotation", doc), lines: shapeLines(doc.lines), totals: totalsOf(doc.lines), pastValidUntil: doc.status === "sent" && doc.validUntil < today() });

  const deliveredQty = (saleOrderId, productId, exceptDnId) =>
    deliveries
      .filter((dn) => dn.saleOrderId === saleOrderId && dn.status === "delivered" && dn.id !== exceptDnId)
      .reduce((sum, dn) => sum + (dn.lines.find((line) => line.productId === productId)?.deliverNow ?? 0), 0);

  const shapeOrder = (doc) => ({
    ...base("order", doc),
    lines: shapeLines(doc.lines).map((line) => ({ ...line, delivered: deliveredQty(doc.id, line.productId) })),
    totals: totalsOf(doc.lines),
    quotationNumber: quotations.find((item) => item.id === doc.quotationId)?.number ?? null,
    customerPoNumber: customerPos.find((item) => item.id === doc.customerPoId)?.poNumber ?? null,
  });

  const shapeDelivery = (doc) => {
    const order = orders.find((item) => item.id === doc.saleOrderId);
    return {
      ...base("delivery", doc),
      saleOrderNumber: order?.number,
      warehouseName: store().warehouses.find((row) => row.id === doc.warehouseId)?.name,
      lines: doc.lines.map((line) => {
        const product = productOf(line.productId);
        const ordered = order?.lines.find((item) => item.productId === line.productId)?.qty ?? 0;
        const before = deliveredQty(doc.saleOrderId, line.productId, doc.id);
        return { productId: line.productId, productCode: product?.code, productName: product?.name, ordered, deliveredBefore: before, remaining: ordered - before, deliverNow: line.deliverNow };
      }),
    };
  };

  const shapePo = (doc) => ({ ...base("customerPo", doc), inUse: orders.some((order) => order.customerPoId === doc.id && order.status !== "cancelled") });

  // ---- log ----
  function logEntry(doc, action, status, actor, note, at = new Date().toISOString()) {
    doc.log.push({ id: logId++, action, status, actor, at, note });
  }
  const statusBefore = (doc) => {
    // The status before the latest status change (the log keeps one entry per change, `created` is the first).
    const changes = doc.log.filter((entry) => entry.status);
    return changes.length >= 2 ? changes[changes.length - 2].status : null;
  };

  // ---- validation of lines and headers ----
  function checkLines(body, errors) {
    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (lines.length === 0) errors.push({ path: ["lines"], message: "REQUIRED" });
    const seen = new Set();
    lines.forEach((line, index) => {
      if (!productOf(line.productId) || productOf(line.productId).status !== "active") errors.push({ path: ["lines", index, "productId"], message: "REQUIRED" });
      else if (seen.has(Number(line.productId))) errors.push({ path: ["lines", index, "productId"], message: "DUPLICATE" });
      seen.add(Number(line.productId));
      if (!Number.isInteger(line.qty) || line.qty <= 0) errors.push({ path: ["lines", index, "qty"], message: "INVALID" });
      if (!Number.isInteger(line.unitPrice) || line.unitPrice < 0) errors.push({ path: ["lines", index, "unitPrice"], message: "INVALID" });
    });
  }
  const cleanLines = (lines) => lines.map((line) => ({ productId: Number(line.productId), qty: line.qty, unitPrice: line.unitPrice, priceEdited: Boolean(line.priceEdited) }));
  const fail = (errors) => {
    if (errors.length) throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", errors);
  };

  // ---- list helper shared by the four lists ----
  function listOf(items, shape, { query, searchFields, sorts, defaultSort = "-date" }) {
    const text = String(query.q ?? "").trim().toLowerCase();
    const status = query.status && query.status !== "all" ? query.status : null;
    const customer = query.customer ? Number(query.customer) : null;
    const others = items
      .map(shape)
      .filter(
        (row) =>
          (!customer || row.customerId === customer) &&
          (!query.from || row.date >= query.from) &&
          (!query.to || row.date <= query.to) &&
          (!text || searchFields.some((field) => matches(row[field], text))),
      );
    const statusCounts = {};
    others.forEach((row) => {
      statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
    });
    let result = status ? others.filter((row) => row.status === status) : others;
    const sortKey = String(query.sort ?? defaultSort);
    const descending = sortKey.startsWith("-");
    const field = descending ? sortKey.slice(1) : sortKey;
    if (sorts.includes(field)) {
      result = [...result].sort((a, b) => {
        const left = a[field] ?? a.totals?.[field];
        const right = b[field] ?? b.totals?.[field];
        let order;
        if (left == null || left === "") order = right == null || right === "" ? 0 : -1;
        else if (right == null || right === "") order = 1;
        else order = typeof left === "number" ? left - right : String(left).localeCompare(String(right));
        return (descending ? -order : order) || b.id - a.id;
      });
    }
    const pageSize = Math.min(Number(query.pageSize) || 20, 100);
    const total = result.length;
    const page = Math.min(Math.max(Number(query.page) || 1, 1), Math.max(1, Math.ceil(total / pageSize)));
    return new MockResponse({ data: result.slice((page - 1) * pageSize, page * pageSize).map((row) => ({ ...row, lineCount: row.lines?.length })), meta: { page, pageSize, total, statusCounts, sums: result.some((row) => row.totals) ? { total: result.reduce((sum, row) => sum + (row.totals?.total ?? 0), 0) } : undefined } });
  }

  const findIn = (items, id) => {
    const found = items.find((item) => item.id === Number(id));
    if (!found) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
    return found;
  };

  // =========================================================================================================
  // Quotations
  // =========================================================================================================
  function checkQuotationHeader(body, errors) {
    if (!customerOf(body.customerId)) errors.push({ path: ["customerId"], message: "REQUIRED" });
    if (!DATE_RE.test(String(body.date ?? ""))) errors.push({ path: ["date"], message: "REQUIRED" });
    if (!DATE_RE.test(String(body.validUntil ?? ""))) errors.push({ path: ["validUntil"], message: "REQUIRED" });
    else if (DATE_RE.test(String(body.date ?? "")) && body.validUntil < body.date) errors.push({ path: ["validUntil"], message: "DATE_ORDER" });
    if (body.salesPersonId != null && !employeeOf(body.salesPersonId)) errors.push({ path: ["salesPersonId"], message: "INVALID" });
    checkLines(body, errors);
  }

  const quotationActions = {
    send: { from: ["draft"], to: "sent", worker: true },
    accept: { from: ["sent"], to: "accepted", worker: true },
    reject: { from: ["sent"], to: "rejected", worker: true },
    expire: { from: ["sent"], to: "expired", worker: true },
  };

  // =========================================================================================================
  // Sale orders: actions
  // =========================================================================================================
  const orderActions = {
    "request-confirm": { from: ["draft"], worker: true },
    approve: { from: ["draft"], to: "confirmed", manager: true },
    "reject-confirm": { from: ["draft"], manager: true, needsNote: true },
    "send-to-factory": { from: ["confirmed"], to: "in_production", worker: true },
    "mark-ready": { from: ["in_production"], to: "ready_to_deliver", worker: true },
    close: { from: ["delivered"], to: "closed", manager: true },
    cancel: { from: ["draft", "confirmed", "in_production", "ready_to_deliver"], to: "cancelled", worker: true },
  };

  // =========================================================================================================
  // Routes
  // =========================================================================================================
  const routes = {
    // ------------------------------------------------------------------ helpers for the forms
    "GET /sale/price-lookup": ({ authorization, query }) => {
      guard(authorization);
      const date = DATE_RE.test(String(query.date ?? "")) ? query.date : today();
      const ids = String(query.productIds ?? "").split(",").filter(Boolean).map(Number);
      return Object.fromEntries(ids.map((id) => [id, priceFor(id, query.customerId, date)]));
    },

    "POST /sale/availability": ({ authorization, body }) => {
      guard(authorization);
      const lines = (Array.isArray(body.lines) ? body.lines : []).filter((line) => productOf(line.productId) && Number.isInteger(line.qty) && line.qty > 0);
      return availability(lines);
    },

    // ------------------------------------------------------------------ quotations
    "GET /sale/quotations": ({ authorization, query }) => {
      guard(authorization);
      if (listShouldFail()) throw new MockHttpError(500, "INTERNAL_SERVER_ERROR", "Mock failure");
      return listOf(quotations, shapeQuotation, { query, searchFields: ["number", "customerCode", "customerName"], sorts: ["number", "date", "customerCode", "validUntil", "status", "total"] });
    },
    "GET /sale/quotations/:id": ({ authorization, params }) => {
      guard(authorization);
      return shapeQuotation(findIn(quotations, params.id));
    },
    "POST /sale/quotations": ({ authorization, body }) => {
      const { user } = guard(authorization);
      const errors = [];
      checkQuotationHeader(body, errors);
      fail(errors);
      const doc = {
        id: seq.qt++,
        number: nextNumber("QT", body.date),
        date: body.date,
        customerId: Number(body.customerId),
        salesPersonId: body.salesPersonId == null ? null : Number(body.salesPersonId),
        validUntil: body.validUntil,
        remarks: String(body.remarks ?? ""),
        status: "draft",
        lines: cleanLines(body.lines),
        log: [],
      };
      logEntry(doc, "created", "draft", user.name);
      quotations.push(doc);
      return new MockResponse({ data: shapeQuotation(doc), status: 201, message: "Created" });
    },
    "PUT /sale/quotations/:id": ({ authorization, params, body }) => {
      guard(authorization);
      const doc = findIn(quotations, params.id);
      if (doc.status !== "draft") throw wrongStatus();
      const errors = [];
      checkQuotationHeader(body, errors);
      fail(errors);
      Object.assign(doc, {
        date: body.date,
        customerId: Number(body.customerId),
        salesPersonId: body.salesPersonId == null ? null : Number(body.salesPersonId),
        validUntil: body.validUntil,
        remarks: String(body.remarks ?? ""),
        lines: cleanLines(body.lines),
      });
      return shapeQuotation(doc);
    },
    "DELETE /sale/quotations/:id": ({ authorization, params }) => {
      guard(authorization);
      const doc = findIn(quotations, params.id);
      if (doc.status !== "draft") throw wrongStatus();
      quotations.splice(quotations.indexOf(doc), 1);
      return null;
    },
    "POST /sale/quotations/:id/duplicate": ({ authorization, params }) => {
      const { user } = guard(authorization);
      const source = findIn(quotations, params.id);
      const date = today();
      const doc = {
        id: seq.qt++,
        number: nextNumber("QT", date),
        date,
        customerId: source.customerId,
        salesPersonId: source.salesPersonId,
        validUntil: addDays(date, 30),
        remarks: source.remarks,
        status: "draft",
        lines: source.lines.map((line) => ({ ...line })),
        log: [],
      };
      logEntry(doc, "created", "draft", user.name, `Copied from ${source.number}`);
      quotations.push(doc);
      return new MockResponse({ data: shapeQuotation(doc), status: 201, message: "Created" });
    },
    "POST /sale/quotations/:id/create-order": ({ authorization, params }) => {
      const { user } = guard(authorization);
      const qt = findIn(quotations, params.id);
      if (qt.status !== "accepted") throw wrongStatus();
      if (orders.some((order) => order.quotationId === qt.id && order.status !== "cancelled")) {
        throw new MockHttpError(409, "ALREADY_LINKED", "A sale order already exists for this quotation");
      }
      const date = today();
      const doc = {
        id: seq.so++,
        number: nextNumber("SO", date),
        date,
        customerId: qt.customerId,
        quotationId: qt.id,
        customerPoId: customerPos.find((po) => po.quotationId === qt.id)?.id ?? null,
        salesPersonId: qt.salesPersonId,
        deliveryDate: null,
        remarks: "",
        status: "draft",
        approval: null,
        lines: qt.lines.map((line) => ({ ...line })),
        log: [],
      };
      logEntry(doc, "created", "draft", user.name, `From ${qt.number}`);
      orders.push(doc);
      return new MockResponse({ data: shapeOrder(doc), status: 201, message: "Created" });
    },
    "POST /sale/quotations/:id/:action": ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const doc = findIn(quotations, params.id);
      if (params.action === "revert") return revert(doc, user, role, body, shapeQuotation);
      const action = quotationActions[params.action];
      if (!action) throw new MockHttpError(404, "ROUTE_NOT_FOUND", "Unknown action");
      if (!action.from.includes(doc.status)) throw wrongStatus();
      if (params.action === "reject" && !String(body.note ?? "").trim()) {
        throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [{ path: ["note"], message: "REQUIRED" }]);
      }
      doc.status = action.to;
      logEntry(doc, params.action, action.to, user.name, String(body.note ?? "").trim() || null);
      return shapeQuotation(doc);
    },

    // ------------------------------------------------------------------ customer POs
    "GET /sale/customer-pos": ({ authorization, query }) => {
      guard(authorization);
      if (listShouldFail()) throw new MockHttpError(500, "INTERNAL_SERVER_ERROR", "Mock failure");
      const rows = customerPos.map((po) => ({ ...po, date: po.poDate }));
      return listOf(rows, (row) => ({ ...shapePo(row), date: row.poDate, quotationNumber: quotations.find((q) => q.id === row.quotationId)?.number ?? null, orderNumber: orders.find((o) => o.customerPoId === row.id)?.number ?? null }), {
        query,
        searchFields: ["poNumber", "customerCode", "customerName"],
        sorts: ["poNumber", "date", "customerCode"],
      });
    },
    "GET /sale/customer-pos/:id": ({ authorization, params }) => {
      guard(authorization);
      const po = findIn(customerPos, params.id);
      return { ...shapePo(po), date: po.poDate, quotationNumber: quotations.find((q) => q.id === po.quotationId)?.number ?? null };
    },
    "POST /sale/customer-pos": ({ authorization, body }) => {
      const { user } = guard(authorization);
      const errors = checkPo(body);
      fail(errors);
      const doc = poFrom(null, body);
      doc.log = [];
      logEntry(doc, "created", null, user.name);
      customerPos.push(doc);
      return new MockResponse({ data: shapePo(doc), status: 201, message: "Created" });
    },
    "PUT /sale/customer-pos/:id": ({ authorization, params, body }) => {
      guard(authorization);
      const doc = findIn(customerPos, params.id);
      if (orders.some((order) => order.customerPoId === doc.id && order.status !== "cancelled")) throw new MockHttpError(409, "IN_USE", "An order uses this PO");
      fail(checkPo(body, doc));
      Object.assign(doc, poFrom(doc, body));
      return shapePo(doc);
    },
    "DELETE /sale/customer-pos/:id": ({ authorization, params }) => {
      guard(authorization);
      const doc = findIn(customerPos, params.id);
      if (orders.some((order) => order.customerPoId === doc.id && order.status !== "cancelled")) throw new MockHttpError(409, "IN_USE", "An order uses this PO");
      customerPos.splice(customerPos.indexOf(doc), 1);
      return null;
    },

    // ------------------------------------------------------------------ sale orders
    "GET /sale/orders": ({ authorization, query }) => {
      guard(authorization);
      if (listShouldFail()) throw new MockHttpError(500, "INTERNAL_SERVER_ERROR", "Mock failure");
      return listOf(orders, shapeOrder, { query, searchFields: ["number", "customerCode", "customerName", "quotationNumber", "customerPoNumber"], sorts: ["number", "date", "customerCode", "deliveryDate", "status", "total"] });
    },
    "GET /sale/orders/:id": ({ authorization, params }) => {
      guard(authorization);
      return shapeOrder(findIn(orders, params.id));
    },
    "POST /sale/orders": ({ authorization, body }) => {
      const { user } = guard(authorization);
      const errors = [];
      checkOrderHeader(body, errors);
      fail(errors);
      const doc = {
        id: seq.so++,
        number: nextNumber("SO", body.date),
        date: body.date,
        customerId: Number(body.customerId),
        quotationId: body.quotationId == null ? null : Number(body.quotationId),
        customerPoId: body.customerPoId == null ? null : Number(body.customerPoId),
        salesPersonId: body.salesPersonId == null ? null : Number(body.salesPersonId),
        deliveryDate: body.deliveryDate || null,
        remarks: String(body.remarks ?? ""),
        status: "draft",
        approval: null,
        lines: cleanLines(body.lines),
        log: [],
      };
      logEntry(doc, "created", "draft", user.name);
      orders.push(doc);
      return new MockResponse({ data: shapeOrder(doc), status: 201, message: "Created" });
    },
    "PUT /sale/orders/:id": ({ authorization, params, body }) => {
      guard(authorization);
      const doc = findIn(orders, params.id);
      if (doc.status !== "draft") throw wrongStatus();
      const errors = [];
      checkOrderHeader(body, errors);
      fail(errors);
      Object.assign(doc, {
        date: body.date,
        customerId: Number(body.customerId),
        quotationId: body.quotationId == null ? null : Number(body.quotationId),
        customerPoId: body.customerPoId == null ? null : Number(body.customerPoId),
        salesPersonId: body.salesPersonId == null ? null : Number(body.salesPersonId),
        deliveryDate: body.deliveryDate || null,
        remarks: String(body.remarks ?? ""),
        lines: cleanLines(body.lines),
      });
      return shapeOrder(doc);
    },
    "DELETE /sale/orders/:id": ({ authorization, params }) => {
      guard(authorization);
      const doc = findIn(orders, params.id);
      if (doc.status !== "draft") throw wrongStatus();
      orders.splice(orders.indexOf(doc), 1);
      return null;
    },
    "POST /sale/orders/:id/delivery-notes": ({ authorization, params }) => {
      const { user } = guard(authorization);
      const order = findIn(orders, params.id);
      if (order.status !== "ready_to_deliver") throw wrongStatus();
      const lines = order.lines
        .map((line) => ({ productId: line.productId, deliverNow: line.qty - deliveredQty(order.id, line.productId) - pendingQty(order.id, line.productId) }))
        .filter((line) => line.deliverNow > 0);
      if (lines.length === 0) throw new MockHttpError(409, "NOTHING_TO_DELIVER", "Everything is already on a delivery note");
      const date = today();
      const doc = {
        id: seq.dn++,
        number: nextNumber("DN", date),
        date,
        saleOrderId: order.id,
        customerId: order.customerId,
        warehouseId: store().warehouses.find((row) => row.type === "FINISHED_GOODS")?.id ?? 2,
        status: "draft",
        lines,
        log: [],
      };
      logEntry(doc, "created", "draft", user.name, `From ${order.number}`);
      deliveries.push(doc);
      return new MockResponse({ data: shapeDelivery(doc), status: 201, message: "Created" });
    },
    "POST /sale/orders/:id/:action": ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const doc = findIn(orders, params.id);
      if (params.action === "revert") return revert(doc, user, role, body, shapeOrder);
      const action = orderActions[params.action];
      if (!action) throw new MockHttpError(404, "ROUTE_NOT_FOUND", "Unknown action");
      if (action.manager && !isManager(role)) throw forbid();
      if (!action.from.includes(doc.status)) throw wrongStatus();
      const note = String(body.note ?? "").trim();
      const needReason = (action.needsNote || params.action === "cancel") && true;

      if (params.action === "cancel") {
        // Draft / Confirmed: any Sale user. Later steps: Manager or Admin, with a reason (spec Q6).
        const early = ["draft", "confirmed"].includes(doc.status);
        if (!early && !isManager(role)) throw forbid();
        if (!early && !note) throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [{ path: ["note"], message: "REQUIRED" }]);
      } else if (needReason && !note) {
        throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [{ path: ["note"], message: "REQUIRED" }]);
      }

      if (params.action === "request-confirm") {
        if (doc.approval === "requested") throw wrongStatus();
        doc.approval = "requested";
        logEntry(doc, "request-confirm", null, user.name, note || null);
      } else if (params.action === "reject-confirm") {
        if (doc.approval !== "requested") throw wrongStatus();
        doc.approval = null;
        logEntry(doc, "reject-confirm", null, user.name, note);
      } else {
        doc.status = action.to;
        if (params.action === "approve") doc.approval = null;
        logEntry(doc, params.action, action.to, user.name, note || null);
      }
      return shapeOrder(doc);
    },

    // ------------------------------------------------------------------ delivery notes
    "GET /sale/deliveries": ({ authorization, query }) => {
      guard(authorization);
      if (listShouldFail()) throw new MockHttpError(500, "INTERNAL_SERVER_ERROR", "Mock failure");
      return listOf(deliveries, shapeDelivery, { query, searchFields: ["number", "saleOrderNumber", "customerCode", "customerName"], sorts: ["number", "date", "saleOrderNumber", "customerCode", "status"] });
    },
    "GET /sale/deliveries/:id": ({ authorization, params }) => {
      guard(authorization);
      return shapeDelivery(findIn(deliveries, params.id));
    },
    "PUT /sale/deliveries/:id": ({ authorization, params, body }) => {
      guard(authorization);
      const doc = findIn(deliveries, params.id);
      if (doc.status !== "draft") throw wrongStatus();
      const order = orders.find((item) => item.id === doc.saleOrderId);
      const errors = [];
      const lines = Array.isArray(body.lines) ? body.lines : [];
      lines.forEach((line, index) => {
        const ordered = order.lines.find((item) => item.productId === Number(line.productId));
        const remaining = (ordered?.qty ?? 0) - deliveredQty(order.id, Number(line.productId), doc.id) - pendingQty(order.id, Number(line.productId), doc.id);
        if (!ordered) errors.push({ path: ["lines", index, "productId"], message: "INVALID" });
        else if (!Number.isInteger(line.deliverNow) || line.deliverNow < 0 || line.deliverNow > remaining) errors.push({ path: ["lines", index, "deliverNow"], message: "INVALID" });
      });
      if (!DATE_RE.test(String(body.date ?? ""))) errors.push({ path: ["date"], message: "REQUIRED" });
      if (!store().warehouses.some((row) => row.id === Number(body.warehouseId))) errors.push({ path: ["warehouseId"], message: "REQUIRED" });
      fail(errors);
      doc.date = body.date;
      doc.warehouseId = Number(body.warehouseId);
      doc.lines = lines.map((line) => ({ productId: Number(line.productId), deliverNow: line.deliverNow }));
      return shapeDelivery(doc);
    },
    "DELETE /sale/deliveries/:id": ({ authorization, params }) => {
      guard(authorization);
      const doc = findIn(deliveries, params.id);
      if (doc.status !== "draft") throw wrongStatus();
      deliveries.splice(deliveries.indexOf(doc), 1);
      return null;
    },
    "POST /sale/deliveries/:id/:action": ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const doc = findIn(deliveries, params.id);
      if (params.action === "revert") return revertDelivery(doc, user, role, body);
      if (params.action !== "confirm") throw new MockHttpError(404, "ROUTE_NOT_FOUND", "Unknown action");
      if (doc.status !== "draft") throw wrongStatus();
      if (doc.lines.every((line) => line.deliverNow === 0)) {
        throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [{ path: ["lines"], message: "REQUIRED" }]);
      }
      doc.status = "delivered";
      logEntry(doc, "confirm", "delivered", user.name, String(body.note ?? "").trim() || null);
      // When every line of the order is delivered, the order is delivered (a person confirmed the last note).
      const order = orders.find((item) => item.id === doc.saleOrderId);
      if (order.lines.every((line) => deliveredQty(order.id, line.productId) >= line.qty)) {
        order.status = "delivered";
        logEntry(order, "delivered", "delivered", user.name, doc.number);
      }
      return shapeDelivery(doc);
    },
  };

  // quantities already placed on DRAFT delivery notes of the order (so a second note cannot double them)
  function pendingQty(saleOrderId, productId, exceptDnId) {
    return deliveries
      .filter((dn) => dn.saleOrderId === saleOrderId && dn.status === "draft" && dn.id !== exceptDnId)
      .reduce((sum, dn) => sum + (dn.lines.find((line) => line.productId === productId)?.deliverNow ?? 0), 0);
  }

  function listShouldFail() {
    try {
      return (window.localStorage.getItem("kanou.mockFail") ?? "").split(",").map((s) => s.trim()).includes("sale");
    } catch {
      return false;
    }
  }

  function checkOrderHeader(body, errors) {
    if (!customerOf(body.customerId)) errors.push({ path: ["customerId"], message: "REQUIRED" });
    if (!DATE_RE.test(String(body.date ?? ""))) errors.push({ path: ["date"], message: "REQUIRED" });
    if (body.deliveryDate && !DATE_RE.test(String(body.deliveryDate))) errors.push({ path: ["deliveryDate"], message: "INVALID" });
    else if (body.deliveryDate && body.deliveryDate < body.date) errors.push({ path: ["deliveryDate"], message: "DATE_ORDER" });
    if (body.salesPersonId != null && !employeeOf(body.salesPersonId)) errors.push({ path: ["salesPersonId"], message: "INVALID" });
    if (body.quotationId != null) {
      const qt = quotations.find((item) => item.id === Number(body.quotationId));
      if (!qt || qt.customerId !== Number(body.customerId)) errors.push({ path: ["quotationId"], message: "INVALID" });
    }
    if (body.customerPoId != null) {
      const po = customerPos.find((item) => item.id === Number(body.customerPoId));
      if (!po || po.customerId !== Number(body.customerId)) errors.push({ path: ["customerPoId"], message: "INVALID" });
    }
    checkLines(body, errors);
  }

  function checkPo(body, existing) {
    const errors = [];
    if (!String(body.poNumber ?? "").trim()) errors.push({ path: ["poNumber"], message: "REQUIRED" });
    else if (customerPos.some((po) => po !== existing && po.customerId === Number(body.customerId) && po.poNumber.toLowerCase() === String(body.poNumber).trim().toLowerCase())) {
      errors.push({ path: ["poNumber"], message: "PO_NUMBER_EXISTS" });
    }
    if (!DATE_RE.test(String(body.poDate ?? ""))) errors.push({ path: ["poDate"], message: "REQUIRED" });
    if (!customerOf(body.customerId)) errors.push({ path: ["customerId"], message: "REQUIRED" });
    if (body.quotationId != null && !quotations.some((qt) => qt.id === Number(body.quotationId) && qt.customerId === Number(body.customerId))) errors.push({ path: ["quotationId"], message: "INVALID" });
    if (body.attachment && (!body.attachment.name || !(body.attachment.size > 0) || body.attachment.size > 10 * 1024 * 1024)) errors.push({ path: ["attachment"], message: "INVALID" });
    return errors;
  }

  function poFrom(existing, body) {
    return {
      id: existing?.id ?? seq.po++,
      poNumber: String(body.poNumber).trim(),
      poDate: body.poDate,
      customerId: Number(body.customerId),
      quotationId: body.quotationId == null ? null : Number(body.quotationId),
      attachment: body.attachment ? { name: body.attachment.name, size: body.attachment.size, url: body.attachment.url } : null,
      note: String(body.note ?? ""),
      log: existing?.log ?? [],
    };
  }

  // Revert one step (Manager / Admin, reason required): back to the status before the latest change.
  function revert(doc, user, role, body, shape) {
    if (!isManager(role)) throw forbid();
    const note = String(body.note ?? "").trim();
    if (!note) throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [{ path: ["note"], message: "REQUIRED" }]);
    const previous = statusBefore(doc);
    if (!previous) throw wrongStatus();
    // The order delivered by a confirmed delivery note must be reverted from that note.
    if (doc.status === "delivered" && deliveries.some((dn) => dn.saleOrderId === doc.id && dn.status === "delivered")) {
      throw new MockHttpError(409, "INVALID_STATUS", "Revert the delivery notes first");
    }
    doc.status = previous;
    logEntry(doc, "revert", previous, user.name, note);
    return shape(doc);
  }

  function revertDelivery(doc, user, role, body) {
    if (!isManager(role)) throw forbid();
    const note = String(body.note ?? "").trim();
    if (!note) throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [{ path: ["note"], message: "REQUIRED" }]);
    if (doc.status !== "delivered") throw wrongStatus();
    doc.status = "draft";
    logEntry(doc, "revert", "draft", user.name, note);
    const order = orders.find((item) => item.id === doc.saleOrderId);
    if (order.status === "delivered" || order.status === "closed") {
      if (order.status === "closed") throw new MockHttpError(409, "INVALID_STATUS", "Revert the order from Closed first");
      order.status = "ready_to_deliver";
      logEntry(order, "revert", "ready_to_deliver", user.name, doc.number);
    }
    return shapeDelivery(doc);
  }

  // =========================================================================================================
  // Seed data (customers C001-C003 = 1-3, products RF-2D = 1 and RF-1D = 2, employees E001-E003 = 1-3)
  // =========================================================================================================
  const seedQuotations = [
    { customerId: 1, date: "2026-09-02", status: "accepted", lines: [[1, 20, 64000], [2, 10, 38500]], by: "Alice Sato", sp: 1, note: "Customer accepted by phone" },
    { customerId: 2, date: "2026-09-04", status: "sent", lines: [[1, 10, 66000]], by: "Nina Sato", sp: 2 },
    { customerId: 3, date: "2026-09-08", status: "draft", lines: [[2, 40, 41000]], by: "Nina Sato", sp: 1 },
    { customerId: 1, date: "2026-08-20", status: "rejected", lines: [[1, 5, 64000]], by: "Alice Sato", sp: 3, note: "Price too high" },
    { customerId: 2, date: "2026-07-01", status: "sent", lines: [[2, 15, 39800]], by: "Alice Sato", sp: 1, validUntil: "2026-07-31" },
    { customerId: 3, date: "2026-09-15", status: "accepted", lines: [[1, 30, 67500], [2, 20, 41000]], by: "Nina Sato", sp: 2 },
    { customerId: 1, date: "2026-06-10", status: "expired", lines: [[2, 8, 38500]], by: "Alice Sato", sp: 1, validUntil: "2026-07-10" },
    { customerId: 2, date: "2026-09-22", status: "sent", lines: [[1, 12, 66000], [2, 6, 39800]], by: "Nina Sato", sp: 3 },
    { customerId: 4, date: "2026-09-25", status: "draft", lines: [[1, 4, 68000]], by: "Nina Sato", sp: 1 },
    { customerId: 5, date: "2026-09-27", status: "accepted", lines: [[2, 50, 41000]], by: "Alice Sato", sp: 2 },
    { customerId: 1, date: "2026-10-01", status: "sent", lines: [[1, 25, 64000]], by: "Nina Sato", sp: 1 },
    { customerId: 6, date: "2026-10-02", status: "draft", lines: [[1, 2, 68000], [2, 2, 41000]], by: "Alice Sato", sp: 3 },
  ];
  seedQuotations.forEach((seed, index) => {
    const validUntil = seed.validUntil ?? addDays(seed.date, 30);
    const doc = {
      id: seq.qt++,
      number: seedNumber("QT", seed.date, index + 1),
      date: seed.date,
      customerId: seed.customerId,
      salesPersonId: seed.sp,
      validUntil,
      remarks: "",
      status: seed.status,
      lines: seed.lines.map(([productId, qty, unitPrice]) => ({ productId, qty, unitPrice })),
      log: [],
    };
    logEntry(doc, "created", "draft", seed.by, null, `${seed.date}T09:00:00.000Z`);
    if (seed.status !== "draft") logEntry(doc, "send", "sent", seed.by, null, `${addDays(seed.date, 1)}T10:00:00.000Z`);
    if (["accepted", "rejected", "expired"].includes(seed.status)) {
      const action = { accepted: "accept", rejected: "reject", expired: "expire" }[seed.status];
      logEntry(doc, action, seed.status, seed.by, seed.note ?? null, `${addDays(seed.date, 5)}T15:00:00.000Z`);
    }
    quotations.push(doc);
  });

  // A small real file for the seed attachments, so Open works in the demo (the real API serves the uploaded file).
  function sampleFile(name, text) {
    if (name.endsWith(".pdf")) {
      const stream = `BT /F1 24 Tf 72 720 Td (${text}) Tj ET`;
      const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      ];
      let pdf = "%PDF-1.4\n";
      const offsets = [];
      objects.forEach((body, index) => {
        offsets.push(pdf.length);
        pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
      });
      const xref = pdf.length;
      pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
      pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
    }
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 400;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 600, 400);
    context.fillStyle = "#1f2937";
    context.font = "28px sans-serif";
    context.fillText(text, 40, 200);
    return canvas.toDataURL("image/png");
  }

  const seedPos = [
    { poNumber: "ABC-PO-0912", poDate: "2026-09-10", customerId: 1, quotationId: 1, attachment: { name: "ABC-PO-0912.pdf", size: 184320 } },
    { poNumber: "SKR-2290", poDate: "2026-09-20", customerId: 3, quotationId: 6, attachment: null },
    { poNumber: "BHM-0045", poDate: "2026-09-12", customerId: 2, quotationId: null, attachment: { name: "BHM-0045.png", size: 92160 } },
    { poNumber: "FJI-1177", poDate: "2026-09-29", customerId: 5, quotationId: 10, attachment: null },
    { poNumber: "ABC-PO-1001", poDate: "2026-10-02", customerId: 1, quotationId: null, attachment: null },
  ];
  seedPos.forEach((seed) => {
    const doc = { id: seq.po++, ...seed, note: "", log: [] };
    if (doc.attachment) doc.attachment = { ...doc.attachment, url: sampleFile(doc.attachment.name, `Customer PO ${seed.poNumber} (sample file)`) };
    logEntry(doc, "created", null, "Alice Sato", null, `${seed.poDate}T11:00:00.000Z`);
    customerPos.push(doc);
  });

  // [customerId, qtId, poId, status, lines, deliveryDate, date, extra log]
  const seedOrders = [
    { customerId: 1, quotationId: 1, customerPoId: 1, date: "2026-09-11", status: "in_production", lines: [[1, 20, 64000], [2, 10, 38500]], deliveryDate: "2026-10-20", by: "Alice Sato", sp: 1 },
    { customerId: 3, quotationId: 6, customerPoId: 2, date: "2026-09-21", status: "ready_to_deliver", lines: [[1, 30, 67500], [2, 20, 41000]], deliveryDate: "2026-10-12", by: "Alice Sato", sp: 2 },
    { customerId: 5, quotationId: 10, customerPoId: 4, date: "2026-09-30", status: "draft", approval: "requested", lines: [[2, 50, 41000]], deliveryDate: "2026-11-05", by: "Nina Sato", sp: 2 },
    { customerId: 2, quotationId: null, customerPoId: 3, date: "2026-09-14", status: "delivered", lines: [[1, 6, 66000]], deliveryDate: "2026-09-28", by: "Alice Sato", sp: 3 },
    { customerId: 1, quotationId: null, customerPoId: null, date: "2026-08-15", status: "closed", lines: [[2, 12, 38500]], deliveryDate: "2026-09-05", by: "Alice Sato", sp: 1 },
    { customerId: 4, quotationId: null, customerPoId: null, date: "2026-09-05", status: "cancelled", lines: [[1, 3, 68000]], deliveryDate: null, by: "Nina Sato", sp: 1, note: "Customer postponed the project" },
    { customerId: 6, quotationId: null, customerPoId: null, date: "2026-10-01", status: "confirmed", lines: [[1, 10, 68000]], deliveryDate: "2026-10-30", by: "Alice Sato", sp: 3 },
    { customerId: 1, quotationId: null, customerPoId: null, date: "2026-10-03", status: "draft", lines: [[2, 5, 38500]], deliveryDate: null, by: "Nina Sato", sp: 1 },
  ];
  const flow = ["draft", "confirmed", "in_production", "ready_to_deliver", "delivered", "closed"];
  const flowAction = { confirmed: "approve", in_production: "send-to-factory", ready_to_deliver: "mark-ready", delivered: "delivered", closed: "close" };
  seedOrders.forEach((seed, index) => {
    const doc = {
      id: seq.so++,
      number: seedNumber("SO", seed.date, index + 1),
      date: seed.date,
      customerId: seed.customerId,
      quotationId: seed.quotationId,
      customerPoId: seed.customerPoId,
      salesPersonId: seed.sp,
      deliveryDate: seed.deliveryDate,
      remarks: "",
      status: seed.status,
      approval: seed.approval ?? null,
      lines: seed.lines.map(([productId, qty, unitPrice]) => ({ productId, qty, unitPrice })),
      log: [],
    };
    logEntry(doc, "created", "draft", seed.by, null, `${seed.date}T09:30:00.000Z`);
    if (seed.approval === "requested") logEntry(doc, "request-confirm", null, seed.by, "Please confirm, delivery date agreed", `${seed.date}T10:00:00.000Z`);
    if (seed.status === "cancelled") {
      logEntry(doc, "cancel", "cancelled", seed.by, seed.note, `${addDays(seed.date, 2)}T10:00:00.000Z`);
    } else {
      const reached = flow.indexOf(seed.status);
      for (let step = 1; step <= reached; step += 1) {
        const status = flow[step];
        logEntry(doc, flowAction[status], status, step <= 1 ? "Alice Sato" : seed.by, null, `${addDays(seed.date, step)}T10:00:00.000Z`);
      }
    }
    orders.push(doc);
  });

  // Delivery notes: a delivered one for the delivered order (SO-0004), a partial one for the order ready to deliver
  const seedDeliveries = [
    { saleOrderId: 4, date: "2026-09-28", status: "delivered", lines: [{ productId: 1, deliverNow: 6 }], by: "Nina Sato" },
    { saleOrderId: 2, date: "2026-10-03", status: "delivered", lines: [{ productId: 1, deliverNow: 18 }, { productId: 2, deliverNow: 20 }], by: "Nina Sato" },
    { saleOrderId: 2, date: "2026-10-04", status: "draft", lines: [{ productId: 1, deliverNow: 12 }], by: "Nina Sato" },
    { saleOrderId: 5, date: "2026-09-04", status: "delivered", lines: [{ productId: 2, deliverNow: 12 }], by: "Alice Sato" },
  ];
  seedDeliveries.forEach((seed, index) => {
    const order = orders.find((item) => item.id === seed.saleOrderId);
    const doc = {
      id: seq.dn++,
      number: seedNumber("DN", seed.date, index + 1),
      date: seed.date,
      saleOrderId: order.id,
      customerId: order.customerId,
      warehouseId: 2,
      status: seed.status,
      lines: seed.lines,
      log: [],
    };
    logEntry(doc, "created", "draft", seed.by, `From ${order.number}`, `${seed.date}T08:00:00.000Z`);
    if (seed.status === "delivered") logEntry(doc, "confirm", "delivered", seed.by, null, `${seed.date}T16:00:00.000Z`);
    deliveries.push(doc);
  });

  return routes;
}
