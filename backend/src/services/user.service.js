import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma.js";
import { Issues, conflict, notFound } from "../lib/errors.js";
import { containsFilter, iso, meta, paging, str } from "../lib/util.js";
import { refuseIfInUse } from "../lib/inUse.js";

const DEPARTMENTS = ["Sales", "Factory", "Accounting", "Administration"];
const ROLES = ["Admin", "Worker"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const userView = (u) => ({
  id: u.id,
  name: u.name,
  department: u.department,
  email: u.email,
  role: u.role,
  createdAt: iso(u.createdAt),
  lastLoginAt: iso(u.lastLoginAt)
});

function validate(body, { creating }) {
  const issues = new Issues();
  const name = str(body.name);
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  if (!name) issues.add("name", "REQUIRED");
  if (!email) issues.add("email", "REQUIRED");
  else if (!EMAIL.test(email)) issues.add("email", "INVALID");
  if (!ROLES.includes(body.role)) issues.add("role", body.role ? "INVALID" : "REQUIRED");
  if (!DEPARTMENTS.includes(body.department)) issues.add("department", body.department ? "INVALID" : "REQUIRED");
  else if (body.role === "Worker" && !["Sales", "Factory"].includes(body.department)) issues.add("department", "INVALID");

  if (creating && !password) issues.add("password", "REQUIRED");
  else if (password && password.length < 6) issues.add("password", "TOO_SHORT");

  issues.throwIfAny();
  return { name, email, role: body.role, department: body.department, password };
}

async function assertEmailFree(email, exceptId) {
  const found = await prisma.user.findUnique({ where: { email } });
  if (found && found.id !== exceptId) throw conflict("DUPLICATE_VALUE", "Email is used already", [{ path: ["email"], code: "DUPLICATE" }]);
}

export async function list(query) {
  const p = paging(query);
  const q = str(query.q);
  const where = q ? containsFilter(["name", "email", "department"], q) : {};
  const [rows, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: { id: "desc" }, skip: p.skip, take: p.take }),
    prisma.user.count({ where })
  ]);
  return { data: rows.map(userView), ...meta(p, total) };
}

export async function get(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound("User not found");
  return userView(user);
}

export async function create(body) {
  const v = validate(body, { creating: true });
  await assertEmailFree(v.email);
  const user = await prisma.user.create({
    data: { name: v.name, email: v.email, role: v.role, department: v.department, passwordHash: await bcrypt.hash(v.password, 10) }
  });
  return userView(user);
}

export async function update(id, body) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw notFound("User not found");
  const v = validate(body, { creating: false });
  await assertEmailFree(v.email, id);

  const data = { name: v.name, email: v.email, role: v.role, department: v.department };
  if (v.password) {
    data.passwordHash = await bcrypt.hash(v.password, 10);
    data.tokenVersion = { increment: 1 }; // ends the sessions of this user
  }
  // The last Admin cannot lose the role
  if (existing.role === "Admin" && v.role !== "Admin") {
    const admins = await prisma.user.count({ where: { role: "Admin" } });
    if (admins <= 1) refuseIfInUse([{ kind: "lastAdmin", count: 1, items: [existing.email] }]);
  }
  return userView(await prisma.user.update({ where: { id }, data }));
}

export async function remove(id, currentUser) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound("User not found");

  const [progress, stock, admins] = await Promise.all([
    prisma.progressEntry.count({ where: { userId: id } }),
    prisma.stockChange.count({ where: { userId: id } }),
    user.role === "Admin" ? prisma.user.count({ where: { role: "Admin" } }) : Promise.resolve(2)
  ]);

  refuseIfInUse([
    { kind: "self", count: currentUser.id === id ? 1 : 0, items: [user.email] },
    { kind: "lastAdmin", count: admins <= 1 ? 1 : 0, items: [user.email] },
    { kind: "progress", count: progress, items: [] },
    { kind: "stock", count: stock, items: [] }
  ]);
  await prisma.user.delete({ where: { id } });
}
