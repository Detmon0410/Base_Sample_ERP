import { prisma } from "../lib/prisma.js";
import { Issues, conflict, notFound } from "../lib/errors.js";
import { containsFilter, isInt, isQty, meta, num, paging, str } from "../lib/util.js";
import { refuseIfInUse } from "../lib/inUse.js";

const include = { bom: { include: { material: true }, orderBy: { materialId: "asc" } } };

const view = (p) => ({
  id: p.id,
  code: p.code,
  name: p.name,
  price: p.price,
  bom: p.bom.map((b) => ({
    materialId: b.materialId,
    materialCode: b.material.code,
    materialName: b.material.name,
    quantity: num(b.quantity)
  }))
});

async function validate(body) {
  const issues = new Issues();
  const code = str(body.code);
  const name = str(body.name);
  if (!code) issues.add("code", "REQUIRED");
  if (!name) issues.add("name", "REQUIRED");

  const price = body.price === undefined || body.price === "" || body.price === null ? 0 : body.price;
  if (!isInt(price) || price < 0) issues.add("price", "INVALID");

  const bom = Array.isArray(body.bom) ? body.bom : [];
  const seen = new Set();
  bom.forEach((line, i) => {
    if (!isInt(line?.materialId)) return issues.add(["bom", i, "materialId"], "REQUIRED");
    if (seen.has(line.materialId)) issues.add(["bom", i, "materialId"], "DUPLICATE");
    seen.add(line.materialId);
    if (!isQty(line.quantity)) issues.add(["bom", i, "quantity"], "INVALID");
  });

  if (seen.size) {
    const found = await prisma.material.findMany({ where: { id: { in: [...seen] } }, select: { id: true } });
    const ids = new Set(found.map((m) => m.id));
    bom.forEach((line, i) => {
      if (isInt(line?.materialId) && !ids.has(line.materialId)) issues.add(["bom", i, "materialId"], "INVALID");
    });
  }
  issues.throwIfAny();
  return { code, name, price, bom: bom.map((l) => ({ materialId: l.materialId, quantity: Number(l.quantity) })) };
}

async function assertCodeFree(code, exceptId) {
  const found = await prisma.product.findUnique({ where: { code } });
  if (found && found.id !== exceptId) throw conflict("DUPLICATE_VALUE", "Code is used already", [{ path: ["code"], code: "DUPLICATE" }]);
}

export async function list(query) {
  const p = paging(query);
  const q = str(query.q);
  const where = q ? containsFilter(["code", "name"], q) : {};
  const [rows, total] = await Promise.all([
    prisma.product.findMany({ where, include, orderBy: { id: "desc" }, skip: p.skip, take: p.take }),
    prisma.product.count({ where })
  ]);
  return { data: rows.map(view), ...meta(p, total) };
}

export async function get(id) {
  const p = await prisma.product.findUnique({ where: { id }, include });
  if (!p) throw notFound("Product not found");
  return view(p);
}

export async function create(body) {
  const v = await validate(body);
  await assertCodeFree(v.code);
  const p = await prisma.product.create({
    data: { code: v.code, name: v.name, price: v.price, bom: { create: v.bom } },
    include
  });
  return view(p);
}

export async function update(id, body) {
  await get(id);
  const v = await validate(body);
  await assertCodeFree(v.code, id);
  const p = await prisma.$transaction(async (tx) => {
    await tx.productBom.deleteMany({ where: { productId: id } });
    return tx.product.update({
      where: { id },
      data: { code: v.code, name: v.name, price: v.price, bom: { create: v.bom } },
      include
    });
  });
  return view(p);
}

export async function remove(id) {
  await get(id);
  const lines = await prisma.orderLine.findMany({ where: { productId: id }, include: { order: true } });
  const qtLines = await prisma.qtLine.findMany({ where: { productId: id }, include: { qt: true } });
  // A product on a Draft QT is also in use (the QT line points to it)
  refuseIfInUse([
    { kind: "order", count: lines.length, items: lines.map((l) => l.order.orderNumber) },
    { kind: "qt", count: qtLines.length, items: qtLines.map((l) => l.qt.qtNumber) }
  ]);
  await prisma.product.delete({ where: { id } }); // the BOM goes with it
}
