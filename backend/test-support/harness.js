import "./env.js";
import { once } from "node:events";
import bcrypt from "bcryptjs";

import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

export const PASSWORD = "secret1";
export const today = () => new Date().toISOString().slice(0, 10);
export const year = () => new Date().getUTCFullYear();
export const PDF = `data:application/pdf;base64,${Buffer.from("%PDF-1.4 test file").toString("base64")}`;
export const PNG = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]).toString("base64")}`;
export const TEXT = `data:text/plain;base64,${Buffer.from("hello").toString("base64")}`;

export { prisma };

// Empties every table (foreign keys off), so each test file starts from nothing
export async function resetDb() {
  const tables = await prisma.$queryRawUnsafe("SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name <> '_prisma_migrations'");
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    for (const { t } of tables) await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``);
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  });
}

const USERS = {
  admin: { name: "Admin", email: "admin@test.com", role: "Admin", department: "Administration" },
  factory: { name: "Factory Worker", email: "factory@test.com", role: "Worker", department: "Factory" },
  sales: { name: "Sale Worker", email: "sales@test.com", role: "Worker", department: "Sales" },
  // Old data: a Worker in a department that is neither Sales nor Factory
  accounting: { name: "Accounting Worker", email: "accounting@test.com", role: "Worker", department: "Accounting" }
};

function client(base, token) {
  const call = async (method, path, body) => {
    const res = await fetch(`${base}/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  return {
    token,
    get: (p) => call("GET", p),
    post: (p, b = {}) => call("POST", p, b),
    put: (p, b = {}) => call("PUT", p, b),
    delete: (p) => call("DELETE", p)
  };
}

// Starts the app on a free port, empties the database, makes one user per role and signs them in
export async function start() {
  await resetDb();
  const server = app.listen(0);
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;

  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const users = {};
  for (const [key, u] of Object.entries(USERS)) users[key] = await prisma.user.create({ data: { ...u, passwordHash } });

  const anon = client(base);
  const as = { anon };
  for (const [key, u] of Object.entries(USERS)) {
    const res = await anon.post("/auth/login", { email: u.email, password: PASSWORD });
    as[key] = client(base, res.body.data.token);
  }
  return {
    base,
    as,
    users,
    clientFor: (token) => client(base, token),
    async stop() {
      server.close();
      await prisma.$disconnect();
    }
  };
}

// ---- data made through the API (so the fixtures use the real rules) ----

export const must = (res, status = 200) => {
  if (res.status !== status) throw new Error(`Expected ${status}, got ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.data;
};

export async function makeCustomer(admin, name = "ACME") {
  return must(await admin.post("/customers", { name, address: "1 Main St", email: "a@acme.com", telephone: "03-1111" }), 201);
}

export async function makeMaterial(admin, code, lots = [{ lotNumber: "L1", quantity: 100 }], extra = {}) {
  return must(await admin.post("/materials", { code, name: `Material ${code}`, lots, ...extra }), 201);
}

export async function makeProduct(admin, code, bom = [], price = 1000) {
  return must(await admin.post("/products", { code, name: `Product ${code}`, price, bom }), 201);
}

// A confirmed QT and the production order it made, with one process per line
export async function makeOrder(admin, { product, customer, quantity = 10, unitPrice = 1000, processes = ["Cut", "Weld"], qtNumber } = {}) {
  const qt = must(
    await admin.post("/qt", {
      qtNumber: qtNumber || `QT-${Math.random().toString(36).slice(2, 8)}`,
      qtDate: today(),
      customerId: customer.id,
      lines: [{ productId: product.id, quantity, unitPrice }]
    }),
    201
  );
  const { order } = must(await admin.post(`/qt/${qt.id}/confirm`));
  must(
    await admin.put(`/orders/${order.id}`, {
      orderDate: today(),
      notes: "",
      lines: [{ productId: product.id, quantity, unitPrice, processes: processes.map((name) => ({ name, instructions: "" })) }]
    })
  );
  return { qt, order: must(await admin.get(`/orders/${order.id}`)) };
}

// Runs every process of the order to Completed (the order must be started)
export async function completeOrder(client, order) {
  for (const line of order.lines) {
    for (const p of line.processes) {
      must(await client.post(`/orders/${order.id}/progress`, { processId: p.id, status: "Completed", completedQuantity: line.quantity, workDate: today(), note: "" }));
    }
  }
  return must(await client.get(`/orders/${order.id}`));
}

export const codes = (res) => (res.body.errors || []).map((e) => `${e.path.join(".")}:${e.code}`);
