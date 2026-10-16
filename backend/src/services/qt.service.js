import { prisma } from "../lib/prisma.js";
import { ApiError, Issues, conflict, notFound } from "../lib/errors.js";
import { containsFilter, iso, isInt, meta, nextNumber, paging, parseDate, str, today, ymd } from "../lib/util.js";
import { refuseIfInUse } from "../lib/inUse.js";
import * as attachments from "./attachment.service.js";
import * as orders from "./order.service.js";

const include = {
  customer: true,
  productionOrder: true,
  lines: { include: { product: true }, orderBy: { id: "asc" } }
};

function view(q, { withLines = true } = {}) {
  const lines = q.lines.map((l) => ({
    productId: l.productId,
    productCode: l.product.code,
    productName: l.product.name,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    amount: l.quantity * l.unitPrice
  }));
  const out = {
    id: q.id,
    qtNumber: q.qtNumber,
    qtDate: ymd(q.qtDate),
    customerId: q.customerId,
    customerName: q.customer.name,
    customerAddress: q.customer.address,
    notes: q.notes,
    customerPoNumber: q.customerPoNumber,
    customerPoDate: ymd(q.customerPoDate),
    status: q.status,
    total: lines.reduce((s, l) => s + l.amount, 0),
    productionOrderId: q.productionOrderId,
    productionOrderNumber: q.productionOrder?.orderNumber ?? null,
    createdAt: iso(q.createdAt),
    updatedAt: iso(q.updatedAt)
  };
  return withLines ? { ...out, lines } : out;
}

async function validate(body) {
  const issues = new Issues();
  const qtNumber = str(body.qtNumber);
  if (!qtNumber) issues.add("qtNumber", "REQUIRED");

  const qtDate = body.qtDate ? parseDate(body.qtDate) : null;
  if (!body.qtDate) issues.add("qtDate", "REQUIRED");
  else if (!qtDate) issues.add("qtDate", "INVALID_DATE");

  if (!isInt(body.customerId)) issues.add("customerId", "REQUIRED");
  else if (!(await prisma.customer.findUnique({ where: { id: body.customerId } }))) issues.add("customerId", "INVALID");

  let customerPoDate = null;
  if (body.customerPoDate) {
    customerPoDate = parseDate(body.customerPoDate);
    if (!customerPoDate) issues.add("customerPoDate", "INVALID_DATE");
  }

  const lines = Array.isArray(body.lines) ? body.lines : undefined;
  if (lines) {
    const seen = new Set();
    for (const [i, l] of lines.entries()) {
      if (!isInt(l?.productId)) issues.add(["lines", i, "productId"], "REQUIRED");
      else if (seen.has(l.productId)) issues.add("lines", "DUPLICATE");
      else seen.add(l.productId);
      if (!isInt(l?.quantity) || l.quantity < 1) issues.add(["lines", i, "quantity"], "INVALID");
      if (!isInt(l?.unitPrice) || l.unitPrice < 0) issues.add(["lines", i, "unitPrice"], "INVALID");
    }
    if (seen.size) {
      const found = new Set((await prisma.product.findMany({ where: { id: { in: [...seen] } }, select: { id: true } })).map((p) => p.id));
      lines.forEach((l, i) => {
        if (isInt(l?.productId) && !found.has(l.productId)) issues.add(["lines", i, "productId"], "INVALID");
      });
    }
  }
  issues.throwIfAny();
  return {
    qtNumber,
    qtDate,
    customerId: body.customerId,
    notes: str(body.notes),
    customerPoNumber: str(body.customerPoNumber),
    customerPoDate,
    lines: lines?.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice }))
  };
}

async function assertNumberFree(qtNumber, exceptId) {
  const found = await prisma.qtReference.findUnique({ where: { qtNumber } });
  if (found && found.id !== exceptId) throw conflict("DUPLICATE_VALUE", "QT number is used already", [{ path: ["qtNumber"], code: "DUPLICATE" }]);
}

export async function list(query) {
  const p = paging(query);
  const q = str(query.q);
  const status = str(query.status);
  if (status && !["Draft", "Confirmed"].includes(status)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation failed", [{ path: ["status"], code: "INVALID" }]);
  }
  const where = {};
  if (status) where.status = status;
  if (q) where.OR = [...containsFilter(["qtNumber", "notes", "customerPoNumber"], q).OR, { customer: { name: { contains: q } } }];
  const [rows, total] = await Promise.all([
    prisma.qtReference.findMany({ where, include, orderBy: { id: "desc" }, skip: p.skip, take: p.take }),
    prisma.qtReference.count({ where })
  ]);
  return { data: rows.map((r) => view(r, { withLines: false })), ...meta(p, total) };
}

async function load(id) {
  const q = await prisma.qtReference.findUnique({ where: { id }, include });
  if (!q) throw notFound("QT not found");
  return q;
}

export const get = async (id) => view(await load(id));

export async function create(body) {
  const v = await validate(body);
  await assertNumberFree(v.qtNumber);
  const q = await prisma.qtReference.create({
    data: {
      qtNumber: v.qtNumber,
      qtDate: v.qtDate,
      customerId: v.customerId,
      notes: v.notes,
      customerPoNumber: v.customerPoNumber,
      customerPoDate: v.customerPoDate,
      lines: { create: v.lines || [] }
    },
    include
  });
  return view(q);
}

const sameLines = (a, b) => {
  const key = (l) => `${l.productId}:${l.quantity}:${l.unitPrice}`;
  return a.length === b.length && a.map(key).sort().join() === b.map(key).sort().join();
};

export async function update(id, body) {
  const existing = await load(id);
  const v = await validate(body);
  await assertNumberFree(v.qtNumber, id);

  const confirmed = existing.status === "Confirmed";
  if (confirmed) {
    // The customer and the lines are locked after Confirm
    const unchangedLines = v.lines === undefined || sameLines(v.lines, existing.lines);
    if (v.customerId !== existing.customerId || !unchangedLines) throw conflict("QT_LOCKED", "A confirmed QT keeps its customer and its lines");
  }

  await prisma.$transaction(async (tx) => {
    if (!confirmed && v.lines) {
      await tx.qtLine.deleteMany({ where: { qtId: id } });
      await tx.qtLine.createMany({ data: v.lines.map((l) => ({ ...l, qtId: id })) });
    }
    await tx.qtReference.update({
      where: { id },
      data: {
        qtNumber: v.qtNumber,
        qtDate: v.qtDate,
        customerId: v.customerId,
        notes: v.notes,
        customerPoNumber: v.customerPoNumber,
        customerPoDate: v.customerPoDate
      }
    });
  });
  return get(id);
}

export async function confirm(id) {
  const qt = await load(id);
  if (qt.status === "Confirmed") {
    return { qt: view(qt), order: await orders.get(qt.productionOrderId), alreadyConfirmed: true, warnings: [] };
  }
  if (!qt.lines.length) throw new ApiError(400, "VALIDATION_ERROR", "A QT needs at least one line to be confirmed", [{ path: ["lines"], code: "REQUIRED" }]);

  const hasPo = await prisma.$transaction(async (tx) => {
    const order = await tx.productionOrder.create({
      data: {
        orderNumber: await nextNumber(tx, "productionOrder", "orderNumber", "ORD"),
        qtId: qt.id,
        customerId: qt.customerId,
        orderDate: today(),
        notes: "",
        lines: { create: qt.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })) }
      }
    });
    const confirmed = await tx.qtReference.updateMany({
      where: { id, status: "Draft" }, // a second press at the same time changes nothing
      data: { status: "Confirmed", productionOrderId: order.id }
    });
    if (confirmed.count === 0) throw conflict("QT_LOCKED", "The QT is confirmed already");
    return attachments.copyPoToOrder(tx, { id: qt.id, productionOrderId: order.id });
  });

  const fresh = await load(id);
  return { qt: view(fresh), order: await orders.get(fresh.productionOrderId), alreadyConfirmed: false, warnings: hasPo ? [] : ["NO_PO_FILE"] };
}

export async function remove(id) {
  const qt = await load(id);
  if (qt.status === "Confirmed") {
    refuseIfInUse([{ kind: "order", count: 1, items: [qt.productionOrder?.orderNumber ?? ""] }]);
  }
  const files = await prisma.$transaction(async (tx) => {
    const paths = await attachments.removeAllFor(tx, "QtReference", id);
    await tx.qtReference.delete({ where: { id } }); // the lines go with it
    return paths;
  });
  await attachments.deleteStored(files);
}
