// In-memory Factory documents for VITE_USE_MOCK=true (docs/specs/f7-factory.md): Work Orders with their production
// steps, the shop-floor tracking board and Finished Goods Transfers. Everything is manual: a status only changes
// when a person calls an action. The data lives until a full reload.

import { MockHttpError, MockResponse } from "./errors.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const matches = (value, text) => String(value ?? "").toLowerCase().includes(text);
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000);

// ---------------------------------------------------------------------------------------------------------
// Who may do what (spec 3): Factory Worker = drafts, step Start / Done, transfer drafts; Factory Manager and Admin
// = Schedule, Finish, Cancel after scheduling, Revert, Transfer. Anybody else gets 403.
// ---------------------------------------------------------------------------------------------------------
function factoryRole(user) {
  if (user.memberships.some((membership) => membership.role === "Admin")) return "Admin";
  return user.memberships.find((membership) => membership.department === "Factory")?.role ?? null;
}
const isManager = (role) => role === "Manager" || role === "Admin";
const forbid = () => new MockHttpError(403, "FORBIDDEN", "You may not do this");
const wrongStatus = () => new MockHttpError(409, "INVALID_STATUS", "This is not possible in the current status");
const invalid = (path, message = "INVALID") => new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [{ path: [path], message }]);

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

export const WORK_ORDER_STATUSES = ["draft", "scheduled", "in_process", "finished", "cancelled"];

export function factoryRoutes({ userFromAuthorization, getStore, getSale, onFactory, ledger }) {
  const store = () => getStore();
  const orders = () => getSale()?.orders ?? [];
  const workOrders = [];
  const transfers = [];
  let seq = { wo: 1, step: 1, ft: 1 };
  let logId = 1;

  const guard = (authorization) => {
    const user = userFromAuthorization(authorization);
    const role = factoryRole(user);
    if (!role) throw new MockHttpError(403, "FORBIDDEN", "Factory department only");
    return { user, role };
  };

  const productOf = (id) => store().products.find((row) => row.id === Number(id));
  const machineOf = (id) => store().machines.find((row) => row.id === Number(id));
  const employeeOf = (id) => store().employees.find((row) => row.id === Number(id));
  const warehouseOf = (id) => store().warehouses.find((row) => row.id === Number(id));
  const orderOf = (id) => orders().find((row) => row.id === Number(id));
  const customerOf = (id) => store().customers.find((row) => row.id === Number(id));
  const findIn = (items, id) => {
    const found = items.find((item) => item.id === Number(id));
    if (!found) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
    return found;
  };

  // a scheduled work order reserves the materials it will issue when it starts (they are not available to others)
  ledger?.addReserver(() => {
    const warehouse = ledger.firstWarehouse("RAW_MATERIAL");
    return workOrders
      .filter((wo) => wo.status === "scheduled")
      .flatMap((wo) =>
        store()
          .bom.filter((item) => item.productId === wo.productId)
          .map((item) => ({ itemType: "material", itemId: item.materialId, warehouseId: warehouse.id, qty: item.qty * wo.qty, doc: { type: "WO", id: wo.id } })),
      );
  });

  // ---- stock (docs/specs/f8-stock.md): the materials leave the raw material warehouse when a Work Order starts ----
  const consumed = (status) => ["in_process", "finished"].includes(status);
  /** Books or reverses the materials of a Work Order when its status changes; refused when the stock is not enough. */
  function moveMaterials(wo, from, to, user, opts = {}) {
    if (!ledger || consumed(from) === consumed(to)) return;
    const doc = { type: "WO", id: wo.id, number: wo.number };
    if (consumed(to)) {
      const warehouse = ledger.firstWarehouse("RAW_MATERIAL");
      const lines = store()
        .bom.filter((item) => item.productId === wo.productId)
        .map((item) => ({ itemType: "material", itemId: item.materialId, warehouseId: warehouse.id, qty: -Math.round(item.qty * wo.qty * 1000) / 1000, type: "consume" }));
      ledger.book(lines, { doc, by: user, ...opts });
    } else {
      ledger.reverseDoc("WO", wo.id, { by: user, note: "Reverted", ...opts });
    }
  }

  function logEntry(doc, action, status, actor, note, at = new Date().toISOString()) {
    doc.log.push({ id: logId++, action, status, actor, at, note });
  }
  const statusBefore = (doc) => {
    const changes = doc.log.filter((entry) => entry.status);
    return changes.length >= 2 ? changes[changes.length - 2].status : null;
  };
  const historyOf = (doc) =>
    [...doc.log]
      .sort((a, b) => b.id - a.id)
      .map((entry) => ({ id: entry.id, action: entry.action, status: entry.status, actor: entry.actor, at: entry.at, note: entry.note ?? null }));

  // ---- progress of a Work Order ----
  const lastStep = (wo) => wo.steps[wo.steps.length - 1];
  const producedQty = (wo) => {
    const last = lastStep(wo);
    return last?.status === "done" ? (last.qtyDone ?? 0) : 0;
  };
  const transfersOf = (wo) => transfers.filter((transfer) => transfer.workOrderId === wo.id);
  const transferredQty = (wo) => transfersOf(wo).filter((transfer) => transfer.status === "transferred").reduce((sum, transfer) => sum + transfer.qty, 0);
  const plannedTransferQty = (wo) => transfersOf(wo).reduce((sum, transfer) => sum + transfer.qty, 0);

  const canStartStep = (wo, step) => ["scheduled", "in_process"].includes(wo.status) && step.status === "pending" && (step.stepNo === 1 || wo.steps.find((s) => s.stepNo === step.stepNo - 1)?.status === "done");

  const shapeStep = (wo, step) => ({
    id: step.id,
    stepNo: step.stepNo,
    processName: step.processName,
    machineId: step.machineId ?? null,
    machineCode: machineOf(step.machineId)?.code ?? null,
    machineName: machineOf(step.machineId)?.name ?? null,
    operatorId: step.operatorId ?? null,
    operatorName: employeeOf(step.operatorId)?.name ?? null,
    status: step.status,
    startAt: step.startAt ?? null,
    endAt: step.endAt ?? null,
    qtyDone: step.qtyDone ?? null,
    qtyDefect: step.qtyDefect ?? null,
    canStart: canStartStep(wo, step),
  });

  function linksOf(wo) {
    const links = [];
    const order = orderOf(wo.saleOrderId);
    if (order) links.push({ id: `so-${order.id}`, type: "order", number: order.number, status: order.status, to: `/sale/orders/${order.id}` });
    for (const transfer of transfersOf(wo)) links.push({ id: `ft-${transfer.id}`, type: "transfer", number: transfer.number, status: transfer.status, to: `/factory/transfers/${transfer.id}` });
    return links;
  }

  function shapeWo(wo) {
    const order = orderOf(wo.saleOrderId);
    const product = productOf(wo.productId);
    const steps = wo.steps.map((step) => shapeStep(wo, step));
    const done = steps.filter((step) => step.status === "done").length;
    const current = steps.find((step) => step.status === "in_progress") ?? steps.find((step) => step.status !== "done") ?? null;
    const open = ["scheduled", "in_process"].includes(wo.status);
    const lateDays = open && wo.planFinish && wo.planFinish < today() ? daysBetween(wo.planFinish, today()) : 0;
    return {
      id: wo.id,
      number: wo.number,
      date: wo.date,
      status: wo.status,
      saleOrderId: wo.saleOrderId,
      saleOrderNumber: order?.number ?? null,
      customerCode: customerOf(order?.customerId)?.code ?? null,
      customerName: customerOf(order?.customerId)?.name ?? null,
      productId: wo.productId,
      productCode: product?.code,
      productName: product?.name,
      uom: product?.uom,
      qty: wo.qty,
      planStart: wo.planStart ?? null,
      planFinish: wo.planFinish ?? null,
      remarks: wo.remarks ?? "",
      steps,
      progress: {
        stepsDone: done,
        stepsTotal: steps.length,
        currentStep: wo.status === "finished" || wo.status === "cancelled" ? null : current,
        producedQty: producedQty(wo),
        transferredQty: transferredQty(wo),
        remainingToTransfer: producedQty(wo) - plannedTransferQty(wo),
        late: lateDays > 0,
        lateDays,
      },
      history: historyOf(wo),
      links: linksOf(wo),
    };
  }

  const shapeTransfer = (transfer) => {
    const wo = workOrders.find((row) => row.id === transfer.workOrderId);
    const product = productOf(wo?.productId);
    return {
      id: transfer.id,
      number: transfer.number,
      date: transfer.date,
      status: transfer.status,
      workOrderId: transfer.workOrderId,
      workOrderNumber: wo?.number ?? null,
      saleOrderNumber: orderOf(wo?.saleOrderId)?.number ?? null,
      productId: wo?.productId,
      productCode: product?.code,
      productName: product?.name,
      uom: product?.uom,
      qty: transfer.qty,
      warehouseId: transfer.warehouseId,
      warehouseName: warehouseOf(transfer.warehouseId)?.name ?? null,
      remarks: transfer.remarks ?? "",
      history: historyOf(transfer),
      links: wo ? [{ id: `wo-${wo.id}`, type: "workOrder", number: wo.number, status: wo.status, to: `/factory/work-orders/${wo.id}` }] : [],
    };
  };

  // ---- sales orders sent to the factory that still have quantity without a Work Order ----
  const plannedFor = (orderId, productId) =>
    workOrders.filter((wo) => wo.saleOrderId === orderId && wo.productId === productId && wo.status !== "cancelled").reduce((sum, wo) => sum + wo.qty, 0);

  function waitingOrders() {
    return orders()
      .filter((order) => order.status === "in_production")
      .map((order) => ({
        id: order.id,
        number: order.number,
        customerCode: customerOf(order.customerId)?.code,
        customerName: customerOf(order.customerId)?.name,
        deliveryDate: order.deliveryDate ?? null,
        lines: order.lines
          .map((line) => {
            const planned = plannedFor(order.id, line.productId);
            const product = productOf(line.productId);
            return { productId: line.productId, productCode: product?.code, productName: product?.name, uom: product?.uom, qty: line.qty, planned, remaining: line.qty - planned };
          })
          .filter((line) => line.remaining > 0),
      }))
      .filter((order) => order.lines.length > 0);
  }

  // ---- availability of materials for a quantity of a product (same answer as the Sale check) ----
  function availability(lines, exceptWorkOrderId = null) {
    const needs = new Map();
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
      // available = on hand - reserved by other open work orders (the one being looked at does not count against itself)
      const available = ledger ? ledger.availableTotal("material", materialId, exceptWorkOrderId ? { except: { type: "WO", id: Number(exceptWorkOrderId) } } : undefined) : (material?.onHand ?? 0);
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

  // ---- list helper ----
  function listOf(rows, { query, searchFields, sorts, defaultSort, dateField }) {
    const text = String(query.q ?? "").trim().toLowerCase();
    const status = query.status && query.status !== "all" ? query.status : null;
    const others = rows.filter(
      (row) =>
        (!query.from || (row[dateField] ?? "") >= query.from) &&
        (!query.to || (row[dateField] ?? "") <= query.to) &&
        (!query.product || row.productId === Number(query.product)) &&
        (!query.saleOrder || row.saleOrderId === Number(query.saleOrder)) &&
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
    if (sortKey === "board") {
      // the board: jobs that are running first, then the scheduled, the drafts, the finished and the cancelled; the soonest plan finish first
      const rank = { in_process: 0, scheduled: 1, draft: 2, finished: 3, cancelled: 4 };
      result = [...result].sort((a, b) => rank[a.status] - rank[b.status] || String(a.planFinish ?? "9999").localeCompare(String(b.planFinish ?? "9999")) || a.id - b.id);
    } else if (sorts.includes(field)) {
      result = [...result].sort((a, b) => {
        const left = a[field];
        const right = b[field];
        let order;
        if (left == null || left === "") order = right == null || right === "" ? 0 : 1; // empty dates last
        else if (right == null || right === "") order = -1;
        else order = typeof left === "number" ? left - right : String(left).localeCompare(String(right));
        return (descending ? -order : order) || b.id - a.id;
      });
    }
    const pageSize = Math.min(Number(query.pageSize) || 20, 100);
    const total = result.length;
    const page = Math.min(Math.max(Number(query.page) || 1, 1), Math.max(1, Math.ceil(total / pageSize)));
    return new MockResponse({ data: result.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total, statusCounts } });
  }

  // ---- validation ----
  function checkWorkOrder(body, errors, existing) {
    const order = orderOf(body.saleOrderId ?? existing?.saleOrderId);
    const productId = Number(body.productId ?? existing?.productId);
    if (!existing) {
      if (!order || order.status !== "in_production") errors.push({ path: ["saleOrderId"], message: "INVALID" });
      else if (!order.lines.some((line) => line.productId === productId)) errors.push({ path: ["productId"], message: "INVALID" });
    }
    if (!Number.isInteger(body.qty) || body.qty <= 0) errors.push({ path: ["qty"], message: "INVALID" });
    else if (order) {
      const line = order.lines.find((item) => item.productId === productId);
      const others = plannedFor(order.id, productId) - (existing && existing.status !== "cancelled" ? existing.qty : 0);
      if (line && body.qty > line.qty - others) errors.push({ path: ["qty"], message: "TOO_MANY" });
    }
    for (const field of ["planStart", "planFinish"]) {
      if (body[field] && !DATE_RE.test(String(body[field]))) errors.push({ path: [field], message: "INVALID" });
    }
    if (body.planStart && body.planFinish && body.planFinish < body.planStart) errors.push({ path: ["planFinish"], message: "DATE_ORDER" });
  }
  const fail = (errors) => {
    if (errors.length) throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", errors);
  };
  const noteOf = (body) => String(body.note ?? "").trim();
  const needNote = (note) => {
    if (!note) throw invalid("note", "REQUIRED");
  };

  // ---- Work Order actions: from, to, who ----
  const woActions = {
    schedule: { from: ["draft"], to: "scheduled", manager: true },
    "back-to-draft": { from: ["scheduled"], to: "draft", manager: true },
    start: { from: ["scheduled"], to: "in_process" },
    finish: { from: ["in_process"], to: "finished", manager: true },
    cancel: { from: ["draft", "scheduled", "in_process"], to: "cancelled" },
  };

  const routes = {
    // ------------------------------------------------------------------ Work Orders
    "GET /factory/work-orders": ({ authorization, query }) => {
      guard(authorization);
      const rows = workOrders.map((wo) => ({ ...shapeWo(wo), progressSteps: undefined }));
      return listOf(rows, {
        query,
        searchFields: ["number", "productCode", "productName", "saleOrderNumber", "customerName", "customerCode"],
        sorts: ["number", "planStart", "planFinish", "qty", "status", "productCode"],
        defaultSort: "board",
        dateField: "planFinish",
      });
    },
    "GET /factory/waiting-orders": ({ authorization }) => {
      guard(authorization);
      return waitingOrders();
    },
    "POST /factory/availability": ({ authorization, body }) => {
      guard(authorization);
      const lines = (Array.isArray(body.lines) ? body.lines : []).filter((line) => Number.isInteger(line.qty) && line.qty > 0);
      return availability(lines, body.workOrderId);
    },
    "GET /factory/work-orders/:id": ({ authorization, params }) => {
      guard(authorization);
      return shapeWo(findIn(workOrders, params.id));
    },
    "POST /factory/work-orders": ({ authorization, body }) => {
      const { user } = guard(authorization);
      const errors = [];
      checkWorkOrder(body, errors);
      fail(errors);
      const steps = store()
        .routing.filter((step) => step.productId === Number(body.productId))
        .sort((a, b) => a.stepNo - b.stepNo);
      if (steps.length === 0) throw new MockHttpError(409, "NO_ROUTING", "The product has no production steps");
      const date = today();
      const wo = {
        id: seq.wo++,
        number: nextNumber("WO", date),
        date,
        saleOrderId: Number(body.saleOrderId),
        productId: Number(body.productId),
        qty: body.qty,
        planStart: body.planStart || null,
        planFinish: body.planFinish || null,
        remarks: String(body.remarks ?? ""),
        status: "draft",
        steps: steps.map((step) => ({ id: seq.step++, stepNo: step.stepNo, processName: step.processName, machineId: step.machineId ?? null, status: "pending" })),
        log: [],
      };
      const order = orderOf(wo.saleOrderId);
      logEntry(wo, "created", "draft", user.name, order ? `For ${order.number}` : null);
      workOrders.push(wo);
      return new MockResponse({ data: shapeWo(wo), status: 201, message: "Created" });
    },
    "PUT /factory/work-orders/:id": ({ authorization, params, body }) => {
      guard(authorization);
      const wo = findIn(workOrders, params.id);
      if (wo.status !== "draft") throw wrongStatus();
      const errors = [];
      checkWorkOrder(body, errors, wo);
      fail(errors);
      wo.qty = body.qty;
      wo.planStart = body.planStart || null;
      wo.planFinish = body.planFinish || null;
      wo.remarks = String(body.remarks ?? "");
      return shapeWo(wo);
    },
    "DELETE /factory/work-orders/:id": ({ authorization, params }) => {
      guard(authorization);
      const wo = findIn(workOrders, params.id);
      if (wo.status !== "draft") throw wrongStatus();
      workOrders.splice(workOrders.indexOf(wo), 1);
      return null;
    },
    "POST /factory/work-orders/:id/steps/:stepId/:action": ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const wo = findIn(workOrders, params.id);
      const step = findIn(wo.steps, params.stepId);
      const note = noteOf(body);
      const label = `${step.stepNo}. ${step.processName}`;
      if (params.action === "start") {
        if (!canStartStep(wo, step)) {
          // Q5: a Manager may start a step before the previous one is done, with a reason
          const startable = ["scheduled", "in_process"].includes(wo.status) && step.status === "pending";
          if (!startable) throw wrongStatus();
          if (!isManager(role)) throw new MockHttpError(409, "STEP_ORDER", "The step before is not done");
          needNote(note);
        }
        const operator = employeeOf(body.operatorId);
        if (!operator || operator.status !== "active") throw invalid("operatorId", "REQUIRED");
        const machineId = body.machineId ? Number(body.machineId) : (step.machineId ?? null);
        if (machineId && !machineOf(machineId)) throw invalid("machineId");
        if (wo.status === "scheduled") moveMaterials(wo, "scheduled", "in_process", user.name);
        Object.assign(step, { status: "in_progress", operatorId: operator.id, machineId, startAt: new Date().toISOString(), endAt: null, qtyDone: null, qtyDefect: null });
        if (wo.status === "scheduled") {
          wo.status = "in_process";
          logEntry(wo, "start", "in_process", user.name, label);
        }
        logEntry(wo, "step-start", null, user.name, note ? `${label} (${note})` : label);
      } else if (params.action === "done") {
        if (wo.status !== "in_process" || step.status !== "in_progress") throw wrongStatus();
        const qtyDone = body.qtyDone;
        const qtyDefect = body.qtyDefect ?? 0;
        const errors = [];
        if (!Number.isInteger(qtyDone) || qtyDone < 0 || qtyDone > wo.qty) errors.push({ path: ["qtyDone"], message: "INVALID" });
        if (!Number.isInteger(qtyDefect) || qtyDefect < 0 || qtyDefect > wo.qty) errors.push({ path: ["qtyDefect"], message: "INVALID" });
        fail(errors);
        Object.assign(step, { status: "done", endAt: new Date().toISOString(), qtyDone, qtyDefect });
        logEntry(wo, "step-done", null, user.name, label);
      } else if (params.action === "reopen") {
        if (!isManager(role)) throw forbid();
        needNote(note);
        if (wo.status !== "in_process" || step.status !== "done") throw wrongStatus();
        if (step.stepNo < wo.steps.length && wo.steps.find((s) => s.stepNo === step.stepNo + 1)?.status !== "pending") throw wrongStatus();
        Object.assign(step, { status: "in_progress", endAt: null, qtyDone: null, qtyDefect: null });
        logEntry(wo, "step-reopen", null, user.name, `${label} (${note})`);
      } else {
        throw new MockHttpError(404, "ROUTE_NOT_FOUND", "Unknown action");
      }
      return shapeWo(wo);
    },
    "POST /factory/work-orders/:id/:action": ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const wo = findIn(workOrders, params.id);
      const note = noteOf(body);
      if (params.action === "revert") {
        if (!isManager(role)) throw forbid();
        needNote(note);
        const previous = statusBefore(wo);
        if (!previous) throw wrongStatus();
        if (wo.status === "finished" && transfersOf(wo).some((transfer) => transfer.status === "transferred")) throw new MockHttpError(409, "INVALID_STATUS", "Revert the transfers first");
        moveMaterials(wo, wo.status, previous, user.name);
        wo.status = previous;
        logEntry(wo, "revert", previous, user.name, note);
        return shapeWo(wo);
      }
      const action = woActions[params.action];
      if (!action) throw new MockHttpError(404, "ROUTE_NOT_FOUND", "Unknown action");
      if (action.manager && !isManager(role)) throw forbid();
      if (!action.from.includes(wo.status)) throw wrongStatus();

      if (params.action === "schedule" && (!wo.planStart || !wo.planFinish)) {
        throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [
          ...(wo.planStart ? [] : [{ path: ["planStart"], message: "REQUIRED" }]),
          ...(wo.planFinish ? [] : [{ path: ["planFinish"], message: "REQUIRED" }]),
        ]);
      }
      if (params.action === "cancel") {
        // Draft / Scheduled: any Factory user. Running: Manager or Admin, with a reason (Q2).
        if (wo.status === "in_process") {
          if (!isManager(role)) throw forbid();
          needNote(note);
        }
        if (transfersOf(wo).length) throw new MockHttpError(409, "INVALID_STATUS", "Remove the transfers first");
      }
      if (params.action === "finish") {
        // Q4: only when every step is done; a Manager may finish early with a reason
        if (wo.steps.some((step) => step.status !== "done")) {
          if (wo.steps.some((step) => step.status === "in_progress")) throw new MockHttpError(409, "STEPS_NOT_DONE", "A step is still running");
          needNote(note);
        }
      }
      moveMaterials(wo, wo.status, action.to, user.name);
      wo.status = action.to;
      logEntry(wo, params.action, action.to, user.name, note || null);
      return shapeWo(wo);
    },

    // ------------------------------------------------------------------ Production tracking (shop floor)
    "GET /factory/tracking": ({ authorization, query }) => {
      guard(authorization);
      const machineFilter = query.machine ? Number(query.machine) : null;
      const cards = [];
      for (const wo of workOrders) {
        if (!["scheduled", "in_process", "finished"].includes(wo.status)) continue;
        const shaped = shapeWo(wo);
        for (const step of shaped.steps) {
          const column =
            step.status === "in_progress" ? "running" : step.status === "done" && step.endAt?.slice(0, 10) === today() ? "done" : step.canStart ? "waiting" : null;
          if (!column) continue;
          if (machineFilter && step.machineId !== machineFilter) continue;
          cards.push({
            column,
            workOrderId: wo.id,
            workOrderNumber: wo.number,
            productCode: shaped.productCode,
            productName: shaped.productName,
            uom: shaped.uom,
            qty: wo.qty,
            planFinish: wo.planFinish,
            late: shaped.progress.late,
            stepsTotal: shaped.steps.length,
            step,
          });
        }
      }
      return cards;
    },

    // ------------------------------------------------------------------ Finished goods transfers
    "GET /factory/transfers": ({ authorization, query }) => {
      guard(authorization);
      const rows = transfers.map(shapeTransfer);
      return listOf(rows, {
        query,
        searchFields: ["number", "workOrderNumber", "saleOrderNumber", "productCode", "productName", "warehouseName"],
        sorts: ["number", "date", "workOrderNumber", "qty", "status"],
        defaultSort: "-date",
        dateField: "date",
      });
    },
    "GET /factory/transfers/:id": ({ authorization, params }) => {
      guard(authorization);
      return shapeTransfer(findIn(transfers, params.id));
    },
    "POST /factory/transfers": ({ authorization, body }) => {
      const { user } = guard(authorization);
      const errors = [];
      checkTransfer(body, errors);
      fail(errors);
      const date = body.date;
      const transfer = { id: seq.ft++, number: nextNumber("FT", date), date, workOrderId: Number(body.workOrderId), qty: body.qty, warehouseId: Number(body.warehouseId), remarks: String(body.remarks ?? ""), status: "draft", log: [] };
      const wo = workOrders.find((row) => row.id === transfer.workOrderId);
      logEntry(transfer, "created", "draft", user.name, `From ${wo.number}`);
      transfers.push(transfer);
      return new MockResponse({ data: shapeTransfer(transfer), status: 201, message: "Created" });
    },
    "PUT /factory/transfers/:id": ({ authorization, params, body }) => {
      guard(authorization);
      const transfer = findIn(transfers, params.id);
      if (transfer.status !== "draft") throw wrongStatus();
      const errors = [];
      checkTransfer({ ...body, workOrderId: transfer.workOrderId }, errors, transfer);
      fail(errors);
      Object.assign(transfer, { date: body.date, qty: body.qty, warehouseId: Number(body.warehouseId), remarks: String(body.remarks ?? "") });
      return shapeTransfer(transfer);
    },
    "DELETE /factory/transfers/:id": ({ authorization, params }) => {
      guard(authorization);
      const transfer = findIn(transfers, params.id);
      if (transfer.status !== "draft") throw wrongStatus();
      transfers.splice(transfers.indexOf(transfer), 1);
      return null;
    },
    "POST /factory/transfers/:id/:action": ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const transfer = findIn(transfers, params.id);
      const note = noteOf(body);
      if (!isManager(role)) throw forbid();
      if (params.action === "transfer") {
        if (transfer.status !== "draft") throw wrongStatus();
        const made = workOrders.find((row) => row.id === transfer.workOrderId);
        ledger?.book([{ itemType: "product", itemId: made.productId, warehouseId: transfer.warehouseId, qty: transfer.qty, type: "produce" }], { doc: { type: "FT", id: transfer.id, number: transfer.number }, by: user.name });
        transfer.status = "transferred";
        logEntry(transfer, "transfer", "transferred", user.name, note || null);
      } else if (params.action === "revert") {
        needNote(note);
        if (transfer.status !== "transferred") throw wrongStatus();
        ledger?.reverseDoc("FT", transfer.id, { by: user.name, note: "Reverted" });
        transfer.status = "draft";
        logEntry(transfer, "revert", "draft", user.name, note);
      } else {
        throw new MockHttpError(404, "ROUTE_NOT_FOUND", "Unknown action");
      }
      return shapeTransfer(transfer);
    },
  };

  function checkTransfer(body, errors, existing) {
    const wo = workOrders.find((row) => row.id === Number(body.workOrderId));
    if (!wo || wo.status !== "finished") errors.push({ path: ["workOrderId"], message: "INVALID" });
    if (!DATE_RE.test(String(body.date ?? ""))) errors.push({ path: ["date"], message: "REQUIRED" });
    const warehouse = warehouseOf(body.warehouseId);
    if (!warehouse || warehouse.type !== "FINISHED_GOODS") errors.push({ path: ["warehouseId"], message: "REQUIRED" });
    if (!Number.isInteger(body.qty) || body.qty <= 0) errors.push({ path: ["qty"], message: "INVALID" });
    else if (wo && body.qty > producedQty(wo) - plannedTransferQty(wo) + (existing?.qty ?? 0)) errors.push({ path: ["qty"], message: "TOO_MANY" });
  }

  // =========================================================================================================
  // Seed data: 7 Work Orders on the seeded sale orders, covering every status, and 3 transfers.
  // =========================================================================================================
  const at = (date, time) => `${date}T${time}:00.000Z`;
  function seedWo({ saleOrderId, productId, qty, planStart, planFinish, status, by, steps = [], date = "2026-10-01", note }) {
    const route = store().routing.filter((step) => step.productId === productId).sort((a, b) => a.stepNo - b.stepNo);
    const wo = {
      id: seq.wo++,
      number: seedNumber("WO", date, seq.wo - 1),
      date,
      saleOrderId,
      productId,
      qty,
      planStart,
      planFinish,
      remarks: note ?? "",
      status,
      steps: route.map((step, index) => ({ id: seq.step++, stepNo: step.stepNo, processName: step.processName, machineId: step.machineId ?? null, status: "pending", ...(steps[index] ?? {}) })),
      log: [],
    };
    logEntry(wo, "created", "draft", by, `For ${orderOf(saleOrderId)?.number}`, at(date, "09:00"));
    if (["scheduled", "in_process", "finished"].includes(status)) logEntry(wo, "schedule", "scheduled", "Yuki Tanaka", null, at(date, "10:00"));
    if (["in_process", "finished"].includes(status)) logEntry(wo, "start", "in_process", by, null, at(planStart ?? date, "08:30"));
    if (status === "finished") logEntry(wo, "finish", "finished", "Yuki Tanaka", null, at(planFinish ?? date, "17:00"));
    if (status === "cancelled") logEntry(wo, "cancel", "cancelled", "Yuki Tanaka", "Sale order cancelled", at(date, "15:00"));
    workOrders.push(wo);
    // the seeded running and finished Work Orders issued their materials when they started
    if (consumed(status)) moveMaterials(wo, "scheduled", status, by, { at: at(planStart ?? date, "08:30"), seed: true });
    return wo;
  }
  const done = (operatorId, start, end, qtyDone, qtyDefect = 0) => ({ status: "done", operatorId, startAt: start, endAt: end, qtyDone, qtyDefect });

  // SO-0001 (in production): RF-2D x 20 + RF-1D x 10; SO-0002 (ready to deliver): RF-2D x 30 + RF-1D x 20; SO-0004 (delivered): RF-2D x 6
  seedWo({
    saleOrderId: 1, productId: 1, qty: 12, planStart: "2026-10-02", planFinish: "2026-10-05", status: "in_process", by: "Ken Suzuki",
    steps: [done(1, at("2026-10-02", "08:30"), at("2026-10-02", "16:30"), 12), done(3, at("2026-10-03", "08:30"), at("2026-10-03", "15:00"), 12, 1), { status: "in_progress", operatorId: 1, startAt: at("2026-10-06", "09:00") }],
  });
  seedWo({ saleOrderId: 1, productId: 2, qty: 6, planStart: "2026-10-08", planFinish: "2026-10-16", status: "scheduled", by: "Ken Suzuki", date: "2026-10-02" });
  seedWo({
    saleOrderId: 2, productId: 1, qty: 30, planStart: "2026-09-22", planFinish: "2026-09-30", status: "finished", by: "Ken Suzuki", date: "2026-09-21",
    steps: [done(1, at("2026-09-22", "08:30"), at("2026-09-23", "16:00"), 30), done(3, at("2026-09-24", "08:30"), at("2026-09-25", "16:00"), 30, 2), done(3, at("2026-09-26", "08:30"), at("2026-09-27", "16:00"), 29), done(2, at("2026-09-28", "08:30"), at("2026-09-30", "16:00"), 29, 1)],
  });
  seedWo({
    saleOrderId: 2, productId: 2, qty: 20, planStart: "2026-09-23", planFinish: "2026-10-02", status: "finished", by: "Ken Suzuki", date: "2026-09-21",
    steps: [done(1, at("2026-09-23", "08:30"), at("2026-09-25", "16:00"), 20), done(3, at("2026-09-28", "08:30"), at("2026-10-02", "16:00"), 20)],
  });
  seedWo({
    saleOrderId: 4, productId: 1, qty: 6, planStart: "2026-09-15", planFinish: "2026-09-20", status: "finished", by: "Ken Suzuki", date: "2026-09-14",
    steps: [done(1, at("2026-09-15", "08:30"), at("2026-09-16", "16:00"), 6), done(3, at("2026-09-17", "08:30"), at("2026-09-17", "16:00"), 6), done(3, at("2026-09-18", "08:30"), at("2026-09-18", "16:00"), 6), done(2, at("2026-09-19", "08:30"), at("2026-09-19", "16:00"), 6)],
  });
  seedWo({ saleOrderId: 6, productId: 1, qty: 3, planStart: null, planFinish: null, status: "cancelled", by: "Ken Suzuki", date: "2026-09-05" });
  seedWo({ saleOrderId: 1, productId: 1, qty: 4, planStart: null, planFinish: null, status: "draft", by: "Ken Suzuki", date: "2026-10-06", note: "The rest of the first order" });

  function seedTransfer({ workOrderId, qty, status, date, warehouseId = 2 }) {
    const wo = workOrders.find((row) => row.id === workOrderId);
    const transfer = { id: seq.ft++, number: seedNumber("FT", date, seq.ft - 1), date, workOrderId, qty, warehouseId, remarks: "", status, log: [] };
    logEntry(transfer, "created", "draft", "Ken Suzuki", `From ${wo.number}`, at(date, "13:00"));
    if (status === "transferred") {
      logEntry(transfer, "transfer", "transferred", "Yuki Tanaka", null, at(date, "14:00"));
      ledger?.book([{ itemType: "product", itemId: wo.productId, warehouseId, qty, type: "produce" }], { doc: { type: "FT", id: transfer.id, number: transfer.number }, by: "Yuki Tanaka", at: at(date, "14:00"), seed: true });
    }
    transfers.push(transfer);
  }
  seedTransfer({ workOrderId: 3, qty: 29, status: "transferred", date: "2026-10-01" });
  seedTransfer({ workOrderId: 5, qty: 6, status: "transferred", date: "2026-09-21" });
  seedTransfer({ workOrderId: 4, qty: 20, status: "draft", date: "2026-10-03" });

  onFactory?.({ workOrders, transfers });
  return routes;
}
