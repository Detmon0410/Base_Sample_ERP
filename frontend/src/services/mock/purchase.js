// In-memory Purchase documents for VITE_USE_MOCK=true (docs/specs/f9-purchase.md): the stock status board, Purchase
// Orders and Goods Receipts. A status only changes when a person calls an action; the one exception is posting the
// receipt that completes a PO. Posting a receipt books the accepted quantity into the Stock ledger. The data lives
// until a full reload.

import { MockHttpError, MockResponse } from "./errors.js";
import { stockStatusOf } from "./stock.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const matches = (value, text) => String(value ?? "").toLowerCase().includes(text);
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000);
const round3 = (value) => Math.round(value * 1000) / 1000;
const TAX_RATE = 0.1;
const WHOLE_UNITS = ["pcs", "set", "box"];
const REJECT_REASONS = ["damaged", "wrong_item", "wrong_quantity", "quality", "other"];
const at = (date, time) => `${date}T${time}:00.000Z`;

export const PO_STATUSES = ["draft", "sent", "partially_received", "received", "closed", "cancelled"];
export const RECEIPT_STATUSES = ["draft", "posted", "cancelled"];

const forbid = () => new MockHttpError(403, "FORBIDDEN", "You may not do this");
const wrongStatus = () => new MockHttpError(409, "INVALID_STATUS", "This is not possible in the current status");
const invalid = (path, message = "INVALID") => new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [{ path: [path], message }]);

// Who may do what (spec 4): Purchase Worker drafts and receives goods, Purchase Manager and Admin also send, cancel,
// close and revert. Anybody else gets 403.
function purchaseRole(user) {
  if (user.memberships.some((membership) => membership.role === "Admin")) return "Admin";
  return user.memberships.find((membership) => membership.department === "Purchase")?.role ?? null;
}
const isManager = (role) => role === "Manager" || role === "Admin";

const counters = {};
function nextNumber(prefix, date) {
  const key = `${prefix}-${String(date).slice(0, 4)}`;
  counters[key] = (counters[key] ?? 0) + 1;
  return `${key}-${String(counters[key]).padStart(4, "0")}`;
}
function seedNumber(prefix, date, serial) {
  const key = `${prefix}-${String(date).slice(0, 4)}`;
  counters[key] = Math.max(counters[key] ?? 0, serial);
  return `${key}-${String(serial).padStart(4, "0")}`;
}

export function purchaseRoutes({ userFromAuthorization, getStore, ledger, onPurchase, getAccounting = () => null }) {
  const store = () => getStore();
  const orders = [];
  const receipts = [];
  let seq = { po: 1, gr: 1 };
  let logId = 1;

  const guard = (authorization) => {
    const user = userFromAuthorization(authorization);
    const role = purchaseRole(user);
    if (!role) throw new MockHttpError(403, "FORBIDDEN", "Purchase department only");
    return { user, role };
  };

  const supplierOf = (id) => store().suppliers.find((row) => row.id === Number(id));
  const materialOf = (id) => store().materials.find((row) => row.id === Number(id));
  const warehouseOf = (id) => store().warehouses.find((row) => row.id === Number(id));
  const linkOf = (supplierId, materialId) => store().supplierLinks.find((row) => row.supplierId === Number(supplierId) && row.materialId === Number(materialId));
  const findIn = (items, id) => {
    const found = items.find((item) => item.id === Number(id));
    if (!found) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
    return found;
  };
  const fail = (errors) => {
    if (errors.length) throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", errors);
  };
  const noteOf = (body) => String(body.note ?? "").trim();
  const needNote = (note) => {
    if (!note) throw invalid("note", "REQUIRED");
  };

  function logEntry(doc, action, status, actor, note, when = new Date().toISOString()) {
    doc.log.push({ id: logId++, action, status, actor, at: when, note });
  }
  const historyOf = (doc) =>
    [...doc.log].sort((a, b) => b.id - a.id).map((entry) => ({ id: entry.id, action: entry.action, status: entry.status, actor: entry.actor, at: entry.at, note: entry.note ?? null }));
  const statusBefore = (doc) => {
    const changes = doc.log.filter((entry) => entry.status);
    return changes.length >= 2 ? changes[changes.length - 2].status : null;
  };

  // ---- quantities of a PO ----
  const receiptsOf = (po) => receipts.filter((gr) => gr.poId === po.id);
  const postedOf = (po) => receiptsOf(po).filter((gr) => gr.status === "posted");
  const receivedOf = (po, materialId) =>
    round3(postedOf(po).reduce((sum, gr) => sum + (gr.lines.find((line) => line.materialId === materialId)?.accepted ?? 0), 0));
  const openOf = (po, line) => Math.max(0, round3(line.qty - receivedOf(po, line.materialId)));
  const isOpenPo = (po) => ["sent", "partially_received"].includes(po.status);
  const totalsOf = (lines) => {
    const subtotal = lines.reduce((sum, line) => sum + Math.round(line.qty * line.unitPrice), 0);
    const tax = Math.floor(subtotal * TAX_RATE);
    return { subtotal, tax, total: subtotal + tax, taxRate: TAX_RATE };
  };

  // what is on order: the open quantity of Sent / Partially received POs (shown next to the stock balances)
  ledger?.addOnOrder(() =>
    orders
      .filter(isOpenPo)
      .flatMap((po) => po.lines.map((line) => ({ materialId: line.materialId, qty: openOf(po, line), po: { id: po.id, number: po.number, supplier: supplierOf(po.supplierId)?.name, expectedDate: po.expectedDate ?? null, status: po.status } })))
      .filter((row) => row.qty > 0),
  );

  // ---- shaping ----
  function shapeLine(po, line) {
    const material = materialOf(line.materialId);
    const received = receivedOf(po, line.materialId);
    return {
      materialId: line.materialId,
      materialCode: material?.code,
      materialName: material?.name,
      uom: material?.uom,
      qty: line.qty,
      unitPrice: line.unitPrice,
      amount: Math.round(line.qty * line.unitPrice),
      listPrice: linkOf(po.supplierId, line.materialId)?.priceJpy ?? null,
      received,
      open: Math.max(0, round3(line.qty - received)),
    };
  }

  // the supplier bills of the Accounting module; until the first one is made there is a placeholder
  const billLinks = (bills, poId) => (bills.length ? bills.map((bill) => ({ id: `bill-${bill.id}`, type: "supplierBill", number: bill.number, status: bill.status, to: `/accounting/bills/${bill.id}` })) : [{ id: `bill-${poId}`, type: "supplierBill", number: null }]);

  function shapePo(po) {
    const supplier = supplierOf(po.supplierId);
    const warehouse = warehouseOf(po.warehouseId);
    const lines = po.lines.map((line) => shapeLine(po, line));
    const ordered = lines.reduce((sum, line) => sum + line.qty, 0);
    const received = lines.reduce((sum, line) => sum + Math.min(line.received, line.qty), 0);
    const late = isOpenPo(po) && po.expectedDate && po.expectedDate < today() ? daysBetween(po.expectedDate, today()) : 0;
    const grs = receiptsOf(po);
    return {
      id: po.id,
      number: po.number,
      date: po.date,
      status: po.status,
      supplierId: po.supplierId,
      supplierCode: supplier?.code,
      supplierName: supplier?.name,
      supplierContact: [supplier?.contactPerson, supplier?.contactPhone, supplier?.contactEmail].filter(Boolean).join(" · "),
      supplierAddress: supplier?.address ?? "",
      expectedDate: po.expectedDate ?? null,
      warehouseId: po.warehouseId,
      warehouseName: warehouse?.name,
      buyer: po.buyer,
      createdById: po.createdById,
      remarks: po.remarks ?? "",
      lines,
      lineCount: lines.length,
      ...totalsOf(lines),
      progress: { ordered: round3(ordered), received: round3(received), percent: ordered > 0 ? Math.round((received / ordered) * 100) : 0, lateDays: late, late: late > 0 },
      receipts: grs.map((gr) => ({ id: gr.id, number: gr.number, date: gr.date, status: gr.status, accepted: round3(gr.lines.reduce((sum, line) => sum + line.accepted, 0)) })),
      history: historyOf(po),
      links: [
        ...grs.map((gr) => ({ id: `gr-${gr.id}`, type: "goodsReceipt", number: gr.number, status: gr.status, to: `/purchase/receipts/${gr.id}` })),
        ...billLinks(getAccounting()?.billsOfOrder(po.id) ?? [], po.id),
      ],
    };
  }

  function shapeReceipt(gr) {
    const po = orders.find((row) => row.id === gr.poId);
    const supplier = supplierOf(po?.supplierId);
    const lines = gr.lines.map((line) => {
      const material = materialOf(line.materialId);
      const poLine = po?.lines.find((item) => item.materialId === line.materialId);
      // "open" is what could still be received now: ordered minus the accepted quantity of the POSTED receipts (a draft counts for itself)
      const before = gr.status === "posted" ? round3(receivedOf(po, line.materialId) - line.accepted) : receivedOf(po, line.materialId);
      return {
        materialId: line.materialId,
        materialCode: material?.code,
        materialName: material?.name,
        uom: material?.uom,
        ordered: poLine?.qty ?? 0,
        receivedBefore: Math.max(0, before),
        open: Math.max(0, round3((poLine?.qty ?? 0) - before)),
        delivered: line.delivered,
        accepted: line.accepted,
        rejected: round3(line.delivered - line.accepted),
        rejectReason: line.rejectReason ?? "",
        rejectNote: line.rejectNote ?? "",
        lot: line.lot ?? "",
      };
    });
    return {
      id: gr.id,
      number: gr.number,
      date: gr.date,
      status: gr.status,
      poId: gr.poId,
      poNumber: po?.number,
      poStatus: po?.status,
      supplierId: po?.supplierId,
      supplierCode: supplier?.code,
      supplierName: supplier?.name,
      warehouseId: gr.warehouseId,
      warehouseName: warehouseOf(gr.warehouseId)?.name,
      deliveryNoteNo: gr.deliveryNoteNo ?? "",
      remarks: gr.remarks ?? "",
      receivedBy: gr.receivedBy,
      createdById: gr.createdById,
      lines,
      accepted: round3(lines.reduce((sum, line) => sum + line.accepted, 0)),
      history: historyOf(gr),
      links: [
        ...(po ? [{ id: `po-${po.id}`, type: "purchaseOrder", number: po.number, status: po.status, to: `/purchase/orders/${po.id}` }] : []),
        ...(gr.status === "posted" ? [{ id: `mv-${gr.id}`, type: "movement", number: gr.number, status: null, to: `/stock/movements?q=${gr.number}` }] : []),
        ...(getAccounting()?.billsOfReceipt(gr.id) ?? []).map((bill) => ({ id: `bill-${bill.id}`, type: "supplierBill", number: bill.number, status: bill.status, to: `/accounting/bills/${bill.id}` })),
      ],
    };
  }

  // ---- list helper ----
  function listOf(rows, { query, searchFields, sorts, defaultSort, dateField, extra = () => true, sumFields = [] }) {
    const text = String(query.q ?? "").trim().toLowerCase();
    const status = query.status && query.status !== "all" ? query.status : null;
    const others = rows.filter(
      (row) =>
        (!query.from || (row[dateField] ?? "") >= query.from) &&
        (!query.to || (row[dateField] ?? "") <= query.to) &&
        (!query.supplier || row.supplierId === Number(query.supplier)) &&
        extra(row, query) &&
        (!text || searchFields.some((field) => matches(row[field], text))),
    );
    const statusCounts = {};
    others.forEach((row) => (statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1));
    let result = status ? others.filter((row) => row.status === status) : others;
    const sortKey = String(query.sort ?? defaultSort);
    const descending = sortKey.startsWith("-");
    const field = descending ? sortKey.slice(1) : sortKey;
    if (sorts.includes(field)) {
      result = [...result].sort((a, b) => {
        const left = a[field];
        const right = b[field];
        let order;
        if (left == null || left === "") order = right == null || right === "" ? 0 : 1;
        else if (right == null || right === "") order = -1;
        else order = typeof left === "number" ? left - right : String(left).localeCompare(String(right));
        return (descending ? -order : order) || b.id - a.id;
      });
    }
    const pageSize = Math.min(Number(query.pageSize) || 20, 100);
    const total = result.length;
    const page = Math.min(Math.max(Number(query.page) || 1, 1), Math.max(1, Math.ceil(total / pageSize)));
    return new MockResponse({ data: result.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total, statusCounts, ...(sumFields.length ? { sums: Object.fromEntries(sumFields.map((field) => [field, result.reduce((sum, row) => sum + (row[field] ?? 0), 0)])) } : {}) } });
  }

  // ---- validation ----
  const qtyOk = (material, qty) => typeof qty === "number" && Number.isFinite(qty) && qty > 0 && (WHOLE_UNITS.includes(material?.uom) ? Number.isInteger(qty) : Math.abs(qty * 1000 - Math.round(qty * 1000)) < 1e-6);
  function checkOrder(body, errors) {
    const supplier = supplierOf(body.supplierId);
    if (!supplier || supplier.status === "inactive") errors.push({ path: ["supplierId"], message: supplier ? "INACTIVE" : "REQUIRED" });
    const warehouse = warehouseOf(body.warehouseId);
    if (!warehouse || warehouse.type !== "RAW_MATERIAL") errors.push({ path: ["warehouseId"], message: "REQUIRED" });
    if (!DATE_RE.test(String(body.date ?? ""))) errors.push({ path: ["date"], message: "REQUIRED" });
    if (body.expectedDate && !DATE_RE.test(String(body.expectedDate))) errors.push({ path: ["expectedDate"], message: "INVALID" });
    else if (body.expectedDate && body.date && body.expectedDate < body.date) errors.push({ path: ["expectedDate"], message: "DATE_ORDER" });
    if (String(body.remarks ?? "").length > 500) errors.push({ path: ["remarks"], message: "TOO_LONG" });
    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (lines.length === 0) errors.push({ path: ["lines"], message: "REQUIRED" });
    const seen = new Set();
    lines.forEach((line, index) => {
      const material = materialOf(line.materialId);
      if (!material || material.status === "inactive") errors.push({ path: ["lines", index, "materialId"], message: material ? "INACTIVE" : "REQUIRED" });
      else if (supplier && !linkOf(supplier.id, material.id)) errors.push({ path: ["lines", index, "materialId"], message: "NOT_SUPPLIED" });
      else if (seen.has(material.id)) errors.push({ path: ["lines", index, "materialId"], message: "DUPLICATE" });
      if (material) seen.add(material.id);
      if (!qtyOk(material, line.qty)) errors.push({ path: ["lines", index, "qty"], message: line.qty == null ? "REQUIRED" : "INVALID" });
      if (typeof line.unitPrice !== "number" || !Number.isFinite(line.unitPrice) || line.unitPrice < 0 || !Number.isInteger(line.unitPrice)) errors.push({ path: ["lines", index, "unitPrice"], message: line.unitPrice == null ? "REQUIRED" : "INVALID" });
    });
  }
  const cleanLines = (lines) => lines.map((line) => ({ materialId: Number(line.materialId), qty: line.qty, unitPrice: line.unitPrice }));
  const mayEdit = (po, user, role) => isManager(role) || po.createdById === user.id;

  function checkReceipt(body, errors, existing) {
    const po = orders.find((row) => row.id === Number(body.poId ?? existing?.poId));
    if (!po || !isOpenPo(po)) errors.push({ path: ["poId"], message: po ? "INVALID_STATUS" : "REQUIRED" });
    if (!DATE_RE.test(String(body.date ?? ""))) errors.push({ path: ["date"], message: "REQUIRED" });
    const warehouse = warehouseOf(body.warehouseId);
    if (!warehouse || warehouse.type !== "RAW_MATERIAL") errors.push({ path: ["warehouseId"], message: "REQUIRED" });
    if (String(body.remarks ?? "").length > 500) errors.push({ path: ["remarks"], message: "TOO_LONG" });
    const lines = Array.isArray(body.lines) ? body.lines : [];
    let delivered = 0;
    lines.forEach((line, index) => {
      const poLine = po?.lines.find((item) => item.materialId === Number(line.materialId));
      const material = materialOf(line.materialId);
      if (!poLine) {
        errors.push({ path: ["lines", index, "materialId"], message: "INVALID" });
        return;
      }
      const whole = WHOLE_UNITS.includes(material?.uom);
      const num = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && (whole ? Number.isInteger(value) : Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6);
      if (!num(line.delivered)) errors.push({ path: ["lines", index, "delivered"], message: line.delivered == null ? "REQUIRED" : "INVALID" });
      if (!num(line.accepted)) errors.push({ path: ["lines", index, "accepted"], message: line.accepted == null ? "REQUIRED" : "INVALID" });
      else if (num(line.delivered) && line.accepted > line.delivered) errors.push({ path: ["lines", index, "accepted"], message: "INVALID" });
      else if (line.accepted > openOf(po, poLine) + 1e-9) errors.push({ path: ["lines", index, "accepted"], message: "TOO_MANY" });
      if (num(line.delivered) && num(line.accepted) && line.delivered > line.accepted) {
        if (!REJECT_REASONS.includes(line.rejectReason)) errors.push({ path: ["lines", index, "rejectReason"], message: "REQUIRED" });
        else if (line.rejectReason === "other" && !String(line.rejectNote ?? "").trim()) errors.push({ path: ["lines", index, "rejectNote"], message: "REQUIRED" });
      }
      if (String(line.lot ?? "").length > 50) errors.push({ path: ["lines", index, "lot"], message: "TOO_LONG" });
      if (num(line.delivered)) delivered += line.delivered;
    });
    if (lines.length === 0 || delivered <= 0) errors.push({ path: ["lines"], message: "REQUIRED" });
  }
  const cleanReceiptLines = (lines) =>
    lines
      .filter((line) => line.delivered > 0 || line.accepted > 0)
      .map((line) => ({ materialId: Number(line.materialId), delivered: line.delivered, accepted: line.accepted, rejectReason: line.delivered > line.accepted ? line.rejectReason : "", rejectNote: line.delivered > line.accepted ? String(line.rejectNote ?? "").trim() : "", lot: String(line.lot ?? "").trim() }));

  /** The PO status after its posted receipts changed: Received when nothing is open, else Partially received, else Sent. */
  function refreshPoStatus(po, user, label) {
    if (!["sent", "partially_received", "received"].includes(po.status)) return;
    const anyReceived = po.lines.some((line) => receivedOf(po, line.materialId) > 0);
    const allIn = po.lines.every((line) => openOf(po, line) === 0);
    const next = allIn ? "received" : anyReceived ? "partially_received" : "sent";
    if (next === po.status) return;
    po.status = next;
    logEntry(po, "receive", next, user, label);
  }

  // ---- the stock status board ----
  function boardRows() {
    const open = new Map();
    for (const row of ledger.onOrderRows()) open.set(row.materialId, (open.get(row.materialId) ?? 0) + row.qty);
    return store().materials.map((material) => {
      const onHand = ledger.onHandTotal("material", material.id);
      const onOrder = round3(open.get(material.id) ?? 0);
      const links = store()
        .supplierLinks.filter((link) => link.materialId === material.id && supplierOf(link.supplierId)?.status !== "inactive")
        .map((link) => ({ supplierId: link.supplierId, code: supplierOf(link.supplierId)?.code, name: supplierOf(link.supplierId)?.name, price: link.priceJpy, leadTimeDays: link.leadTimeDays }))
        .sort((a, b) => a.price - b.price || a.leadTimeDays - b.leadTimeDays);
      const reorderPoint = material.reorderPoint ?? null;
      const suggestedQty = material.reorderQty ?? (reorderPoint != null ? Math.max(0, round3(2 * reorderPoint - onHand)) : null);
      return {
        id: material.id,
        code: material.code,
        name: material.name,
        uom: material.uom,
        onHand,
        available: ledger.availableTotal("material", material.id),
        onOrder,
        reorderPoint,
        reorderQty: material.reorderQty ?? null,
        suggestedQty,
        status: stockStatusOf(onHand, reorderPoint),
        suppliers: links,
        suggested: links[0] ?? null,
      };
    });
  }
  const RANK = { shortage: 0, near_shortage: 1, normal: 2, not_set: 3 };

  const routes = {
    // ------------------------------------------------------------------ P1 stock status board
    "GET /purchase/stock-status": ({ authorization, query }) => {
      guard(authorization);
      const text = String(query.q ?? "").trim().toLowerCase();
      const base = boardRows().filter((row) => !text || matches(row.code, text) || matches(row.name, text));
      const statusCounts = {};
      base.forEach((row) => (statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1));
      let rows = base;
      if (query.status && query.status !== "all") rows = rows.filter((row) => row.status === query.status);
      else if (query.scope !== "all") rows = rows.filter((row) => ["shortage", "near_shortage"].includes(row.status));
      const sortKey = String(query.sort ?? "status");
      const descending = sortKey.startsWith("-");
      const field = descending ? sortKey.slice(1) : sortKey;
      rows = [...rows].sort((a, b) => {
        let order;
        if (field === "status") order = RANK[a.status] - RANK[b.status] || (a.onHand / (a.reorderPoint || 1)) - (b.onHand / (b.reorderPoint || 1));
        else if (["onHand", "available", "onOrder", "reorderPoint"].includes(field)) order = (a[field] ?? -1) - (b[field] ?? -1);
        else order = String(a[field] ?? "").localeCompare(String(b[field] ?? ""));
        return (descending ? -order : order) || a.id - b.id;
      });
      const pageSize = Math.min(Number(query.pageSize) || 20, 100);
      const total = rows.length;
      const page = Math.min(Math.max(Number(query.page) || 1, 1), Math.max(1, Math.ceil(total / pageSize)));
      return new MockResponse({ data: rows.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total, statusCounts } });
    },

    // ------------------------------------------------------------------ P2-P4 purchase orders
    "GET /purchase/orders": ({ authorization, query }) => {
      guard(authorization);
      const rows = orders.map((po) => ({ ...shapePo(po), materialText: po.lines.map((line) => `${materialOf(line.materialId)?.code} ${materialOf(line.materialId)?.name}`).join(" ") }));
      return listOf(rows, {
        query,
        sumFields: ["total"],
        searchFields: ["number", "supplierCode", "supplierName", "materialText"],
        sorts: ["number", "date", "supplierCode", "expectedDate", "total", "status"],
        defaultSort: "-date",
        dateField: "date",
        extra: (row, q) =>
          (!q.material || row.lines.some((line) => line.materialId === Number(q.material))) &&
          (!q.deliveryFrom || (row.expectedDate ?? "") >= q.deliveryFrom) &&
          (!q.deliveryTo || (row.expectedDate ?? "") <= q.deliveryTo) &&
          (!q.receivable || ["sent", "partially_received"].includes(row.status)),
      });
    },
    "GET /purchase/orders/:id": ({ authorization, params }) => {
      guard(authorization);
      return shapePo(findIn(orders, params.id));
    },
    "POST /purchase/orders": ({ authorization, body }) => {
      const { user } = guard(authorization);
      const errors = [];
      checkOrder(body, errors);
      fail(errors);
      const po = {
        id: seq.po++,
        number: nextNumber("PO", body.date),
        date: body.date,
        supplierId: Number(body.supplierId),
        expectedDate: body.expectedDate || null,
        warehouseId: Number(body.warehouseId),
        buyer: user.name,
        createdById: user.id,
        remarks: String(body.remarks ?? ""),
        status: "draft",
        lines: cleanLines(body.lines),
        log: [],
      };
      logEntry(po, "created", "draft", user.name, null);
      orders.push(po);
      return new MockResponse({ data: shapePo(po), status: 201, message: "Created" });
    },
    "PUT /purchase/orders/:id": ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const po = findIn(orders, params.id);
      if (po.status !== "draft") throw wrongStatus();
      if (!mayEdit(po, user, role)) throw forbid();
      const errors = [];
      checkOrder(body, errors);
      fail(errors);
      Object.assign(po, { date: body.date, supplierId: Number(body.supplierId), expectedDate: body.expectedDate || null, warehouseId: Number(body.warehouseId), remarks: String(body.remarks ?? ""), lines: cleanLines(body.lines) });
      return shapePo(po);
    },
    "DELETE /purchase/orders/:id": ({ authorization, params }) => {
      const { user, role } = guard(authorization);
      const po = findIn(orders, params.id);
      if (po.status !== "draft") throw wrongStatus();
      if (!mayEdit(po, user, role)) throw forbid();
      orders.splice(orders.indexOf(po), 1);
      return null;
    },
    "POST /purchase/orders/:id/:action": ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const po = findIn(orders, params.id);
      const note = noteOf(body);
      const posted = postedOf(po).length > 0;
      switch (params.action) {
        case "send":
          if (!isManager(role)) throw forbid();
          if (po.status !== "draft") throw wrongStatus();
          po.status = "sent";
          logEntry(po, "send", "sent", user.name, note || null);
          break;
        case "back-to-draft":
          if (!isManager(role)) throw forbid();
          if (po.status !== "sent" || posted) throw wrongStatus();
          cancelDraftReceipts(po, user.name);
          po.status = "draft";
          logEntry(po, "back-to-draft", "draft", user.name, note || null);
          break;
        case "cancel":
          if (po.status === "draft") {
            if (!mayEdit(po, user, role)) throw forbid();
          } else if (po.status === "sent") {
            if (!isManager(role)) throw forbid();
            needNote(note);
            if (posted) throw wrongStatus();
          } else throw wrongStatus();
          cancelDraftReceipts(po, user.name);
          po.status = "cancelled";
          logEntry(po, "cancel", "cancelled", user.name, note || null);
          break;
        case "close-remaining":
          if (!isManager(role)) throw forbid();
          if (po.status !== "partially_received") throw wrongStatus();
          needNote(note);
          cancelDraftReceipts(po, user.name);
          po.status = "closed";
          logEntry(po, "close-remaining", "closed", user.name, note);
          break;
        case "close":
          if (!isManager(role)) throw forbid();
          if (po.status !== "received") throw wrongStatus();
          po.status = "closed";
          logEntry(po, "close", "closed", user.name, note || null);
          break;
        case "revert": {
          if (!isManager(role)) throw forbid();
          needNote(note);
          const previous = statusBefore(po);
          if (!previous || !["closed", "cancelled"].includes(po.status)) throw new MockHttpError(409, "INVALID_STATUS", "Cancel the receipts first");
          po.status = previous;
          logEntry(po, "revert", previous, user.name, note);
          break;
        }
        default:
          throw new MockHttpError(404, "ROUTE_NOT_FOUND", "Unknown action");
      }
      return shapePo(po);
    },

    // ------------------------------------------------------------------ P5 goods receipts
    "GET /purchase/receipts": ({ authorization, query }) => {
      guard(authorization);
      const rows = receipts.map((gr) => ({ ...shapeReceipt(gr), materialText: gr.lines.map((line) => `${materialOf(line.materialId)?.code} ${materialOf(line.materialId)?.name}`).join(" ") }));
      return listOf(rows, {
        query,
        searchFields: ["number", "poNumber", "supplierName", "supplierCode", "materialText", "deliveryNoteNo"],
        sorts: ["number", "date", "poNumber", "supplierCode", "accepted", "status"],
        defaultSort: "-date",
        dateField: "date",
        extra: (row, q) => !q.po || row.poId === Number(q.po),
      });
    },
    "GET /purchase/receipts/:id": ({ authorization, params }) => {
      guard(authorization);
      return shapeReceipt(findIn(receipts, params.id));
    },
    "POST /purchase/receipts": ({ authorization, body }) => {
      const { user } = guard(authorization);
      const errors = [];
      checkReceipt(body, errors);
      fail(errors);
      const gr = {
        id: seq.gr++,
        number: nextNumber("GR", body.date),
        date: body.date,
        poId: Number(body.poId),
        warehouseId: Number(body.warehouseId),
        deliveryNoteNo: String(body.deliveryNoteNo ?? "").trim(),
        remarks: String(body.remarks ?? ""),
        receivedBy: user.name,
        createdById: user.id,
        status: "draft",
        lines: cleanReceiptLines(body.lines),
        log: [],
      };
      logEntry(gr, "created", "draft", user.name, `From ${orders.find((row) => row.id === gr.poId).number}`);
      receipts.push(gr);
      return new MockResponse({ data: shapeReceipt(gr), status: 201, message: "Created" });
    },
    "PUT /purchase/receipts/:id": ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const gr = findIn(receipts, params.id);
      if (gr.status !== "draft") throw wrongStatus();
      if (!(isManager(role) || gr.createdById === user.id)) throw forbid();
      const errors = [];
      checkReceipt({ ...body, poId: gr.poId }, errors, gr);
      fail(errors);
      Object.assign(gr, { date: body.date, warehouseId: Number(body.warehouseId), deliveryNoteNo: String(body.deliveryNoteNo ?? "").trim(), remarks: String(body.remarks ?? ""), lines: cleanReceiptLines(body.lines) });
      return shapeReceipt(gr);
    },
    "DELETE /purchase/receipts/:id": ({ authorization, params }) => {
      const { user, role } = guard(authorization);
      const gr = findIn(receipts, params.id);
      if (gr.status !== "draft") throw wrongStatus();
      if (!(isManager(role) || gr.createdById === user.id)) throw forbid();
      receipts.splice(receipts.indexOf(gr), 1);
      return null;
    },
    "POST /purchase/receipts/:id/:action": ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const gr = findIn(receipts, params.id);
      const po = orders.find((row) => row.id === gr.poId);
      const note = noteOf(body);
      if (params.action === "post") {
        if (gr.status !== "draft") throw wrongStatus(); // posted once only
        const errors = [];
        checkReceipt({ ...gr, ...{ lines: gr.lines } }, errors, gr);
        fail(errors);
        // the accepted quantity goes into the receiving warehouse; all lines together or none
        ledger.book(
          gr.lines
            .filter((line) => line.accepted > 0)
            .map((line) => ({ itemType: "material", itemId: line.materialId, warehouseId: gr.warehouseId, qty: line.accepted, type: "receipt", note: line.lot ? `Lot ${line.lot}` : null })),
          { doc: { type: "GR", id: gr.id, number: gr.number }, by: user.name },
        );
        gr.status = "posted";
        logEntry(gr, "post", "posted", user.name, note || null);
        refreshPoStatus(po, user.name, gr.number);
      } else if (params.action === "cancel") {
        if (gr.status === "draft") {
          if (!(isManager(role) || gr.createdById === user.id)) throw forbid();
          gr.status = "cancelled";
          logEntry(gr, "cancel", "cancelled", user.name, note || null);
        } else if (gr.status === "posted") {
          if (!isManager(role)) throw forbid();
          needNote(note);
          if (po.status === "closed" || po.status === "cancelled") throw new MockHttpError(409, "INVALID_STATUS", "Revert the purchase order first");
          ledger.reverseDoc("GR", gr.id, { by: user.name, note: "Reverted" });
          gr.status = "cancelled";
          logEntry(gr, "cancel", "cancelled", user.name, note);
          refreshPoStatus(po, user.name, gr.number);
        } else throw wrongStatus();
      } else {
        throw new MockHttpError(404, "ROUTE_NOT_FOUND", "Unknown action");
      }
      return shapeReceipt(gr);
    },
  };

  function cancelDraftReceipts(po, actor) {
    for (const gr of receiptsOf(po).filter((item) => item.status === "draft")) {
      gr.status = "cancelled";
      logEntry(gr, "cancel", "cancelled", actor, "The purchase order was cancelled or closed");
    }
  }

  // =========================================================================================================
  // Seed: 7 POs and 6 receipts. Three receipts are the ones that fill the raw material warehouse in the Stock demo.
  // =========================================================================================================
  function seedPo({ date, supplier, expected, status, lines, by, byId, sent = "Hana Ito", remarks = "" }) {
    const po = {
      id: seq.po++,
      number: seedNumber("PO", date, seq.po - 1),
      date,
      supplierId: store().suppliers.find((row) => row.code === supplier).id,
      expectedDate: expected,
      warehouseId: store().warehouses.find((row) => row.type === "RAW_MATERIAL").id,
      buyer: by,
      createdById: byId,
      remarks,
      status,
      lines: lines.map(([code, qty, unitPrice]) => ({ materialId: store().materials.find((row) => row.code === code).id, qty, unitPrice })),
      log: [],
    };
    logEntry(po, "created", "draft", by, null, at(date, "09:00"));
    if (status !== "draft") logEntry(po, "send", "sent", sent, null, at(date, "10:00"));
    orders.push(po);
    return po;
  }
  function seedReceipt({ po, date, status, lines, by, byId, note, deliveryNoteNo = "" }) {
    const gr = {
      id: seq.gr++,
      number: seedNumber("GR", date, seq.gr - 1),
      date,
      poId: po.id,
      warehouseId: po.warehouseId,
      deliveryNoteNo,
      remarks: "",
      receivedBy: by,
      createdById: byId,
      status,
      lines: lines.map(([code, delivered, accepted, rejectReason = "", lot = ""]) => ({ materialId: store().materials.find((row) => row.code === code).id, delivered, accepted, rejectReason, rejectNote: "", lot })),
      log: [],
    };
    logEntry(gr, "created", "draft", by, `From ${po.number}`, at(date, "09:30"));
    if (status === "posted") {
      logEntry(gr, "post", "posted", by, null, at(date, "10:00"));
      ledger.book(
        gr.lines.filter((line) => line.accepted > 0).map((line) => ({ itemType: "material", itemId: line.materialId, warehouseId: gr.warehouseId, qty: line.accepted, type: "receipt", note: line.lot ? `Lot ${line.lot}` : null })),
        { doc: { type: "GR", id: gr.id, number: gr.number }, by, at: at(date, "10:00"), seed: true },
      );
    }
    if (status === "cancelled") logEntry(gr, "cancel", "cancelled", by, note, at(date, "11:00"));
    receipts.push(gr);
    return gr;
  }
  // 2 = Alice Sato (Purchase Worker), 7 = Hana Ito (Purchase Manager)
  const po1 = seedPo({ date: "2026-09-05", supplier: "S001", expected: "2026-09-12", status: "received", lines: [["COMP", 100, 3800]], by: "Alice Sato", byId: 2 });
  const po2 = seedPo({ date: "2026-09-06", supplier: "S002", expected: "2026-09-14", status: "received", lines: [["STEEL", 600, 180]], by: "Alice Sato", byId: 2 });
  const po4 = seedPo({ date: "2026-09-08", supplier: "S002", expected: "2026-09-20", status: "partially_received", lines: [["DOOR", 60, 2200], ["STEEL", 200, 180]], by: "Alice Sato", byId: 2, remarks: "Doors first, steel when the line is free" });
  const po3 = seedPo({ date: "2026-09-20", supplier: "S003", expected: "2026-10-01", status: "closed", lines: [["FOAM", 400, 520]], by: "Alice Sato", byId: 2 });
  seedPo({ date: "2026-09-21", supplier: "S002", expected: "2026-10-05", status: "cancelled", lines: [["DOOR", 100, 2200]], by: "Alice Sato", byId: 2 });
  seedPo({ date: "2026-10-05", supplier: "S001", expected: "2026-10-20", status: "sent", lines: [["THERMO", 150, 650], ["COMP", 50, 3800]], by: "Alice Sato", byId: 2 });
  seedPo({ date: "2026-10-07", supplier: "S003", expected: "2026-10-21", status: "draft", lines: [["SHELF", 200, 340]], by: "Alice Sato", byId: 2 });
  logEntry(orders.find((row) => row.number === "PO-2026-0005"), "cancel", "cancelled", "Hana Ito", "Ordered twice by mistake", at("2026-09-22", "09:00"));
  seedReceipt({ po: po1, date: "2026-09-10", status: "posted", lines: [["COMP", 100, 100, "", "C-0910"]], by: "Alice Sato", byId: 2, deliveryNoteNo: "CC-4411" });
  seedReceipt({ po: po2, date: "2026-09-12", status: "posted", lines: [["STEEL", 600, 600, "", "S-0912"]], by: "Alice Sato", byId: 2, deliveryNoteNo: "SC-0312" });
  seedReceipt({ po: po4, date: "2026-09-14", status: "posted", lines: [["DOOR", 25, 20, "damaged"]], by: "Alice Sato", byId: 2, deliveryNoteNo: "SC-0320" });
  seedReceipt({ po: po3, date: "2026-10-01", status: "posted", lines: [["FOAM", 320, 300, "quality", "F-1001"]], by: "Alice Sato", byId: 2, deliveryNoteNo: "BC-8001" });
  seedReceipt({ po: po4, date: "2026-10-06", status: "draft", lines: [["STEEL", 100, 100]], by: "Alice Sato", byId: 2 });
  seedReceipt({ po: po4, date: "2026-10-04", status: "cancelled", lines: [["DOOR", 20, 20]], by: "Alice Sato", byId: 2, note: "Entered on the wrong purchase order" });
  // the status history of the received POs: each posted receipt moved its PO, and PO4 / PO3 stay or were closed by a Manager
  logEntry(po1, "receive", "received", "Alice Sato", "GR-2026-0001", at("2026-09-10", "10:00"));
  logEntry(po2, "receive", "received", "Alice Sato", "GR-2026-0002", at("2026-09-12", "10:00"));
  logEntry(po4, "receive", "partially_received", "Alice Sato", "GR-2026-0003", at("2026-09-14", "10:00"));
  logEntry(po3, "receive", "partially_received", "Alice Sato", "GR-2026-0004", at("2026-10-01", "10:00"));
  logEntry(po3, "close-remaining", "closed", "Hana Ito", "The supplier cannot deliver the last 100 kg", at("2026-10-02", "09:00"));

  onPurchase?.({
    orders,
    receipts,
    // what the Dashboard needs: every PO in short form
    summaries: () => orders.map((po) => ({ id: po.id, number: po.number, status: po.status, supplierName: supplierOf(po.supplierId)?.name, total: totalsOf(po.lines).total, createdAt: po.log[0]?.at, expectedDate: po.expectedDate })),
  });
  return routes;
}
