import { prisma } from "../lib/prisma.js";
import { Issues, notFound } from "../lib/errors.js";
import { containsFilter, meta, paging, str } from "../lib/util.js";
import { refuseIfInUse } from "../lib/inUse.js";

const view = (c) => ({ id: c.id, name: c.name, address: c.address, email: c.email, telephone: c.telephone });

function validate(body) {
  const issues = new Issues();
  const name = str(body.name);
  const email = str(body.email);
  if (!name) issues.add("name", "REQUIRED");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.add("email", "INVALID");
  issues.throwIfAny();
  return { name, address: str(body.address), email, telephone: str(body.telephone) };
}

export async function list(query) {
  const p = paging(query);
  const q = str(query.q);
  const where = q ? containsFilter(["name", "email", "telephone"], q) : {};
  const [rows, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { id: "desc" }, skip: p.skip, take: p.take }),
    prisma.customer.count({ where })
  ]);
  return { data: rows.map(view), ...meta(p, total) };
}

export async function get(id) {
  const c = await prisma.customer.findUnique({ where: { id } });
  if (!c) throw notFound("Customer not found");
  return view(c);
}

export const create = async (body) => view(await prisma.customer.create({ data: validate(body) }));

export async function update(id, body) {
  await get(id);
  return view(await prisma.customer.update({ where: { id }, data: validate(body) }));
}

export async function remove(id) {
  await get(id);
  const [qts, orders] = await Promise.all([
    prisma.qtReference.findMany({ where: { customerId: id }, select: { qtNumber: true } }),
    prisma.productionOrder.findMany({ where: { customerId: id }, select: { orderNumber: true } })
  ]);
  refuseIfInUse([
    { kind: "qt", count: qts.length, items: qts.map((x) => x.qtNumber) },
    { kind: "order", count: orders.length, items: orders.map((x) => x.orderNumber) }
  ]);
  await prisma.customer.delete({ where: { id } });
}
