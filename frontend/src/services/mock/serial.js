// In-memory Serial Numbers for VITE_USE_MOCK=true (docs/specs/f12-requirements-2.md, part B): one unique S/N per unit of a
// finished product, made only when a Factory user presses the button on a Work Order. What happens to a unit later
// (transferred to the warehouse, delivered, invoiced) is not copied here: it is read from the Work Order, the transfers,
// the delivery notes and the invoices, so the S/N can never disagree with them.

import { MockHttpError, MockResponse } from "./errors.js";

const matches = (value, text) => String(value ?? "").toLowerCase().includes(text);
const forbid = () => new MockHttpError(403, "FORBIDDEN", "You may not do this");
const wrongStatus = () => new MockHttpError(409, "INVALID_STATUS", "This is not possible in the current status");
const invalid = (path, message = "INVALID") => new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [{ path: [path], message }]);

export const SERIAL_STATUSES = ["made", "in_stock", "delivered", "void"];
/** A Work Order can make serial numbers from the moment it is scheduled (a draft is still being planned). */
const CAN_MAKE = ["scheduled", "in_process", "finished"];

const isAdmin = (user) => user.memberships.some((membership) => membership.role === "Admin");
const factoryRole = (user) => (isAdmin(user) ? "Admin" : (user.memberships.find((membership) => membership.department === "Factory")?.role ?? null));

export function serialRoutes({ userFromAuthorization, getStore, getFactory, getSale, getPurchase, getAccounting }) {
  const store = () => getStore();
  const serials = [];
  const counters = {};
  let seq = 1;

  // every signed-in user with a department (or Admin) may read; only Factory users and Admin make serial numbers
  const reader = (authorization) => {
    const user = userFromAuthorization(authorization);
    if (!isAdmin(user) && !user.memberships.some((membership) => membership.department)) throw forbid();
    return user;
  };
  const maker = (authorization) => {
    const user = userFromAuthorization(authorization);
    if (!factoryRole(user)) throw forbid();
    return user;
  };

  const workOrders = () => getFactory()?.workOrders ?? [];
  const transfers = () => getFactory()?.transfers ?? [];
  const deliveries = () => getSale()?.deliveries ?? [];
  const orderOfWo = (wo) => getSale()?.orders.find((order) => order.id === wo.saleOrderId);
  const productOf = (id) => store().products.find((row) => row.id === Number(id));
  const woOf = (id) => workOrders().find((row) => row.id === Number(id));
  const find = (sn) => serials.find((row) => row.sn.toLowerCase() === String(sn).trim().toLowerCase());

  // ---- numbering: <product code>-<yy>-<6 digits>, a running number per product and year, never reused ----
  function nextSn(productCode, year) {
    const key = `${productCode}-${String(year).slice(2)}`;
    counters[key] = (counters[key] ?? 0) + 1;
    return `${key}-${String(counters[key]).padStart(6, "0")}`;
  }

  // ---- where a unit is now, read from the other documents ----
  const ofWo = (wo) => serials.filter((row) => row.workOrderId === wo.id).sort((a, b) => a.id - b.id);
  /** The delivery note a serial number is written on (a delivered one wins over a draft). */
  function noteOf(sn) {
    const rows = deliveries().filter((dn) => dn.lines.some((line) => (line.serials ?? []).includes(sn)));
    return rows.find((dn) => dn.status === "delivered") ?? rows.find((dn) => dn.status === "draft") ?? null;
  }
  /** The transfers of a Work Order in the order they were made, with the range of units each one moved. */
  function transferRanges(wo) {
    let from = 0;
    return transfers()
      .filter((transfer) => transfer.workOrderId === wo.id && transfer.status === "transferred")
      .sort((a, b) => a.id - b.id)
      .map((transfer) => {
        const range = { transfer, from, to: from + transfer.qty };
        from += transfer.qty;
        return range;
      });
  }
  /** Units are moved in the order of their numbers: the first N serial numbers of a Work Order are the ones that were transferred. */
  function stateOf(row) {
    const wo = woOf(row.workOrderId);
    if (!wo || wo.status === "cancelled") return { status: "void", wo };
    const index = ofWo(wo).indexOf(row);
    const range = transferRanges(wo).find((item) => index >= item.from && index < item.to);
    const note = noteOf(row.sn);
    if (note?.status === "delivered") return { status: "delivered", wo, range, note };
    if (range) return { status: "in_stock", wo, range, note };
    return { status: "made", wo, note };
  }

  function shape(row) {
    const state = stateOf(row);
    const product = productOf(row.productId);
    const note = state.note;
    const order = state.wo && orderOfWo(state.wo);
    const customer = note ? store().customers.find((item) => item.id === note.customerId) : null;
    return {
      id: row.id,
      sn: row.sn,
      productId: row.productId,
      productCode: product?.code,
      productName: product?.name,
      workOrderId: row.workOrderId,
      workOrderNumber: state.wo?.number,
      saleOrderNumber: order?.number ?? null,
      status: state.status,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
      transferNumber: state.range?.transfer.number ?? null,
      deliveryNote: note ? { id: note.id, number: note.number, status: note.status } : null,
      customerName: customer?.name ?? null,
      // in stock and not written on a draft delivery note yet: it can be picked for a delivery
      free: state.status === "in_stock" && !note,
    };
  }

  // ---- the life of a unit: events in time order ----
  function timeline(row) {
    const state = stateOf(row);
    const wo = state.wo;
    const events = [{ type: "generated", at: row.createdAt, by: row.createdBy, ref: { type: "workOrder", number: wo?.number, to: wo ? `/factory/work-orders/${wo.id}` : null } }];
    if (!wo) return events;
    const log = (action) => wo.log.find((entry) => entry.action === action);
    const started = log("start");
    if (started) {
      const materials = store()
        .bom.filter((item) => item.productId === wo.productId)
        .map((item) => {
          const material = store().materials.find((m) => m.id === item.materialId);
          const lots = (getPurchase()?.receipts ?? [])
            .filter((gr) => gr.status === "posted")
            .flatMap((gr) => gr.lines.filter((line) => line.materialId === item.materialId && line.accepted > 0 && line.lot).map((line) => ({ lot: line.lot, receiptNumber: gr.number, receiptId: gr.id, supplier: store().suppliers.find((s) => s.id === getPurchase().orders.find((po) => po.id === gr.poId)?.supplierId)?.name ?? null })));
          return { code: material?.code, name: material?.name, uom: material?.uom, qtyPerUnit: item.qty, lots };
        });
      events.push({ type: "materials", at: started.at, by: started.actor, materials });
    }
    for (const step of wo.steps.filter((item) => item.status === "done")) {
      const machine = store().machines.find((m) => m.id === step.machineId);
      const operator = store().employees.find((e) => e.id === step.operatorId);
      events.push({ type: "step", at: step.endAt, by: operator?.name ?? null, step: { stepNo: step.stepNo, processName: step.processName, machine: machine ? `${machine.code} · ${machine.name}` : null, startAt: step.startAt ?? null, qtyDone: step.qtyDone ?? null, qtyDefect: step.qtyDefect ?? null } });
    }
    const finished = log("finish");
    if (finished && wo.status === "finished") events.push({ type: "finished", at: finished.at, by: finished.actor, ref: { type: "workOrder", number: wo.number, to: `/factory/work-orders/${wo.id}` } });
    if (state.range) {
      const entry = state.range.transfer.log.find((item) => item.action === "transfer");
      const warehouse = store().warehouses.find((w) => w.id === state.range.transfer.warehouseId);
      events.push({ type: "transferred", at: entry?.at ?? row.createdAt, by: entry?.actor ?? null, ref: { type: "transfer", number: state.range.transfer.number, to: `/factory/transfers/${state.range.transfer.id}` }, warehouse: warehouse?.name ?? null });
    }
    if (state.status === "delivered") {
      const entry = state.note.log.filter((item) => item.action === "confirm").pop();
      const customer = store().customers.find((item) => item.id === state.note.customerId);
      const order = getSale()?.orders.find((item) => item.id === state.note.saleOrderId);
      events.push({ type: "delivered", at: entry?.at ?? row.createdAt, by: entry?.actor ?? null, ref: { type: "delivery", number: state.note.number, to: `/sale/deliveries/${state.note.id}` }, customer: customer?.name ?? null, saleOrder: order?.number ?? null });
      for (const invoice of getAccounting()?.invoicesOfDelivery(state.note.id) ?? []) {
        if (invoice.status === "cancelled") continue;
        events.push({ type: "invoiced", at: invoice.history?.[invoice.history.length - 1]?.at ?? invoice.date, by: invoice.history?.[invoice.history.length - 1]?.actor ?? null, ref: { type: "invoice", number: invoice.number, to: `/accounting/invoices/${invoice.id}` }, invoiceStatus: invoice.status });
      }
    }
    if (state.status === "void") events.push({ type: "void", at: log("cancel")?.at ?? row.createdAt, by: log("cancel")?.actor ?? null, ref: { type: "workOrder", number: wo.number, to: `/factory/work-orders/${wo.id}` } });
    return events.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  }

  // ---- list helper ----
  function listOf(rows, { query, searchFields, sorts, defaultSort }) {
    const text = String(query.q ?? "").trim().toLowerCase();
    const status = query.status && query.status !== "all" ? query.status : null;
    const others = rows.filter(
      (row) =>
        (!query.product || row.productId === Number(query.product)) &&
        (!query.workOrder || row.workOrderId === Number(query.workOrder)) &&
        (!query.free || row.free || (query.dn && row.deliveryNote?.id === Number(query.dn) && row.status === "in_stock")) &&
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
        const order = typeof left === "number" ? left - right : String(left ?? "").localeCompare(String(right ?? ""));
        return (descending ? -order : order) || b.id - a.id;
      });
    }
    const pageSize = Math.min(Number(query.pageSize) || 20, 200);
    const total = result.length;
    const page = Math.min(Math.max(Number(query.page) || 1, 1), Math.max(1, Math.ceil(total / pageSize)));
    return new MockResponse({ data: result.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total, statusCounts } });
  }

  function make(wo, count, by, at = new Date().toISOString()) {
    const product = productOf(wo.productId);
    const year = at.slice(0, 4);
    const made = [];
    for (let index = 0; index < count; index += 1) {
      const row = { id: seq++, sn: nextSn(product.code, year), workOrderId: wo.id, productId: wo.productId, createdAt: at, createdBy: by };
      serials.push(row);
      made.push(row);
    }
    return made;
  }

  const routes = {
    "GET /serials": ({ authorization, query }) => {
      reader(authorization);
      const rows = serials.map(shape);
      return listOf(rows, { query, searchFields: ["sn", "productCode", "productName", "workOrderNumber", "saleOrderNumber", "customerName"], sorts: ["sn", "createdAt", "status", "productCode", "workOrderNumber"], defaultSort: "-sn" });
    },
    "GET /serials/:sn": ({ authorization, params }) => {
      reader(authorization);
      const row = find(decodeURIComponent(params.sn));
      if (!row) throw new MockHttpError(404, "SERIAL_NOT_FOUND", "No unit has this serial number");
      return { ...shape(row), timeline: timeline(row) };
    },
    "GET /factory/work-orders/:id/serials": ({ authorization, params }) => {
      reader(authorization);
      const wo = woOf(params.id);
      if (!wo) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
      const items = ofWo(wo).map(shape);
      const made = items.filter((row) => row.status !== "void").length;
      return new MockResponse({ data: items, meta: { total: items.length, qty: wo.qty, made, left: Math.max(0, wo.qty - made), canMake: CAN_MAKE.includes(wo.status) } });
    },
    "POST /factory/work-orders/:id/serials": ({ authorization, params, body }) => {
      const user = maker(authorization);
      const wo = woOf(params.id);
      if (!wo) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
      if (!CAN_MAKE.includes(wo.status)) throw wrongStatus();
      const made = ofWo(wo).length;
      if (!Number.isInteger(body.count) || body.count < 1) throw invalid("count", "INVALID");
      if (made + body.count > wo.qty) throw invalid("count", "TOO_MANY");
      const rows = make(wo, body.count, user.name);
      return new MockResponse({ data: rows.map(shape), status: 201, message: "Created" });
    },
  };

  // ---- what the delivery notes need ----
  const api = {
    routes,
    /** The product has units in stock that can be delivered: its delivery lines must say which ones. */
    isTracked: (productId, dnId) => serials.some((row) => row.productId === Number(productId) && stateOf(row).status === "in_stock" && (!noteOf(row.sn) || noteOf(row.sn).id === dnId)),
    /** Checks the serial numbers written on a delivery line; returns the error message or null. */
    checkPick: (productId, sns, dnId) => {
      const seen = new Set();
      for (const sn of sns) {
        const row = typeof sn === "string" ? find(sn) : null;
        if (!row || row.productId !== Number(productId) || seen.has(row.sn)) return "INVALID";
        seen.add(row.sn);
        const state = stateOf(row);
        const note = noteOf(row.sn);
        if (state.status !== "in_stock" || (note && note.id !== dnId)) return "NOT_AVAILABLE";
      }
      return null;
    },
    canonical: (sn) => find(sn)?.sn ?? sn,
    /** Seeds: the units of the demo Work Orders and the delivery notes that carry them. */
    seed: () => {
      const wos = workOrders();
      const byWo = (index) => wos[index];
      // WO-0001 (running, 12 units): four numbers made; WO-0003 (finished, 30): all made; WO-0005 (finished, 6): all made
      // (made on the day the Work Order was scheduled, before its first step)
      for (const [index, count] of [[0, 4], [2, 30], [4, 6]]) make(byWo(index), count, "Ken Suzuki", `${byWo(index).date}T11:00:00.000Z`);
      // the delivered notes carry their units: DN-2026-0001 the six of WO-0005, DN-2026-0002 the first 18 of WO-0003
      const take = (wo, from, to) => ofWo(wo).slice(from, to).map((row) => row.sn);
      const dns = deliveries();
      const first = dns.find((dn) => dn.status === "delivered" && dn.lines.some((line) => line.productId === 1 && line.deliverNow === 6));
      const second = dns.find((dn) => dn.status === "delivered" && dn.lines.some((line) => line.productId === 1 && line.deliverNow === 18));
      if (first) first.lines.find((line) => line.productId === 1).serials = take(byWo(4), 0, 6);
      if (second) second.lines.find((line) => line.productId === 1).serials = take(byWo(2), 0, 18);
    },
  };
  return api;
}
