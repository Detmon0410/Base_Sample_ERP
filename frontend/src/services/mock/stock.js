// In-memory Stock for VITE_USE_MOCK=true (docs/specs/f8-stock.md): a ledger of movements, the balances that are their
// sum, and the stock adjustments that a Manager approves. Nothing edits a balance: the other mock modules (Factory,
// Sale) and the adjustments book movements, and a revert books the opposite movement. The data lives until a reload.

import { EMPTY_SEED } from "./seedMode.js";
import { MockHttpError, MockResponse } from "./errors.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const matches = (value, text) => String(value ?? "").toLowerCase().includes(text);
const round3 = (value) => Math.round(value * 1000) / 1000;

/** Shortage when on hand <= reorder point, near shortage when <= 1.2 x reorder point (aditional_req.md section 2). */
export function stockStatusOf(onHand, reorderPoint) {
  if (reorderPoint == null) return "not_set"; // the reorder level is optional (Sotck_req.md)
  if (onHand <= reorderPoint) return "shortage";
  if (onHand <= reorderPoint * 1.2) return "near_shortage";
  return "normal";
}
export const productStatusOf = (onHand) => (onHand > 0 ? "in_stock" : "out_of_stock");

const forbid = () => new MockHttpError(403, "FORBIDDEN", "You may not do this");
const wrongStatus = () => new MockHttpError(409, "INVALID_STATUS", "This is not possible in the current status");
const invalid = (path, message = "INVALID") => new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [{ path: [path], message }]);

/**
 * The ledger the other mock modules book into. `getStore` gives the master data rows (materials, products,
 * warehouses, bom). It is created before the documents are seeded; `seedOpening()` runs last (see stockRoutes).
 */
export function createLedger(getStore) {
  const store = () => getStore();
  const movements = [];
  let nextId = 1;
  // movement numbers MV-2026-0001: given in time order once the seed is booked, then one by one
  const numbers = {};
  let numbering = false;
  const numberOf = (at) => {
    const key = `MV-${String(at).slice(0, 4)}`;
    numbers[key] = (numbers[key] ?? 0) + 1;
    return `${key}-${String(numbers[key]).padStart(4, "0")}`;
  };
  // what is promised to open documents (a scheduled work order, a draft delivery note) and so not available
  const reservers = [];
  // what is on order at suppliers (open quantity of Sent / Partially received purchase orders): [{ materialId, qty, po }]
  const onOrderProviders = [];

  const materialOf = (id) => store().materials.find((row) => row.id === Number(id));
  const productOf = (id) => store().products.find((row) => row.id === Number(id));
  const itemOf = (type, id) => (type === "material" ? materialOf(id) : productOf(id));
  const warehouseOf = (id) => store().warehouses.find((row) => row.id === Number(id));
  const keyOf = (type, itemId, warehouseId) => `${type}:${Number(itemId)}:${Number(warehouseId)}`;

  const balance = (type, itemId, warehouseId) =>
    round3(movements.filter((m) => m.itemType === type && m.itemId === Number(itemId) && m.warehouseId === Number(warehouseId)).reduce((sum, m) => sum + m.qty, 0));
  const onHandTotal = (type, itemId) => round3(movements.filter((m) => m.itemType === type && m.itemId === Number(itemId)).reduce((sum, m) => sum + m.qty, 0));
  const hasMovements = (type, itemId, warehouseId) => movements.some((m) => m.itemType === type && m.itemId === Number(itemId) && m.warehouseId === Number(warehouseId));

  /** A reserver is a function that returns [{ itemType, itemId, warehouseId, qty, doc: { type, id } }] of the open documents. */
  const addReserver = (fn) => reservers.push(fn);
  const addOnOrder = (fn) => onOrderProviders.push(fn);
  const onOrderRows = () => onOrderProviders.flatMap((fn) => fn());
  const onOrderOf = (materialId) => round3(onOrderRows().filter((row) => row.materialId === Number(materialId)).reduce((sum, row) => sum + row.qty, 0));
  /** Reserved quantity of an item; except = { type, id } leaves out the reservation of one document (its own check). */
  const reserved = (type, itemId, warehouseId, { except } = {}) =>
    round3(
      reservers
        .flatMap((fn) => fn())
        .filter((r) => r.itemType === type && r.itemId === Number(itemId) && (warehouseId == null || r.warehouseId === Number(warehouseId)) && !(except && r.doc?.type === except.type && r.doc?.id === except.id))
        .reduce((sum, r) => sum + r.qty, 0),
    );
  const available = (type, itemId, warehouseId, opts) => round3(balance(type, itemId, warehouseId) - reserved(type, itemId, warehouseId, opts));
  const availableTotal = (type, itemId, opts) => round3(onHandTotal(type, itemId) - reserved(type, itemId, null, opts));
  /** Gives every seeded movement its number in time order; from now on a new movement gets the next one. */
  function finishSeed() {
    for (const move of [...movements].sort((a, b) => a.at.localeCompare(b.at) || a.id - b.id)) move.number = numberOf(move.at);
    numbering = true;
  }
  const firstWarehouse = (kind) => store().warehouses.find((row) => row.type === kind && row.status !== "inactive");

  // the on-hand numbers the master data had before the first booking: the demo ends on these numbers
  let seedTargets = null;
  const targetOnHand = (materialId) => {
    seedTargets ??= new Map(store().materials.map((row) => [row.id, row.onHand ?? 0]));
    return seedTargets.get(materialId) ?? 0;
  };

  /** Keeps the "On hand" of the material master data equal to the stock (one source of truth). */
  function syncMaterials() {
    for (const material of store().materials) material.onHand = onHandTotal("material", material.id);
  }

  /**
   * Books movements together or not at all. A line is { itemType, itemId, warehouseId, qty (+ in / - out), type }.
   * Refuses with NOT_ENOUGH_STOCK when a balance would go below zero (R3), unless `seed` (the seed documents).
   */
  function book(lines, { doc, by, at = new Date().toISOString(), note = null, seed = false } = {}) {
    targetOnHand(0); // remember the master numbers before the first booking changes them
    const planned = new Map();
    for (const line of lines) {
      if (!line.qty) continue;
      const key = keyOf(line.itemType, line.itemId, line.warehouseId);
      planned.set(key, round3((planned.get(key) ?? balance(line.itemType, line.itemId, line.warehouseId)) + line.qty));
    }
    if (!seed) {
      const items = [];
      for (const [key, after] of planned) {
        if (after >= 0) continue;
        const [type, itemId, warehouseId] = key.split(":");
        const item = itemOf(type, itemId);
        const has = balance(type, itemId, warehouseId);
        items.push({ code: item?.code, name: item?.name, uom: item?.uom, warehouse: warehouseOf(warehouseId)?.code, needed: round3(has - after), has });
      }
      if (items.length) {
        const text = items.map((item) => `${item.code}: needs ${item.needed}, has ${item.has}`).join("; ");
        throw new MockHttpError(409, "NOT_ENOUGH_STOCK", `Not enough stock. ${text}`, [{ path: ["stock"], message: "NOT_ENOUGH_STOCK", items }]);
      }
    }
    const made = lines
      .filter((line) => line.qty)
      .map((line) => ({
        id: nextId++,
        number: numbering ? numberOf(at) : null,
        at,
        itemType: line.itemType,
        itemId: Number(line.itemId),
        warehouseId: Number(line.warehouseId),
        type: line.type,
        qty: round3(line.qty),
        docType: doc?.type ?? null,
        docId: doc?.id ?? null,
        docNumber: doc?.number ?? null,
        by: by ?? null,
        note: line.note ?? note,
      }));
    movements.push(...made);
    syncMaterials();
    return made;
  }

  /** Books the opposite of everything a document has booked so far (a revert). Quietly does nothing when it is already undone. */
  function reverseDoc(docType, docId, opts) {
    const net = new Map();
    for (const move of movements.filter((m) => m.docType === docType && m.docId === docId)) {
      const key = `${move.itemType}:${move.itemId}:${move.warehouseId}:${move.type}`;
      net.set(key, round3((net.get(key) ?? 0) + move.qty));
    }
    const lines = [];
    for (const [key, qty] of net) {
      if (!qty) continue;
      const [itemType, itemId, warehouseId, type] = key.split(":");
      lines.push({ itemType, itemId: Number(itemId), warehouseId: Number(warehouseId), type, qty: -qty });
    }
    return book(lines, { ...opts, doc: { type: docType, id: docId, number: opts?.number ?? movements.find((m) => m.docType === docType && m.docId === docId)?.docNumber } });
  }

  /** The finished goods warehouse that holds most of a product (a delivery takes from it). */
  function bestWarehouse(type, itemId, kind) {
    const candidates = store().warehouses.filter((row) => row.type === kind && row.status !== "inactive");
    return [...candidates].sort((a, b) => balance(type, itemId, b.id) - balance(type, itemId, a.id))[0] ?? null;
  }

  return { movements, targetOnHand, hasMovements, addOnOrder, onOrderRows, onOrderOf, addReserver, reserved, available, availableTotal, finishSeed, balance, onHandTotal, firstWarehouse, bestWarehouse, book, reverseDoc, syncMaterials, itemOf, warehouseOf, materialOf, productOf };
}

// ---------------------------------------------------------------------------------------------------------
// Who may do what (spec 4): Factory and Purchase users see Stock; a Worker drafts and requests; a Manager (and Admin)
// also approves, but never their own adjustment.
// ---------------------------------------------------------------------------------------------------------
function stockRole(user) {
  if (user.memberships.some((membership) => membership.role === "Admin")) return "Admin";
  const roles = user.memberships.filter((membership) => ["Factory", "Purchase"].includes(membership.department)).map((membership) => membership.role);
  if (roles.length === 0) return null;
  return roles.includes("Manager") ? "Manager" : "Worker";
}
const isManager = (role) => role === "Manager" || role === "Admin";

const REASONS = ["recount", "damaged", "lost", "found", "other", "opening"];
export const ADJUSTMENT_STATUSES = ["draft", "pending", "approved", "rejected", "cancelled"];
const at = (date, time) => `${date}T${time}:00.000Z`;

export function stockRoutes({ userFromAuthorization, getStore, ledger }) {
  const store = () => getStore();
  const adjustments = [];
  let seq = 1;
  let logId = 1;
  const counters = {};
  const seedNumber = (date, serial) => {
    const key = `ADJ-${String(date).slice(0, 4)}`;
    counters[key] = Math.max(counters[key] ?? 0, serial);
    return `${key}-${String(serial).padStart(4, "0")}`;
  };
  const nextNumber = (date) => {
    const key = `ADJ-${String(date).slice(0, 4)}`;
    counters[key] = (counters[key] ?? 0) + 1;
    return `${key}-${String(counters[key]).padStart(4, "0")}`;
  };

  const guard = (authorization) => {
    const user = userFromAuthorization(authorization);
    const role = stockRole(user);
    if (!role) throw new MockHttpError(403, "FORBIDDEN", "Stock is for Factory and Purchase");
    return { user, role };
  };

  const kindOfParam = (value) => (String(value).startsWith("product") ? "product" : "material");
  const warehouseKind = (type) => (type === "material" ? "RAW_MATERIAL" : "FINISHED_GOODS");
  const findIn = (items, id) => {
    const found = items.find((item) => item.id === Number(id));
    if (!found) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
    return found;
  };

  // ---- balances (one row per item per warehouse of the right kind) ----
  function balanceRows(kind) {
    const items = kind === "product" ? store().products : store().materials;
    const rows = [];
    for (const item of items) {
      for (const warehouse of store().warehouses.filter((row) => row.type === warehouseKind(kind))) {
        const onHand = ledger.balance(kind, item.id, warehouse.id);
        rows.push({
          id: `${kind}-${item.id}-${warehouse.id}`,
          itemType: kind,
          itemId: item.id,
          code: item.code,
          name: item.name,
          uom: item.uom,
          warehouseId: warehouse.id,
          warehouseCode: warehouse.code,
          warehouseName: warehouse.name,
          onHand,
          onOrder: kind === "material" ? ledger.onOrderOf(item.id) : 0,
          reserved: ledger.reserved(kind, item.id, warehouse.id),
          available: ledger.available(kind, item.id, warehouse.id),
          reorderPoint: kind === "material" ? (item.reorderPoint ?? null) : null,
          reorderQty: kind === "material" ? (item.reorderQty ?? null) : null,
          status: kind === "material" ? stockStatusOf(onHand, item.reorderPoint ?? null) : productStatusOf(onHand),
        });
      }
    }
    return rows;
  }

  function page(rows, query, { sorts, defaultSort, extra = {} }) {
    const sortKey = String(query.sort ?? defaultSort);
    const descending = sortKey.startsWith("-");
    const field = descending ? sortKey.slice(1) : sortKey;
    let result = rows;
    if (sorts.includes(field)) {
      result = [...rows].sort((a, b) => {
        const left = a[field];
        const right = b[field];
        const order = typeof left === "number" ? left - right : String(left ?? "").localeCompare(String(right ?? ""));
        return (descending ? -order : order) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
      });
    }
    const pageSize = Math.min(Number(query.pageSize) || 20, 100);
    const total = result.length;
    const current = Math.min(Math.max(Number(query.page) || 1, 1), Math.max(1, Math.ceil(total / pageSize)));
    return new MockResponse({ data: result.slice((current - 1) * pageSize, current * pageSize), meta: { page: current, pageSize, total, ...extra } });
  }

  // ---- movements with the balance after each one ----
  function movementRows() {
    const running = new Map();
    const ordered = [...ledger.movements].sort((a, b) => a.at.localeCompare(b.at) || a.id - b.id);
    return ordered.map((move) => {
      const key = `${move.itemType}:${move.itemId}:${move.warehouseId}`;
      const after = Math.round(((running.get(key) ?? 0) + move.qty) * 1000) / 1000;
      running.set(key, after);
      const item = ledger.itemOf(move.itemType, move.itemId);
      const warehouse = ledger.warehouseOf(move.warehouseId);
      const out = move.qty < 0;
      return {
        id: move.id,
        number: move.number,
        at: move.at,
        // from / to: the warehouse and the document it went to or came from (an opening balance comes from nowhere)
        from: out ? warehouse?.code : (move.docNumber ?? null),
        to: out ? (move.docNumber ?? null) : warehouse?.code,
        type: move.type,
        itemType: move.itemType,
        itemId: move.itemId,
        itemCode: item?.code,
        itemName: item?.name,
        uom: item?.uom,
        warehouseId: move.warehouseId,
        warehouseCode: warehouse?.code,
        warehouseName: warehouse?.name,
        qty: move.qty,
        balanceAfter: after,
        docType: move.docType,
        docId: move.docId,
        docNumber: move.docNumber,
        by: move.by,
        note: move.note,
      };
    });
  }

  // ---- adjustments ----
  function logEntry(doc, action, status, actor, note, when = new Date().toISOString()) {
    doc.log.push({ id: logId++, action, status, actor, at: when, note });
  }
  const historyOf = (doc) =>
    [...doc.log].sort((a, b) => b.id - a.id).map((entry) => ({ id: entry.id, action: entry.action, status: entry.status, actor: entry.actor, at: entry.at, note: entry.note ?? null }));

  function shapeAdjustment(adj) {
    const item = ledger.itemOf(adj.itemType, adj.itemId);
    const warehouse = ledger.warehouseOf(adj.warehouseId);
    const final = adj.status === "approved";
    const onHandNow = final ? adj.onHandAtApproval : ledger.balance(adj.itemType, adj.itemId, adj.warehouseId);
    const links = [];
    if (final) links.push({ id: `mv-${adj.id}`, type: "movement", number: adj.number, status: null, to: `/stock/movements?q=${adj.number}` });
    return {
      id: adj.id,
      number: adj.number,
      date: adj.date,
      status: adj.status,
      itemType: adj.itemType,
      itemId: adj.itemId,
      itemCode: item?.code,
      itemName: item?.name,
      uom: item?.uom,
      warehouseId: adj.warehouseId,
      warehouseCode: warehouse?.code,
      warehouseName: warehouse?.name,
      countedQty: adj.countedQty,
      onHand: onHandNow,
      difference: round3(adj.countedQty - onHandNow),
      onHandAtRequest: adj.onHandAtRequest ?? null,
      onHandChanged: final && adj.onHandAtRequest != null && adj.onHandAtRequest !== adj.onHandAtApproval,
      reason: adj.reason,
      remarks: adj.remarks ?? "",
      createdById: adj.createdById,
      createdBy: adj.createdBy,
      history: historyOf(adj),
      links,
    };
  }

  function checkAdjustment(body, errors) {
    if (!["material", "product"].includes(body.itemType)) errors.push({ path: ["itemType"], message: "REQUIRED" });
    const item = ["material", "product"].includes(body.itemType) ? ledger.itemOf(body.itemType, body.itemId) : null;
    if (!item) errors.push({ path: ["itemId"], message: "REQUIRED" });
    const warehouse = ledger.warehouseOf(body.warehouseId);
    if (!warehouse || (item && warehouse.type !== warehouseKind(body.itemType))) errors.push({ path: ["warehouseId"], message: "REQUIRED" });
    const counted = body.countedQty;
    if (typeof counted !== "number" || !Number.isFinite(counted) || counted < 0) errors.push({ path: ["countedQty"], message: counted == null ? "REQUIRED" : "INVALID" });
    else if (body.itemType === "product" && !Number.isInteger(counted)) errors.push({ path: ["countedQty"], message: "INVALID" });
    else if (Math.abs(counted * 1000 - Math.round(counted * 1000)) > 1e-6) errors.push({ path: ["countedQty"], message: "INVALID" });
    if (!REASONS.includes(body.reason)) errors.push({ path: ["reason"], message: "REQUIRED" });
    // an opening quantity is only for an item that has no movement yet in that warehouse
    else if (body.reason === "opening" && item && warehouse && ledger.hasMovements(body.itemType, body.itemId, body.warehouseId)) errors.push({ path: ["reason"], message: "HAS_MOVEMENTS" });
    if (body.reason === "other" && !String(body.remarks ?? "").trim()) errors.push({ path: ["remarks"], message: "REQUIRED" });
    if (!DATE_RE.test(String(body.date ?? ""))) errors.push({ path: ["date"], message: "REQUIRED" });
    if (String(body.remarks ?? "").length > 500) errors.push({ path: ["remarks"], message: "TOO_LONG" });
  }
  const fail = (errors) => {
    if (errors.length) throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", errors);
  };
  const mayEdit = (adj, user, role) => isManager(role) || adj.createdById === user.id;

  const routes = {
    // ------------------------------------------------------------------ T1 balances and the item sheet
    "GET /stock/balances": ({ authorization, query }) => {
      guard(authorization);
      const kind = kindOfParam(query.kind || "material");
      const text = String(query.q ?? "").trim().toLowerCase();
      const base = balanceRows(kind).filter((row) => (!text || matches(row.code, text) || matches(row.name, text)) && (!query.warehouse || row.warehouseId === Number(query.warehouse)));
      const statusCounts = {};
      base.forEach((row) => {
        statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
      });
      const rows = query.status && query.status !== "all" ? base.filter((row) => row.status === query.status) : base;
      return page(rows, query, { sorts: ["code", "name", "warehouseName", "onHand", "onOrder", "reserved", "available", "reorderPoint", "status"], defaultSort: "code", extra: { statusCounts } });
    },
    "GET /stock/items/:type/:id": ({ authorization, params }) => {
      guard(authorization);
      const kind = kindOfParam(params.type);
      const item = ledger.itemOf(kind, params.id);
      if (!item) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
      const byWarehouse = balanceRows(kind).filter((row) => row.itemId === item.id).map((row) => ({ warehouseId: row.warehouseId, code: row.warehouseCode, name: row.warehouseName, onHand: row.onHand, reserved: row.reserved, available: row.available }));
      const total = ledger.onHandTotal(kind, item.id);
      return {
        itemType: kind,
        id: item.id,
        code: item.code,
        name: item.name,
        uom: item.uom,
        category: item.category ?? null,
        reorderPoint: kind === "material" ? (item.reorderPoint ?? null) : null,
        reorderQty: kind === "material" ? (item.reorderQty ?? null) : null,
        onHand: total,
        reserved: ledger.reserved(kind, item.id, null),
        available: ledger.availableTotal(kind, item.id),
        onOrder: kind === "material" ? ledger.onOrderOf(item.id) : 0,
        openOrders: kind === "material" ? ledger.onOrderRows().filter((row) => row.materialId === item.id).map((row) => ({ ...row.po, qty: row.qty })) : [],
        hasMovements: ledger.movements.some((m) => m.itemType === kind && m.itemId === item.id),
        status: kind === "material" ? stockStatusOf(total, item.reorderPoint ?? null) : productStatusOf(total),
        byWarehouse,
        lastMovements: movementRows().filter((row) => row.itemType === kind && row.itemId === item.id).reverse().slice(0, 10),
        usedIn:
          kind === "material"
            ? store().bom.filter((line) => line.materialId === item.id).map((line) => ({ productId: line.productId, code: productOf(line.productId)?.code, name: productOf(line.productId)?.name, qtyPerUnit: line.qty }))
            : [],
      };
    },
    "GET /stock/balance": ({ authorization, query }) => {
      guard(authorization);
      const kind = kindOfParam(query.itemType);
      const item = ledger.itemOf(kind, query.itemId);
      if (!item) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
      return { itemType: kind, itemId: item.id, warehouseId: Number(query.warehouseId), onHand: ledger.balance(kind, item.id, query.warehouseId), hasMovements: ledger.hasMovements(kind, item.id, query.warehouseId), uom: item.uom };
    },

    // ------------------------------------------------------------------ T2 movements
    "GET /stock/movements": ({ authorization, query }) => {
      guard(authorization);
      const text = String(query.q ?? "").trim().toLowerCase();
      const [itemKind, itemId] = String(query.item ?? "").split("-");
      const rows = movementRows().filter(
        (row) =>
          (!text || matches(row.itemCode, text) || matches(row.itemName, text) || matches(row.docNumber, text) || matches(row.number, text)) &&
          (!query.type || query.type === "all" || row.type === query.type) &&
          (!query.warehouse || row.warehouseId === Number(query.warehouse)) &&
          (!query.kind || row.itemType === query.kind) &&
          (!query.item || (row.itemType === itemKind && row.itemId === Number(itemId))) &&
          (!query.from || row.at.slice(0, 10) >= query.from) &&
          (!query.to || row.at.slice(0, 10) <= query.to),
      );
      return page(rows, query, { sorts: ["at", "qty", "itemCode", "type"], defaultSort: "-at" });
    },

    // ------------------------------------------------------------------ T3 adjustments
    "GET /stock/adjustments": ({ authorization, query }) => {
      guard(authorization);
      const text = String(query.q ?? "").trim().toLowerCase();
      const all = adjustments.map(shapeAdjustment);
      const others = all.filter(
        (row) =>
          (!text || matches(row.number, text) || matches(row.itemCode, text) || matches(row.itemName, text)) &&
          (!query.warehouse || row.warehouseId === Number(query.warehouse)) &&
          (!query.kind || row.itemType === query.kind) &&
          (!query.from || row.date >= query.from) &&
          (!query.to || row.date <= query.to),
      );
      const statusCounts = {};
      others.forEach((row) => {
        statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
      });
      const rows = query.status && query.status !== "all" ? others.filter((row) => row.status === query.status) : others;
      return page(rows, query, { sorts: ["number", "date", "itemCode", "countedQty", "difference", "status"], defaultSort: "-date", extra: { statusCounts } });
    },
    "GET /stock/adjustments/:id": ({ authorization, params }) => {
      guard(authorization);
      return shapeAdjustment(findIn(adjustments, params.id));
    },
    "POST /stock/adjustments": ({ authorization, body }) => {
      const { user } = guard(authorization);
      const errors = [];
      checkAdjustment(body, errors);
      fail(errors);
      const adj = {
        id: seq++,
        number: nextNumber(body.date),
        date: body.date,
        itemType: body.itemType,
        itemId: Number(body.itemId),
        warehouseId: Number(body.warehouseId),
        countedQty: body.countedQty,
        reason: body.reason,
        remarks: String(body.remarks ?? ""),
        status: "draft",
        createdById: user.id,
        createdBy: user.name,
        log: [],
      };
      logEntry(adj, "created", "draft", user.name, null);
      adjustments.push(adj);
      return new MockResponse({ data: shapeAdjustment(adj), status: 201, message: "Created" });
    },
    "PUT /stock/adjustments/:id": ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const adj = findIn(adjustments, params.id);
      if (adj.status !== "draft") throw wrongStatus();
      if (!mayEdit(adj, user, role)) throw forbid();
      const errors = [];
      // the item and the warehouse of a saved adjustment do not change
      checkAdjustment({ ...body, itemType: adj.itemType, itemId: adj.itemId, warehouseId: adj.warehouseId }, errors);
      fail(errors);
      Object.assign(adj, { date: body.date, countedQty: body.countedQty, reason: body.reason, remarks: String(body.remarks ?? "") });
      return shapeAdjustment(adj);
    },
    "DELETE /stock/adjustments/:id": ({ authorization, params }) => {
      const { user, role } = guard(authorization);
      const adj = findIn(adjustments, params.id);
      if (adj.status !== "draft") throw wrongStatus();
      if (!mayEdit(adj, user, role)) throw forbid();
      adjustments.splice(adjustments.indexOf(adj), 1);
      return null;
    },
    "POST /stock/adjustments/:id/:action": ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const adj = findIn(adjustments, params.id);
      const note = String(body.note ?? "").trim();
      const own = adj.createdById === user.id;
      switch (params.action) {
        case "request":
          if (adj.status !== "draft") throw wrongStatus();
          if (!mayEdit(adj, user, role)) throw forbid();
          adj.status = "pending";
          adj.onHandAtRequest = ledger.balance(adj.itemType, adj.itemId, adj.warehouseId);
          logEntry(adj, "request", "pending", user.name, note || null);
          break;
        case "back-to-draft":
          if (adj.status !== "pending") throw wrongStatus();
          if (!mayEdit(adj, user, role)) throw forbid();
          adj.status = "draft";
          logEntry(adj, "back-to-draft", "draft", user.name, note || null);
          break;
        case "cancel":
          if (adj.status !== "draft") throw wrongStatus();
          if (!mayEdit(adj, user, role)) throw forbid();
          adj.status = "cancelled";
          logEntry(adj, "cancel", "cancelled", user.name, note || null);
          break;
        case "approve": {
          if (!isManager(role) || own) throw forbid();
          if (adj.status !== "pending") throw wrongStatus();
          const onHand = ledger.balance(adj.itemType, adj.itemId, adj.warehouseId);
          const difference = round3(adj.countedQty - onHand);
          if (adj.reason === "opening" && ledger.hasMovements(adj.itemType, adj.itemId, adj.warehouseId)) throw new MockHttpError(409, "HAS_MOVEMENTS", "This item already has movements in that warehouse");
          ledger.book([{ itemType: adj.itemType, itemId: adj.itemId, warehouseId: adj.warehouseId, qty: difference, type: adj.reason === "opening" ? "opening" : "adjust" }], {
            doc: { type: "ADJ", id: adj.id, number: adj.number },
            by: user.name,
            note: `${adj.reason}${adj.remarks ? `: ${adj.remarks}` : ""}`,
          });
          adj.status = "approved";
          adj.onHandAtApproval = onHand;
          logEntry(adj, "adjustment-approve", "approved", user.name, note || null);
          break;
        }
        case "reject":
          if (!isManager(role) || own) throw forbid();
          if (adj.status !== "pending") throw wrongStatus();
          if (!note) throw invalid("note", "REQUIRED");
          adj.status = "rejected";
          logEntry(adj, "reject", "rejected", user.name, note);
          break;
        default:
          throw new MockHttpError(404, "ROUTE_NOT_FOUND", "Unknown action");
      }
      return shapeAdjustment(adj);
    },
  };

  const productOf = (id) => store().products.find((row) => row.id === Number(id));

  // =========================================================================================================
  // Seed: receipts, one approved adjustment, four more adjustments, and the opening balances. The movements of the
  // seeded Work Orders, transfers and deliveries were booked by Factory and Sale while they were seeded; the opening
  // balance of each item is what makes the sum equal the number the demo wants to show.
  // =========================================================================================================
  const materialByCode = (code) => store().materials.find((row) => row.code === code);
  const productByCode = (code) => store().products.find((row) => row.code === code);
  const raw = () => ledger.firstWarehouse("RAW_MATERIAL");
  const finished = () => ledger.firstWarehouse("FINISHED_GOODS");

  function seedAdjustment({ itemType, code, counted, reason, remarks = "", status, date, by, byId, approver, note, onHandThen }) {
    const item = itemType === "material" ? materialByCode(code) : productByCode(code);
    const warehouse = itemType === "material" ? raw() : finished();
    const adj = { id: seq++, number: seedNumber(date, seq - 1), date, itemType, itemId: item.id, warehouseId: warehouse.id, countedQty: counted, reason, remarks, status, createdById: byId, createdBy: by, log: [] };
    logEntry(adj, "created", "draft", by, null, at(date, "09:00"));
    if (["pending", "approved", "rejected"].includes(status)) {
      logEntry(adj, "request", "pending", by, null, at(date, "09:30"));
    }
    if (status === "approved") {
      // the opening balance is added last, so the number on hand at that date is given with the seed
      adj.onHandAtRequest = onHandThen;
      adj.onHandAtApproval = onHandThen;
      ledger.book([{ itemType, itemId: item.id, warehouseId: warehouse.id, qty: counted - onHandThen, type: "adjust" }], {
        doc: { type: "ADJ", id: adj.id, number: adj.number },
        by: approver,
        at: at(date, "11:00"),
        note: `${reason}${remarks ? `: ${remarks}` : ""}`,
        seed: true,
      });
      logEntry(adj, "adjustment-approve", "approved", approver, null, at(date, "11:00"));
    }
    if (status === "rejected") logEntry(adj, "reject", "rejected", approver, note, at(date, "11:00"));
    if (status === "cancelled") logEntry(adj, "cancel", "cancelled", by, note, at(date, "10:00"));
    adjustments.push(adj);
  }
  // 6 = Yuki Tanaka (Factory Manager), 4 = Ken Suzuki (Factory Worker), 2 = Alice Sato (Purchase Worker), 7 = Hana Ito (Purchase Manager)
  // (the workflow test starts with no adjustments at all)
  if (!EMPTY_SEED) {
  seedAdjustment({ itemType: "material", code: "THERMO", counted: 25, reason: "recount", remarks: "Yearly count", status: "approved", date: "2026-10-05", by: "Ken Suzuki", byId: 4, approver: "Yuki Tanaka", onHandThen: 28 });
  seedAdjustment({ itemType: "material", code: "SHELF", counted: 290, reason: "damaged", remarks: "Water leak in the corner of the shelf area", status: "pending", date: "2026-10-06", by: "Alice Sato", byId: 2 });
  seedAdjustment({ itemType: "product", code: "RF-2D", counted: 38, reason: "damaged", remarks: "Two units scratched while moving", status: "rejected", date: "2026-10-04", by: "Ken Suzuki", byId: 4, approver: "Yuki Tanaka", note: "Report the damage first, then adjust" });
  seedAdjustment({ itemType: "material", code: "DOOR", counted: 20, reason: "found", remarks: "Two boxes found behind the rack", status: "draft", date: "2026-10-07", by: "Ken Suzuki", byId: 4 });
  seedAdjustment({ itemType: "material", code: "FOAM", counted: 440, reason: "recount", status: "cancelled", date: "2026-10-03", by: "Alice Sato", byId: 2, note: "Counted again, it was right" });
  }

  /** Opening balances (2026-09-01): the plug that makes every item end on the number the demo wants. */
  function seedOpening() {
    const finals = { "RF-2D": 40, "RF-1D": 25 };
    const lines = [];
    for (const material of store().materials) {
      lines.push({ itemType: "material", item: material, warehouse: raw(), target: ledger.targetOnHand(material.id) });
    }
    for (const product of store().products) lines.push({ itemType: "product", item: product, warehouse: finished(), target: finals[product.code] ?? 0 });
    for (const line of lines) {
      const have = ledger.balance(line.itemType, line.item.id, line.warehouse.id);
      ledger.book([{ itemType: line.itemType, itemId: line.item.id, warehouseId: line.warehouse.id, qty: line.target - have, type: "opening" }], { by: null, at: at("2026-09-01", "08:00"), note: "Opening balance", seed: true });
    }
    ledger.finishSeed();
  }

  return { routes, seedOpening, adjustments };
}
