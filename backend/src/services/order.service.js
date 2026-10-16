import { prisma } from "../lib/prisma.js";
import { ApiError, Issues, conflict, forbidden, notFound } from "../lib/errors.js";
import { containsFilter, iso, isInt, meta, paging, parseDate, str, ymd } from "../lib/util.js";
import { isAdmin } from "../lib/permissions.js";
import { deductForOrder } from "./stock.service.js";

const STATUSES = ["Not Started", "In Progress", "Completed"];
const include = {
  qt: true,
  customer: true,
  invoice: { include: { receipt: true } },
  lines: { include: { product: true, processes: { orderBy: { sequence: "asc" } } }, orderBy: { id: "asc" } }
};

// Computed, never stored (docs/api/orders.md)
export function orderStatus(order) {
  const processes = order.lines.flatMap((l) => l.processes);
  if (processes.length && processes.every((p) => p.status === "Completed")) return "Completed";
  if (processes.some((p) => p.status !== "Not Started" || p.completedQuantity > 0)) return "In Progress";
  return "Draft";
}

function baseView(o) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    qtId: o.qtId,
    qtNumber: o.qt.qtNumber,
    customerPoNumber: o.qt.customerPoNumber,
    customerPoDate: ymd(o.qt.customerPoDate),
    customerId: o.customerId,
    customerName: o.customer.name,
    orderDate: ymd(o.orderDate),
    notes: o.notes,
    status: orderStatus(o),
    started: !!o.startedAt,
    startedAt: iso(o.startedAt),
    invoice: o.invoice
      ? {
          id: o.invoice.id,
          invoiceNumber: o.invoice.invoiceNumber,
          status: o.invoice.status,
          receiptId: o.invoice.receipt?.id ?? null,
          receiptNumber: o.invoice.receipt?.receiptNumber ?? null
        }
      : null,
    createdAt: iso(o.createdAt),
    updatedAt: iso(o.updatedAt)
  };
}

const lineView = (l) => ({
  id: l.id,
  productId: l.productId,
  productCode: l.product.code,
  productName: l.product.name,
  quantity: l.quantity,
  unitPrice: l.unitPrice,
  processes: l.processes.map((p) => ({
    id: p.id,
    sequence: p.sequence,
    name: p.name,
    instructions: p.instructions,
    status: p.status,
    completedQuantity: p.completedQuantity
  }))
});

async function historyOf(orderId) {
  const rows = await prisma.progressEntry.findMany({
    where: { process: { line: { orderId } } },
    include: { process: true, user: true },
    orderBy: [{ at: "desc" }, { id: "desc" }]
  });
  return rows.map((h) => ({
    id: h.id,
    lineId: h.process.lineId,
    processId: h.processId,
    processName: h.process.name,
    status: h.status,
    completedQuantity: h.completedQuantity,
    workDate: ymd(h.workDate),
    note: h.note,
    userId: h.userId,
    userName: h.user.name,
    at: iso(h.at)
  }));
}

export async function get(id) {
  const o = await prisma.productionOrder.findUnique({ where: { id }, include });
  if (!o) throw notFound("Order not found");
  return { ...baseView(o), lines: o.lines.map(lineView), history: await historyOf(id) };
}

export async function list(query) {
  const p = paging(query);
  const q = str(query.q);
  const status = str(query.status);
  if (status && !["Draft", "In Progress", "Completed"].includes(status)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation failed", [{ path: ["status"], code: "INVALID" }]);
  }
  const where = q
    ? { OR: [...containsFilter(["orderNumber", "notes"], q).OR, { customer: { name: { contains: q } } }, { qt: { qtNumber: { contains: q } } }] }
    : {};

  // The status is computed, so it is filtered after loading
  if (status) {
    const all = await prisma.productionOrder.findMany({ where, include, orderBy: { id: "desc" } });
    const rows = all.filter((o) => orderStatus(o) === status);
    return { data: rows.slice(p.skip, p.skip + p.take).map(baseView), ...meta(p, rows.length) };
  }
  const [rows, total] = await Promise.all([
    prisma.productionOrder.findMany({ where, include, orderBy: { id: "desc" }, skip: p.skip, take: p.take }),
    prisma.productionOrder.count({ where })
  ]);
  return { data: rows.map(baseView), ...meta(p, total) };
}

export async function update(id, body) {
  const order = await prisma.productionOrder.findUnique({ where: { id } });
  if (!order) throw notFound("Order not found");
  if (order.startedAt) throw conflict("ORDER_LOCKED", "The order is started, its products and processes cannot change");

  const issues = new Issues();
  const orderDate = body.orderDate ? parseDate(body.orderDate) : null;
  if (!body.orderDate) issues.add("orderDate", "REQUIRED");
  else if (!orderDate) issues.add("orderDate", "INVALID_DATE");

  const lines = Array.isArray(body.lines) ? body.lines : [];
  const productIds = new Set();
  lines.forEach((line, i) => {
    if (!isInt(line?.productId)) issues.add(["lines", i, "productId"], "REQUIRED");
    else productIds.add(line.productId);
    if (!isInt(line?.quantity) || line.quantity < 1) issues.add(["lines", i, "quantity"], "INVALID");
    if (!isInt(line?.unitPrice) || line.unitPrice < 0) issues.add(["lines", i, "unitPrice"], "INVALID");
    (Array.isArray(line?.processes) ? line.processes : []).forEach((p, j) => {
      if (!str(p?.name)) issues.add(["lines", i, "processes", j, "name"], "REQUIRED");
    });
  });
  if (productIds.size) {
    const found = new Set((await prisma.product.findMany({ where: { id: { in: [...productIds] } }, select: { id: true } })).map((p) => p.id));
    lines.forEach((line, i) => {
      if (isInt(line?.productId) && !found.has(line.productId)) issues.add(["lines", i, "productId"], "INVALID");
    });
  }
  issues.throwIfAny();

  await prisma.$transaction(async (tx) => {
    await tx.orderLine.deleteMany({ where: { orderId: id } });
    await tx.productionOrder.update({
      where: { id },
      data: {
        orderDate,
        notes: str(body.notes),
        lines: {
          create: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            processes: {
              create: (l.processes || []).map((p, j) => ({ sequence: j + 1, name: str(p.name), instructions: str(p.instructions) }))
            }
          }))
        }
      }
    });
  });
  return get(id);
}

export async function start(id, user) {
  const order = await prisma.productionOrder.findUnique({ where: { id }, include: { lines: { include: { processes: true } } } });
  if (!order) throw notFound("Order not found");
  if (order.startedAt) throw conflict("ALREADY_STARTED", "The order is started already");
  if (!order.lines.length || order.lines.some((l) => !l.processes.length)) {
    throw conflict("ORDER_NOT_READY", "The order needs a line and a process on every line");
  }
  await prisma.$transaction(async (tx) => {
    await deductForOrder(tx, order, user.id); // 409 STOCK_SHORT changes nothing
    await tx.productionOrder.update({ where: { id }, data: { startedAt: new Date() } });
  });
  return get(id);
}

export async function addProgress(id, body, user) {
  const order = await prisma.productionOrder.findUnique({ where: { id }, include: { invoice: true, lines: { include: { processes: true } } } });
  if (!order) throw notFound("Order not found");
  if (!order.startedAt) throw conflict("ORDER_NOT_STARTED", "The production is not started");
  if (order.invoice) throw conflict("ORDER_INVOICED", "The order is invoiced, its progress is locked");

  const issues = new Issues();
  const line = order.lines.find((l) => l.processes.some((p) => p.id === body.processId));
  const process = line?.processes.find((p) => p.id === body.processId);
  if (!process) issues.add("processId", body.processId === undefined ? "REQUIRED" : "INVALID");
  if (!STATUSES.includes(body.status)) issues.add("status", body.status ? "INVALID" : "REQUIRED");

  const qty = body.completedQuantity;
  const workDate = body.workDate ? parseDate(body.workDate) : null;
  if (!body.workDate) issues.add("workDate", "REQUIRED");
  else if (!workDate) issues.add("workDate", "INVALID_DATE");
  const note = str(body.note);

  if (process) {
    // A completed process is changed by an Admin only
    if (process.status === "Completed" && !isAdmin(user)) throw new ApiError(403, "COMPLETED_LOCKED", "A completed process can be changed by an Admin only");
    if (!isInt(qty) || qty < 0) issues.add("completedQuantity", "INVALID");
    else if (qty > line.quantity) issues.add("completedQuantity", "TOO_HIGH");
    else if (STATUSES.includes(body.status)) {
      if (body.status === "Completed" && qty !== line.quantity) issues.add("completedQuantity", "MUST_EQUAL_REQUIRED");
      if (body.status !== "Completed" && qty === line.quantity) issues.add("completedQuantity", "MUST_BE_COMPLETED");
      if (body.status === "Not Started" && qty !== 0) issues.add("completedQuantity", "MUST_BE_ZERO");
    }
    if (process.status === "Completed" && body.status !== "Completed" && !note) issues.add("note", "REOPEN_NOTE");
  }
  issues.throwIfAny();

  await prisma.$transaction(async (tx) => {
    await tx.orderProcess.update({ where: { id: process.id }, data: { status: body.status, completedQuantity: qty } });
    await tx.progressEntry.create({
      data: { processId: process.id, status: body.status, completedQuantity: qty, workDate, note, userId: user.id }
    });
  });
  return get(id);
}
