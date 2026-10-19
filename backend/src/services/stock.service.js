import { prisma } from "../lib/prisma.js";
import { ApiError, Issues, conflict, notFound } from "../lib/errors.js";
import { containsFilter, iso, isInt, isQty, meta, num, paging, parseDate, str, today, ymd } from "../lib/util.js";
import { refuseIfInUse } from "../lib/inUse.js";

const KINDS = ["Add", "Deduct", "Adjust"];
const r3 = (n) => Math.round(n * 1000) / 1000;
const materialInclude = { lots: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } };

// One rule for the status (docs/api/stock.md)
export function stockStatus(total, minLevel) {
  if (minLevel === null || minLevel === undefined) return null;
  if (total === 0) return "Out";
  return total <= minLevel ? "Low" : "Normal";
}

export function materialView(m) {
  const lots = m.lots.map((l) => ({ lotNumber: l.lotNumber, quantity: num(l.quantity) }));
  const total = r3(lots.reduce((s, l) => s + l.quantity, 0));
  const minLevel = num(m.minLevel);
  return { id: m.id, code: m.code, name: m.name, unit: m.unit, minLevel, lots, total, stockStatus: stockStatus(total, minLevel) };
}

const changeView = (c) => ({
  id: c.id,
  materialId: c.materialId,
  materialCode: c.material.code,
  materialName: c.material.name,
  lotNumber: c.lotNumber,
  kind: c.kind,
  change: num(c.change),
  balance: num(c.balance),
  changeDate: ymd(c.changeDate),
  note: c.note,
  initial: c.initial,
  orderId: c.orderId,
  orderNumber: c.order?.orderNumber ?? null,
  purchaseOrderId: c.purchaseOrderId,
  purchaseOrderNumber: c.purchaseOrder?.poNumber ?? null,
  userId: c.userId,
  userName: c.user.name,
  at: iso(c.at)
});
const changeInclude = { material: true, order: true, purchaseOrder: true, user: true };

function parseMinLevel(value, issues) {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || r3(n) !== n) {
    issues.add("minLevel", "INVALID");
    return null;
  }
  return n;
}

async function validateMaterial(body, { creating }) {
  const issues = new Issues();
  const code = str(body.code);
  const name = str(body.name);
  if (!code) issues.add("code", "REQUIRED");
  if (!name) issues.add("name", "REQUIRED");
  const minLevel = parseMinLevel(body.minLevel, issues);
  const unit = body.unit === undefined || body.unit === null || str(body.unit) === "" ? "pcs" : str(body.unit);
  if (unit.length > 20) issues.add("unit", "INVALID");

  const lots = [];
  if (creating && Array.isArray(body.lots)) {
    const seen = new Set();
    body.lots.forEach((lot, i) => {
      const lotNumber = str(lot?.lotNumber);
      if (!lotNumber) issues.add(["lots", i, "lotNumber"], "REQUIRED");
      else if (seen.has(lotNumber.toLowerCase())) issues.add(["lots", i, "lotNumber"], "DUPLICATE");
      seen.add(lotNumber.toLowerCase());
      // A blank quantity is not 0: Number("") would make it so
      const qty = typeof lot?.quantity === "string" ? (lot.quantity.trim() === "" ? NaN : Number(lot.quantity)) : lot?.quantity;
      if (!isQty(qty, { min: 0, allowMin: true })) issues.add(["lots", i, "quantity"], "INVALID");
      lots.push({ lotNumber, quantity: Number(qty) });
    });
  }
  issues.throwIfAny();
  return { code, name, unit, minLevel, lots };
}

async function assertCodeFree(code, exceptId) {
  const found = await prisma.material.findUnique({ where: { code } });
  if (found && found.id !== exceptId) throw conflict("DUPLICATE_VALUE", "Code is used already", [{ path: ["code"], code: "DUPLICATE" }]);
}

export async function list(query) {
  const p = paging(query);
  const q = str(query.q);
  const status = str(query.status);
  const where = q ? containsFilter(["code", "name"], q) : {};

  if (status) {
    if (!["Normal", "Low", "Out"].includes(status)) throw new ApiError(400, "VALIDATION_ERROR", "Validation failed", [{ path: ["status"], code: "INVALID" }]);
    // The status is computed, so it is filtered after the lots are summed
    const all = (await prisma.material.findMany({ where, include: materialInclude, orderBy: { id: "desc" } })).map(materialView);
    const rows = all.filter((m) => m.stockStatus === status);
    return { data: rows.slice(p.skip, p.skip + p.take), ...meta(p, rows.length) };
  }

  const [rows, total] = await Promise.all([
    prisma.material.findMany({ where, include: materialInclude, orderBy: { id: "desc" }, skip: p.skip, take: p.take }),
    prisma.material.count({ where })
  ]);
  return { data: rows.map(materialView), ...meta(p, total) };
}

export async function get(id) {
  const m = await prisma.material.findUnique({ where: { id }, include: materialInclude });
  if (!m) throw notFound("Material not found");
  return materialView(m);
}

export async function create(body, user) {
  const v = await validateMaterial(body, { creating: true });
  await assertCodeFree(v.code);
  const id = await prisma.$transaction(async (tx) => {
    const m = await tx.material.create({ data: { code: v.code, name: v.name, unit: v.unit, minLevel: v.minLevel } });
    for (const lot of v.lots) {
      await tx.materialLot.create({ data: { materialId: m.id, lotNumber: lot.lotNumber, quantity: lot.quantity } });
      await tx.stockChange.create({
        data: {
          materialId: m.id,
          lotNumber: lot.lotNumber,
          kind: "Add",
          change: lot.quantity,
          balance: lot.quantity,
          changeDate: today(),
          note: "Initial stock",
          initial: true,
          userId: user.id
        }
      });
    }
    return m.id;
  });
  return get(id);
}

export async function update(id, body) {
  await get(id);
  const v = await validateMaterial(body, { creating: false }); // lots are ignored on PUT
  await assertCodeFree(v.code, id);
  await prisma.material.update({ where: { id }, data: { code: v.code, name: v.name, unit: v.unit, minLevel: v.minLevel } });
  return get(id);
}

export async function remove(id) {
  await get(id);
  const [products, changes, suppliers, poLines] = await Promise.all([
    prisma.productBom.findMany({ where: { materialId: id }, include: { product: true } }),
    prisma.stockChange.count({ where: { materialId: id, initial: false } }),
    prisma.supplierMaterial.findMany({ where: { materialId: id }, include: { supplier: true } }),
    prisma.purchaseOrderLine.findMany({ where: { materialId: id }, include: { po: true } })
  ]);
  refuseIfInUse([
    { kind: "product", count: products.length, items: products.map((b) => b.product.code) },
    { kind: "supplier", count: suppliers.length, items: suppliers.map((x) => x.supplier.code) },
    { kind: "purchaseOrder", count: poLines.length, items: poLines.map((x) => x.po.poNumber) },
    { kind: "stockChange", count: changes, items: [] }
  ]);
  await prisma.material.delete({ where: { id } }); // lots and the initial stock go with it
}

// Moves one lot inside a transaction and writes the history entry.
export async function applyChange(tx, { materialId, lotNumber, kind, delta, changeDate, note, orderId = null, purchaseOrderId = null, userId, mayOpenLot = false }) {
  let lot = await tx.materialLot.findFirst({ where: { materialId, lotNumber } });
  if (!lot) {
    if (!mayOpenLot) throw conflict("LOT_NOT_FOUND", "Lot not found", [{ path: ["lotNumber"], code: "LOT_NOT_FOUND" }]);
    lot = await tx.materialLot.create({ data: { materialId, lotNumber, quantity: 0 } });
  }
  const balance = r3(Number(lot.quantity) + delta);
  if (balance < 0) throw conflict("STOCK_NEGATIVE", "The lot cannot go below zero", [{ path: ["quantity"], code: "STOCK_NEGATIVE" }]);
  await tx.materialLot.update({ where: { id: lot.id }, data: { quantity: balance } });
  return tx.stockChange.create({
    data: { materialId, lotNumber: lot.lotNumber, kind, change: delta, balance, changeDate, note, orderId, purchaseOrderId, userId }
  });
}

export async function addStockChange(materialId, body, user) {
  await get(materialId);
  const issues = new Issues();
  const kind = body.kind;
  if (!KINDS.includes(kind)) issues.add("kind", kind ? "INVALID" : "REQUIRED");
  const lotNumber = str(body.lotNumber);
  if (!lotNumber) issues.add("lotNumber", "REQUIRED");

  const qty = typeof body.quantity === "string" ? Number(body.quantity) : body.quantity;
  let delta = 0;
  if (typeof qty !== "number" || !Number.isFinite(qty) || r3(qty) !== qty || qty === 0) issues.add("quantity", body.quantity === undefined || body.quantity === "" ? "REQUIRED" : "INVALID");
  else if (kind === "Adjust") delta = qty;
  else if (qty < 0) issues.add("quantity", "INVALID");
  else delta = kind === "Deduct" ? -qty : qty;

  let changeDate = null;
  if (!body.changeDate) issues.add("changeDate", "REQUIRED");
  else if (!(changeDate = parseDate(body.changeDate))) issues.add("changeDate", "INVALID_DATE");

  const note = str(body.note);
  if (kind === "Adjust" && !note) issues.add("note", "REQUIRED");

  let orderId = null;
  if (kind === "Deduct" && body.orderId !== undefined && body.orderId !== null && body.orderId !== "") {
    if (!isInt(body.orderId) || !(await prisma.productionOrder.findUnique({ where: { id: body.orderId } }))) issues.add("orderId", "INVALID");
    else orderId = body.orderId;
  }
  issues.throwIfAny();

  await prisma.$transaction((tx) =>
    applyChange(tx, { materialId, lotNumber, kind, delta, changeDate, note, orderId, userId: user.id, mayOpenLot: kind === "Add" })
  );
  return get(materialId);
}

export async function history(materialId) {
  await get(materialId);
  const rows = await prisma.stockChange.findMany({
    where: { materialId },
    include: changeInclude,
    orderBy: [{ changeDate: "desc" }, { id: "desc" }]
  });
  return rows.map(changeView);
}

export async function movements(query) {
  const p = paging(query);
  const issues = new Issues();
  const where = {};
  const q = str(query.q);
  const type = str(query.type);
  if (type) {
    if (KINDS.includes(type)) where.kind = type;
    else issues.add("type", "INVALID");
  }
  const range = {};
  for (const key of ["from", "to"]) {
    if (!query[key]) continue;
    const d = parseDate(String(query[key]));
    if (d) range[key === "from" ? "gte" : "lte"] = d;
    else issues.add(key, "INVALID_DATE");
  }
  issues.throwIfAny();
  if (range.gte || range.lte) where.changeDate = range;
  if (q) {
    where.OR = [
      { material: { code: { contains: q } } },
      { material: { name: { contains: q } } },
      { lotNumber: { contains: q } },
      { order: { orderNumber: { contains: q } } },
      { purchaseOrder: { poNumber: { contains: q } } },
      { note: { contains: q } }
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.stockChange.findMany({ where, include: changeInclude, orderBy: [{ changeDate: "desc" }, { id: "desc" }], skip: p.skip, take: p.take }),
    prisma.stockChange.count({ where })
  ]);
  return { data: rows.map(changeView), ...meta(p, total) };
}

// Start of a production order: adds up the BOM of its lines and deducts, oldest lot first.
export async function deductForOrder(tx, order, userId) {
  const need = new Map();
  for (const line of order.lines) {
    const product = await tx.product.findUnique({ where: { id: line.productId }, include: { bom: true } });
    for (const b of product.bom) need.set(b.materialId, r3((need.get(b.materialId) || 0) + Number(b.quantity) * line.quantity));
  }

  const plans = [];
  const short = [];
  for (const [materialId, amount] of need) {
    const material = await tx.material.findUnique({
      where: { id: materialId },
      include: { lots: { where: { quantity: { gt: 0 } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] } }
    });
    const have = r3(material.lots.reduce((s, l) => s + Number(l.quantity), 0));
    if (have < amount) short.push({ materialId, materialCode: material.code, materialName: material.name, need: amount, have });
    else plans.push({ material, amount });
  }
  if (short.length) throw conflict("STOCK_SHORT", "Not enough stock", short);

  for (const { material, amount } of plans) {
    let left = amount;
    for (const lot of material.lots) {
      if (left <= 0) break;
      const take = Math.min(left, Number(lot.quantity));
      await applyChange(tx, {
        materialId: material.id,
        lotNumber: lot.lotNumber,
        kind: "Deduct",
        delta: -take,
        changeDate: today(),
        note: "Production started",
        orderId: order.id,
        userId
      });
      left = r3(left - take);
    }
  }
}
