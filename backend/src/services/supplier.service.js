import { prisma } from "../lib/prisma.js";
import { Issues, conflict, notFound } from "../lib/errors.js";
import { containsFilter, iso, isInt, meta, paging, str } from "../lib/util.js";
import { refuseIfInUse } from "../lib/inUse.js";

const include = { items: { include: { material: true }, orderBy: { materialId: "asc" } } };

const view = (s) => ({
  id: s.id,
  code: s.code,
  name: s.name,
  contact: s.contact,
  address: s.address,
  active: s.active,
  createdAt: iso(s.createdAt),
  updatedAt: iso(s.updatedAt),
  items: s.items.map((i) => ({
    materialId: i.materialId,
    materialCode: i.material.code,
    materialName: i.material.name,
    unit: i.material.unit,
    unitPrice: i.unitPrice
  }))
});

// A list row has the number of items, not the items (docs/api/purchase.md)
const listView = ({ items, ...row }) => ({ ...row, itemCount: items.length });

async function validate(body) {
  const issues = new Issues();
  const code = str(body.code);
  const name = str(body.name);
  if (!code) issues.add("code", "REQUIRED");
  if (!name) issues.add("name", "REQUIRED");
  // a checkbox sends true / false; the text "true" / "false" is accepted as well, like the mock of the frontend
  const active = body.active === undefined ? true : body.active === true || body.active === "true" ? true : body.active === false || body.active === "false" ? false : null;
  if (active === null) issues.add("active", "INVALID");

  const items = Array.isArray(body.items) ? body.items : [];
  const seen = new Set();
  let duplicate = false;
  items.forEach((it, i) => {
    if (!isInt(it?.materialId)) return issues.add(["items", i, "materialId"], "REQUIRED");
    if (seen.has(it.materialId)) duplicate = true;
    seen.add(it.materialId);
    if (!isInt(it.unitPrice) || it.unitPrice < 0) issues.add(["items", i, "unitPrice"], "INVALID");
  });
  if (seen.size) {
    const found = new Set((await prisma.material.findMany({ where: { id: { in: [...seen] } }, select: { id: true } })).map((m) => m.id));
    items.forEach((it, i) => {
      if (isInt(it?.materialId) && !found.has(it.materialId)) issues.add(["items", i, "materialId"], "REQUIRED");
    });
  }
  if (duplicate) issues.add("items", "DUPLICATE");
  issues.throwIfAny();
  return {
    code,
    name,
    contact: str(body.contact),
    address: str(body.address),
    active,
    items: items.map((it) => ({ materialId: it.materialId, unitPrice: it.unitPrice }))
  };
}

async function assertCodeFree(code, exceptId) {
  const found = await prisma.supplier.findUnique({ where: { code } });
  if (found && found.id !== exceptId) throw conflict("DUPLICATE_VALUE", "Code is used already", [{ path: ["code"], code: "DUPLICATE" }]);
}

export async function list(query) {
  const p = paging(query);
  const q = str(query.q);
  const where = q ? containsFilter(["code", "name", "contact"], q) : {};
  if (query.active === "true" || query.active === "false") where.active = query.active === "true";
  if (query.materialId && Number.isInteger(Number(query.materialId))) where.items = { some: { materialId: Number(query.materialId) } };
  const [rows, total] = await Promise.all([
    prisma.supplier.findMany({ where, include, orderBy: { id: "desc" }, skip: p.skip, take: p.take }),
    prisma.supplier.count({ where })
  ]);
  return { data: rows.map((r) => listView(view(r))), ...meta(p, total) };
}

export async function get(id) {
  const s = await prisma.supplier.findUnique({ where: { id }, include });
  if (!s) throw notFound("Supplier not found");
  return view(s);
}

export async function create(body) {
  const v = await validate(body);
  await assertCodeFree(v.code);
  const s = await prisma.supplier.create({
    data: { code: v.code, name: v.name, contact: v.contact, address: v.address, active: v.active, items: { create: v.items } },
    include
  });
  return view(s);
}

export async function update(id, body) {
  await get(id);
  const v = await validate(body);
  await assertCodeFree(v.code, id);
  const s = await prisma.$transaction(async (tx) => {
    await tx.supplierMaterial.deleteMany({ where: { supplierId: id } });
    return tx.supplier.update({
      where: { id },
      data: { code: v.code, name: v.name, contact: v.contact, address: v.address, active: v.active, items: { create: v.items } },
      include
    });
  });
  return view(s);
}

export async function remove(id) {
  await get(id);
  const pos = await prisma.purchaseOrder.findMany({ where: { supplierId: id }, select: { poNumber: true } });
  refuseIfInUse([{ kind: "purchaseOrder", count: pos.length, items: pos.map((p) => p.poNumber) }]);
  await prisma.supplier.delete({ where: { id } }); // its items go with it
}
