import { prisma } from "../lib/prisma.js";
import { ApiError, Issues, conflict, notFound } from "../lib/errors.js";
import { containsFilter, iso, isInt, isQty, meta, nextNumber, num, paging, parseDate, str, today, ymd } from "../lib/util.js";
import * as attachments from "./attachment.service.js";
import { applyChange } from "./stock.service.js";

const DEPARTMENTS = ["Sales", "Factory", "Accounting", "Administration"];
const METHODS = ["Cash", "Bank transfer", "Cheque", "Credit card", "Other"];
const NEXT = { Draft: "Sent", Sent: "Received" };

const include = {
  supplier: true,
  creator: true,
  payment: true,
  lines: { include: { material: true }, orderBy: { id: "asc" } }
};

const paymentView = (p) => (p ? { paymentDate: ymd(p.paymentDate), amount: p.amount, method: p.method, referenceNo: p.referenceNo, note: p.note } : null);

function view(po, { withLines = true } = {}) {
  const out = {
    id: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplier.name,
    supplierAddress: po.supplier.address,
    department: po.department,
    requiredDate: ymd(po.requiredDate),
    notes: po.notes,
    status: po.status,
    total: po.total,
    paid: !!po.payment,
    payment: paymentView(po.payment),
    receivedAt: iso(po.receivedAt),
    createdBy: po.createdBy,
    createdByName: po.creator.name,
    createdAt: iso(po.createdAt),
    updatedAt: iso(po.updatedAt)
  };
  if (!withLines) return out;
  return {
    ...out,
    lines: po.lines.map((l) => ({
      id: l.id,
      materialId: l.materialId,
      materialCode: l.material.code,
      materialName: l.material.name,
      unit: l.unit,
      quantity: num(l.quantity),
      unitPrice: l.unitPrice,
      amount: l.amount,
      lotNumber: l.lotNumber
    }))
  };
}

async function load(id) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include });
  if (!po) throw notFound("Purchase order not found");
  return po;
}

export async function list(query) {
  const p = paging(query);
  const q = str(query.q);
  const status = str(query.status);
  const issues = new Issues();
  const where = {};
  if (status) {
    if (NEXT[status] || status === "Received") where.status = status;
    else issues.add("status", "INVALID");
  }
  if (query.supplierId) {
    if (Number.isInteger(Number(query.supplierId))) where.supplierId = Number(query.supplierId);
    else issues.add("supplierId", "INVALID");
  }
  if (query.paid === "true") where.payment = { isNot: null };
  else if (query.paid === "false") where.payment = null;
  else if (query.paid) issues.add("paid", "INVALID");
  issues.throwIfAny();
  if (q) where.OR = [{ poNumber: { contains: q } }, { supplier: { name: { contains: q } } }, { notes: { contains: q } }];

  const [rows, total] = await Promise.all([
    prisma.purchaseOrder.findMany({ where, include, orderBy: { id: "desc" }, skip: p.skip, take: p.take }),
    prisma.purchaseOrder.count({ where })
  ]);
  return { data: rows.map((r) => view(r, { withLines: false })), ...meta(p, total) };
}

export async function get(id) {
  return view(await load(id));
}

// Shared by create and update: the fields and the lines of a Draft PO
async function validate(body) {
  const issues = new Issues();

  let supplier = null;
  if (!isInt(body.supplierId)) issues.add("supplierId", "REQUIRED");
  else {
    supplier = await prisma.supplier.findUnique({ where: { id: body.supplierId }, include: { items: true } });
    if (!supplier) issues.add("supplierId", "REQUIRED");
    // An inactive supplier cannot be chosen on a new or changed PO; it stays on the POs it has
    else if (!supplier.active) issues.add("supplierId", "SUPPLIER_INACTIVE");
  }

  const requiredDate = body.requiredDate ? parseDate(body.requiredDate) : null;
  if (!body.requiredDate) issues.add("requiredDate", "REQUIRED");
  else if (!requiredDate) issues.add("requiredDate", "INVALID_DATE");

  const department = str(body.department);
  if (!department) issues.add("department", "REQUIRED");
  else if (!DEPARTMENTS.includes(department)) issues.add("department", "INVALID");

  const rawLines = Array.isArray(body.lines) ? body.lines : [];
  if (!rawLines.length) issues.add("lines", "REQUIRED");

  const materialIds = rawLines.filter((l) => isInt(l?.materialId)).map((l) => l.materialId);
  const materials = new Map((await prisma.material.findMany({ where: { id: { in: materialIds } } })).map((m) => [m.id, m]));
  const sold = new Map((supplier?.items ?? []).map((i) => [i.materialId, i.unitPrice]));

  const seen = new Set();
  let duplicate = false;
  const lines = [];
  rawLines.forEach((l, i) => {
    if (!isInt(l?.materialId)) return issues.add(["lines", i, "materialId"], "REQUIRED");
    const material = materials.get(l.materialId);
    if (!material) issues.add(["lines", i, "materialId"], "REQUIRED");
    else if (supplier && !sold.has(l.materialId)) issues.add(["lines", i, "materialId"], "NOT_SOLD_BY_SUPPLIER");
    if (seen.has(l.materialId)) duplicate = true;
    seen.add(l.materialId);

    const quantity = typeof l.quantity === "string" ? Number(l.quantity) : l.quantity;
    if (!isQty(quantity)) issues.add(["lines", i, "quantity"], "INVALID");
    // The price starts from the supplier's price; the user may change it
    const unitPrice = l.unitPrice === undefined || l.unitPrice === null ? sold.get(l.materialId) : l.unitPrice;
    if (!isInt(unitPrice) || unitPrice < 0) issues.add(["lines", i, "unitPrice"], "INVALID");

    if (material && isQty(quantity) && isInt(unitPrice)) {
      lines.push({ materialId: l.materialId, unit: material.unit, quantity, unitPrice, amount: Math.round(quantity * unitPrice) });
    }
  });
  if (duplicate) issues.add("lines", "DUPLICATE");
  issues.throwIfAny();

  return {
    supplierId: supplier.id,
    requiredDate,
    department,
    notes: str(body.notes),
    lines,
    total: lines.reduce((s, l) => s + l.amount, 0)
  };
}

export async function create(body, user) {
  const v = await validate(body);
  const po = await prisma.$transaction(async (tx) =>
    tx.purchaseOrder.create({
      data: {
        poNumber: await nextNumber(tx, "purchaseOrder", "poNumber", "PO"),
        supplierId: v.supplierId,
        department: v.department,
        requiredDate: v.requiredDate,
        notes: v.notes,
        total: v.total,
        createdBy: user.id,
        lines: { create: v.lines }
      },
      include
    })
  );
  return view(po);
}

export async function update(id, body) {
  const po = await load(id);
  if (po.status !== "Draft") throw conflict("PO_LOCKED", "Only a Draft PO can change");
  const v = await validate(body);
  await prisma.$transaction(async (tx) => {
    await tx.purchaseOrderLine.deleteMany({ where: { poId: id } });
    await tx.purchaseOrder.update({
      where: { id },
      data: {
        supplierId: v.supplierId,
        department: v.department,
        requiredDate: v.requiredDate,
        notes: v.notes,
        total: v.total,
        lines: { create: v.lines }
      }
    });
  });
  return get(id);
}

export async function remove(id) {
  const po = await load(id);
  if (po.status !== "Draft") throw conflict("PO_LOCKED", "Only a Draft PO can be deleted");
  const files = await prisma.$transaction(async (tx) => {
    const paths = await attachments.removeAllFor(tx, "PurchaseOrder", id);
    await tx.purchaseOrder.delete({ where: { id } }); // the lines go with it
    return paths;
  });
  await attachments.deleteStored(files);
}

// Draft -> Sent -> Received, one step forward. Received adds the stock once.
export async function changeStatus(id, body, user) {
  const po = await load(id);
  const target = body.status;
  if (!["Sent", "Received"].includes(target)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Validation failed", [{ path: ["status"], code: target ? "INVALID" : "REQUIRED" }]);
  }
  if (NEXT[po.status] !== target) throw conflict("INVALID_STATUS_CHANGE", `A ${po.status} PO cannot become ${target}`);

  if (target === "Sent") {
    await prisma.purchaseOrder.update({ where: { id }, data: { status: "Sent" } });
    return get(id);
  }

  // Received: a lot number for every line (decision D4)
  const issues = new Issues();
  const lots = Array.isArray(body.lots) ? body.lots : [];
  const lotOf = new Map();
  for (const line of po.lines) {
    const given = lots.find((l) => l?.lineId === line.id);
    const lotNumber = given ? str(given.lotNumber) : "";
    if (!lotNumber) issues.add(["lots", po.lines.indexOf(line), "lotNumber"], "REQUIRED");
    lotOf.set(line.id, lotNumber);
  }
  issues.throwIfAny();

  await prisma.$transaction(async (tx) => {
    // Guards against a second press at the same time
    const moved = await tx.purchaseOrder.updateMany({ where: { id, status: "Sent" }, data: { status: "Received", receivedAt: new Date() } });
    if (moved.count === 0) throw conflict("INVALID_STATUS_CHANGE", "The PO is received already");
    for (const line of po.lines) {
      const lotNumber = lotOf.get(line.id);
      await applyChange(tx, {
        materialId: line.materialId,
        lotNumber,
        kind: "Add",
        delta: Number(line.quantity),
        changeDate: today(),
        note: `Received ${po.poNumber}`,
        purchaseOrderId: po.id,
        userId: user.id,
        mayOpenLot: true
      });
      await tx.purchaseOrderLine.update({ where: { id: line.id }, data: { lotNumber } });
    }
  });
  return get(id);
}

export async function pay(id, body) {
  const po = await load(id);

  const issues = new Issues();
  const paymentDate = body.paymentDate ? parseDate(body.paymentDate) : null;
  if (!body.paymentDate) issues.add("paymentDate", "REQUIRED");
  else if (!paymentDate) issues.add("paymentDate", "INVALID_DATE");
  if (body.amount === undefined || body.amount === null || body.amount === "") issues.add("amount", "REQUIRED");
  else if (!isInt(body.amount)) issues.add("amount", "INVALID");
  else if (body.amount !== po.total) issues.add("amount", "MUST_EQUAL_TOTAL");
  if (!METHODS.includes(body.method)) issues.add("method", "REQUIRED");
  issues.throwIfAny();

  if (po.status !== "Received") throw conflict("PO_NOT_RECEIVED", "The PO is not received");
  if (po.payment) throw conflict("ALREADY_PAID", "The PO is paid already");

  await prisma.purchasePayment.create({
    data: { poId: id, paymentDate, amount: po.total, method: body.method, referenceNo: str(body.referenceNo), note: str(body.note) }
  });
  return get(id);
}
