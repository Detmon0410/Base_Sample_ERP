// Demo data that shows every feature of the Mini ERP (docs/api): all roles, QT Draft / Confirmed, orders in every state,
// invoices Unpaid / Paid with receipts, stock Normal / Low / Out / no level, purchase orders Draft / Sent / Received (paid and unpaid),
// suppliers (active and not), and files of every kind.
//
// The data is made through the real API (the app is started inside this script on a free port), so every business rule applies.
//   node prisma/seed-demo.js           only on an empty database
//   node prisma/seed-demo.js --fresh   first empties every table of the Mini ERP (and the uploaded files), then seeds
import "dotenv/config";
import { once } from "node:events";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";

import app from "../src/app.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";

// ---- helpers ----------------------------------------------------------------

const day = (offset) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const PDF = `data:application/pdf;base64,${Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF").toString("base64")}`;
// a 1x1 PNG
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const TABLES = [
  "Attachment", "PurchasePayment", "PurchaseOrderLine", "PurchaseOrder", "SupplierMaterial", "Supplier", "Receipt", "Payment", "InvoiceLine",
  "Invoice", "ProgressEntry", "OrderProcess", "OrderLine", "StockChange", "QtLine", "QtReference", "ProductionOrder", "MaterialLot",
  "ProductBom", "Material", "Product", "Customer", "User"
];

async function wipe() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
    for (const t of TABLES) await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``);
    await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  });
  const dir = resolve(env.uploadDir);
  if (dir.endsWith("uploads")) await rm(dir, { recursive: true, force: true });
}

let base;
function client(token) {
  const call = async (method, path, body) => {
    const res = await fetch(`${base}/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const json = await res.json();
    return { status: res.status, json };
  };
  // throws unless the call worked: a seed that half works is worse than one that stops
  const ok = async (method, path, body) => {
    const { status, json } = await call(method, path, body);
    if (!json.success) throw new Error(`${method} ${path} -> ${status} ${JSON.stringify(json)}`);
    return json.data;
  };
  return { get: (p) => ok("GET", p), post: (p, b = {}) => ok("POST", p, b), put: (p, b) => ok("PUT", p, b), raw: call };
}

async function login(email, password) {
  const { json } = await client().raw("POST", "/auth/login", { email, password });
  if (!json.success) throw new Error(`login ${email}: ${JSON.stringify(json)}`);
  return client(json.data.token);
}

// ---- the data ---------------------------------------------------------------

async function main() {
  const fresh = process.argv.includes("--fresh");
  if (fresh) await wipe();
  else if ((await prisma.customer.count()) + (await prisma.product.count()) + (await prisma.material.count()) > 0) {
    throw new Error("The database is not empty. Run with --fresh to empty the Mini ERP tables first.");
  }

  const server = app.listen(0);
  await once(server, "listening");
  process.once("exit", () => server.close());
  base = `http://127.0.0.1:${server.address().port}`;

  // ---- users: the three accounts of the docs, then more through the API
  const hash = (p) => bcrypt.hash(p, 10);
  for (const u of [
    { name: "Admin", email: "admin@gmail.com", password: "admin", role: "Admin", department: "Administration" },
    { name: "Factory Worker", email: "worker@gmail.com", password: "worker", role: "Worker", department: "Factory" },
    { name: "Sale Worker", email: "sale@gmail.com", password: "sale", role: "Worker", department: "Sales" }
  ]) {
    const { password, ...rest } = u;
    await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...rest, passwordHash: await hash(password) } });
  }
  const admin = await login("admin@gmail.com", "admin");
  const factory = await login("worker@gmail.com", "worker");
  const sales = await login("sale@gmail.com", "sale");

  for (const u of [
    { name: "Hana Sato", email: "hana@gmail.com", department: "Sales", role: "Worker" },
    { name: "Ken Ito", email: "ken@gmail.com", department: "Factory", role: "Worker" },
    { name: "Mika Mori", email: "mika@gmail.com", department: "Accounting", role: "Admin" }
  ]) await admin.post("/users", { ...u, password: "demo123" });
  const ken = await login("ken@gmail.com", "demo123");

  // ---- customers (the last one is not used by anything, so it can be deleted)
  const cust = {};
  for (const [key, c] of Object.entries({
    tokyo: { name: "Tokyo Precision Co.", address: "2-4-1 Marunouchi, Chiyoda-ku, Tokyo", email: "orders@tokyo-precision.example", telephone: "03-5555-0101" },
    osaka: { name: "Osaka Metalworks", address: "1-8-3 Umeda, Kita-ku, Osaka", email: "buy@osaka-metal.example", telephone: "06-6666-0202" },
    nagoya: { name: "Nagoya Auto Parts", address: "3-12-5 Sakae, Naka-ku, Nagoya", email: "", telephone: "052-777-0303" },
    yokohama: { name: "Yokohama Marine Supply", address: "5-1 Minatomirai, Nishi-ku, Yokohama", email: "supply@yokohama-marine.example", telephone: "" },
    sapporo: { name: "Sapporo Food Machinery", address: "Odori Nishi 4, Chuo-ku, Sapporo", email: "info@sapporo-fm.example", telephone: "011-888-0404" },
    spare: { name: "Spare Customer (unused)", address: "", email: "", telephone: "" }
  })) cust[key] = await admin.post("/customers", c);

  // ---- materials: statuses are set below by the stock; some have no minimum level
  const mat = {};
  for (const [key, m] of Object.entries({
    steel: { code: "STEEL-001", name: "Steel plate 3 mm", unit: "sheet", minLevel: 50, lots: [{ lotNumber: "ST-2608-A", quantity: 120 }, { lotNumber: "ST-2609-B", quantity: 80 }] },
    alu: { code: "ALU-002", name: "Aluminium bar 20 mm", unit: "m", minLevel: 100, lots: [{ lotNumber: "AL-2608-A", quantity: 100 }] },
    bolt: { code: "BOLT-M8", name: "Bolt M8 x 30", unit: "pcs", minLevel: 300, lots: [{ lotNumber: "BL-2608-A", quantity: 1000 }] },
    paint: { code: "PAINT-RED", name: "Paint, red", unit: "litre", lots: [{ lotNumber: "PT-2607-A", quantity: 40 }] },
    weld: { code: "WELD-ROD", name: "Welding rod 2.6 mm", unit: "kg", minLevel: 20, lots: [{ lotNumber: "WR-2608-A", quantity: 35 }] },
    gasket: { code: "GASKET-10", name: "Gasket 10 mm", unit: "pcs", minLevel: 200, lots: [{ lotNumber: "GK-2608-A", quantity: 150 }] },
    rubber: { code: "RUBBER-SHEET", name: "Rubber sheet (unused)", unit: "sheet", minLevel: 10, lots: [{ lotNumber: "RB-2606-A", quantity: 25 }] }
  })) mat[key] = await admin.post("/materials", m);

  // ---- products with a BOM
  const prod = {};
  for (const [key, p] of Object.entries({
    frame: { code: "FRM-100", name: "Steel frame", price: 45000, bom: [["steel", 2], ["bolt", 8], ["weld", 0.5]] },
    bracket: { code: "BRK-200", name: "Mounting bracket", price: 9000, bom: [["alu", 1.5], ["bolt", 4]] },
    panel: { code: "PNL-300", name: "Control panel housing", price: 68000, bom: [["steel", 3], ["paint", 0.8], ["gasket", 6]] },
    shaft: { code: "SHF-400", name: "Drive shaft", price: 32500, bom: [["alu", 4], ["weld", 0.2]] },
    kit: { code: "ACC-500", name: "Accessory kit (no BOM)", price: 1200, bom: [] },
    spare: { code: "SPR-900", name: "Spare product (unused)", price: 500, bom: [] }
  })) prod[key] = await admin.post("/products", { code: p.code, name: p.name, price: p.price, bom: p.bom.map(([m, quantity]) => ({ materialId: mat[m].id, quantity })) });

  // ---- suppliers (SUP-004 is inactive and has no PO, so it can be deleted)
  const sup = {};
  for (const [key, s] of Object.entries({
    kansai: { code: "SUP-001", name: "Kansai Steel Trading", contact: "Mr. Hayashi 06-1111-2001", address: "Sakai, Osaka", active: true, items: [["steel", 1800], ["weld", 950]] },
    nippon: { code: "SUP-002", name: "Nippon Fasteners", contact: "Ms. Kudo 03-2222-2002", address: "Ota-ku, Tokyo", active: true, items: [["bolt", 12], ["gasket", 45]] },
    alu: { code: "SUP-003", name: "Alu Works Osaka", contact: "Mr. Mori 06-3333-2003", address: "Higashiosaka", active: true, items: [["alu", 2400]] },
    paint: { code: "SUP-004", name: "Old Paint Supplier (inactive)", contact: "", address: "", active: false, items: [["paint", 3200]] }
  })) sup[key] = await admin.post("/suppliers", { code: s.code, name: s.name, contact: s.contact, address: s.address, active: s.active, items: s.items.map(([m, unitPrice]) => ({ materialId: mat[m].id, unitPrice })) });

  // ---- purchase orders: Draft, Sent, Received + paid, Received + not paid
  const poBody = (supplier, lines, over = {}) => ({ supplierId: sup[supplier].id, requiredDate: day(7), department: "Factory", notes: "", lines: lines.map(([m, quantity, unitPrice]) => ({ materialId: mat[m].id, quantity, ...(unitPrice ? { unitPrice } : {}) })), ...over });
  const file = (c, ownerType, ownerId, kind, name, dataUrl = PDF) => c.post("/attachments", { ownerType, ownerId, kind, file: { name, dataUrl } });
  const receive = async (c, po, prefix) => c.post(`/purchase-orders/${po.id}/status`, { status: "Received", lots: po.lines.map((l) => ({ lineId: l.id, lotNumber: `${prefix}-${l.materialCode.split("-")[0]}` })) });

  await factory.post("/purchase-orders", poBody("kansai", [["steel", 100], ["weld", 20]], { notes: "Not sent yet: check the price first", requiredDate: day(14) })); // Draft

  const poSent = await factory.post("/purchase-orders", poBody("nippon", [["bolt", 1000], ["gasket", 300]], { notes: "Bolts are out of stock", requiredDate: day(5) }));
  await file(factory, "PurchaseOrder", poSent.id, "PO_FILE", "PO-bolts-printed.pdf");
  await factory.post(`/purchase-orders/${poSent.id}/status`, { status: "Sent" });

  const poPaid = await factory.post("/purchase-orders", poBody("alu", [["alu", 80, 2300]], { requiredDate: day(-20), notes: "Negotiated price 2,300" }));
  await file(admin, "PurchaseOrder", poPaid.id, "QUOTATION", "alu-works-quotation.pdf");
  await factory.post(`/purchase-orders/${poPaid.id}/status`, { status: "Sent" });
  await receive(factory, poPaid, "AL-2610");
  await admin.post(`/purchase-orders/${poPaid.id}/payment`, { paymentDate: day(-10), amount: poPaid.total, method: "Bank transfer", referenceNo: "TT-20261006-01", note: "Paid in full" });

  const poUnpaid = await ken.post("/purchase-orders", poBody("kansai", [["steel", 50]], { requiredDate: day(-8) }));
  await ken.post(`/purchase-orders/${poUnpaid.id}/status`, { status: "Sent" });
  await receive(ken, poUnpaid, "ST-2610");

  // ---- sales: QT -> Confirm -> order -> start -> progress -> invoice -> payment
  const processesOf = { frame: ["Cutting", "Welding", "Painting"], bracket: ["Cutting", "Drilling"], panel: ["Cutting", "Assembly", "Painting"], shaft: ["Turning", "Grinding"], kit: ["Packing"] };

  async function sale({ qtNumber, customer, qtDate, lines, notes = "", poNumber = "", poFile = false, confirm = true, orderDate }) {
    const qt = await sales.post("/qt", {
      qtNumber, qtDate, customerId: cust[customer].id, notes, customerPoNumber: poNumber, customerPoDate: poNumber ? qtDate : "",
      lines: lines.map(([p, quantity, unitPrice]) => ({ productId: prod[p].id, quantity, unitPrice: unitPrice ?? prodPrice[p] }))
    });
    if (poFile) await file(sales, "QtReference", qt.id, "PO_FILE", `${poNumber || qtNumber}-customer-po.pdf`);
    if (!confirm) return { qt };
    const { order } = await sales.post(`/qt/${qt.id}/confirm`);
    const prepared = await sales.put(`/orders/${order.id}`, {
      orderDate: orderDate ?? qtDate,
      notes: "",
      lines: lines.map(([p, quantity, unitPrice]) => ({ productId: prod[p].id, quantity, unitPrice: unitPrice ?? prodPrice[p], processes: processesOf[p].map((name) => ({ name, instructions: `${name} as per drawing` })) }))
    });
    return { qt, order: prepared };
  }
  const prodPrice = Object.fromEntries(Object.entries(prod).map(([k, p]) => [k, p.price]));

  const start = (c, order) => c.post(`/orders/${order.id}/start`);
  // a process is found by its name inside one line of the order (two lines may both have a "Cutting")
  const progress = async (c, order, name, status, completedQuantity, workDate, note = "", lineIndex = 0) => {
    const fresh = await c.get(`/orders/${order.id}`);
    const p = fresh.lines[lineIndex].processes.find((x) => x.name === name);
    if (!p) throw new Error(`no process ${name} on line ${lineIndex}`);
    return c.post(`/orders/${order.id}/progress`, { processId: p.id, status, completedQuantity, workDate, note });
  };
  // every process of the order: partly done first, then Completed
  async function finish(c, order, startDay) {
    let d = startDay;
    const fresh = await c.get(`/orders/${order.id}`);
    for (const [i, line] of fresh.lines.entries()) {
      for (const p of line.processes) {
        await progress(c, order, p.name, "In Progress", Math.ceil(line.quantity / 2), day(d), "Half done", i);
        d += 1;
        await progress(c, order, p.name, "Completed", line.quantity, day(d), "", i);
        d += 1;
      }
    }
  }

  // 1. Completed, invoiced and paid, with a receipt and evidence files
  const o1 = await sale({ qtNumber: "QT-2610-001", customer: "tokyo", qtDate: day(-45), poNumber: "TP-88231", poFile: true, notes: "Frames and brackets for line 3", lines: [["frame", 10], ["bracket", 20, 8500]] });
  await start(factory, o1.order);
  await finish(factory, o1.order, -40);
  await file(factory, "ProductionOrder", o1.order.id, "EVIDENCE", "weld-inspection.png", PNG);
  await file(ken, "ProductionOrder", o1.order.id, "EVIDENCE", "final-check.pdf");
  const inv1 = await admin.post("/invoices", { orderId: o1.order.id, invoiceDate: day(-30) });
  await admin.post(`/invoices/${inv1.id}/payment`, { paymentDate: day(-3), amount: inv1.total });

  // 2. In Progress: one process done, one partly done, one not started
  const o2 = await sale({ qtNumber: "QT-2610-002", customer: "osaka", qtDate: day(-25), poNumber: "OM-5521", poFile: true, lines: [["panel", 5]] });
  await start(factory, o2.order);
  await progress(factory, o2.order, "Cutting", "In Progress", 2, day(-20), "First batch");
  await progress(factory, o2.order, "Cutting", "Completed", 5, day(-19));
  await progress(ken, o2.order, "Assembly", "In Progress", 3, day(-15), "Waiting for gaskets");
  await file(factory, "ProductionOrder", o2.order.id, "EVIDENCE", "assembly-photo.png", PNG);

  // 3. Completed and invoiced, not paid yet
  const o3 = await sale({ qtNumber: "QT-2610-003", customer: "nagoya", qtDate: day(-30), poNumber: "NA-3310", poFile: true, notes: "Rush order", lines: [["shaft", 8]] });
  await file(sales, "QtReference", o3.qt.id, "OTHER", "drawing-rev-C.pdf");
  await start(factory, o3.order);
  await finish(factory, o3.order, -24);
  await admin.post("/invoices", { orderId: o3.order.id, invoiceDate: day(-12) });

  // 4. Draft: processes ready, not started, and the QT had no PO file (a warning at Confirm)
  await sale({ qtNumber: "QT-2610-004", customer: "yokohama", qtDate: day(-6), lines: [["kit", 50]], notes: "PO to follow by mail" });

  // 5. Draft that cannot start: the stock is short (STOCK_SHORT)
  await sale({ qtNumber: "QT-2610-005", customer: "tokyo", qtDate: day(-3), poNumber: "TP-88502", poFile: true, notes: "Needs a purchase of steel first", lines: [["frame", 200]] });

  // 6. Started, no progress yet ("Production started" but still Draft)
  const o6 = await sale({ qtNumber: "QT-2610-006", customer: "osaka", qtDate: day(-9), poNumber: "OM-5590", poFile: true, lines: [["bracket", 10]] });
  await start(factory, o6.order);

  // 7. QT Draft with lines and a quotation file; 8. QT Draft with no lines
  const q7 = await sale({ qtNumber: "QT-2610-007", customer: "sapporo", qtDate: day(-2), confirm: false, notes: "Sent to the customer, waiting for the PO", lines: [["panel", 1], ["shaft", 2, 31000]] });
  await file(sales, "QtReference", q7.qt.id, "QUOTATION", "QT-2610-007-form.pdf");
  await sale({ qtNumber: "QT-2610-008", customer: "nagoya", qtDate: day(-1), confirm: false, notes: "Waiting for drawings", lines: [] });

  // 9. Completed, ready to be invoiced (no invoice yet)
  const o9 = await sale({ qtNumber: "QT-2610-009", customer: "yokohama", qtDate: day(-18), poNumber: "YM-0077", poFile: true, lines: [["panel", 2, 66000]] });
  await start(factory, o9.order);
  await finish(factory, o9.order, -14);

  // 10. An older sale paid in a previous month
  const o10 = await sale({ qtNumber: "QT-2610-010", customer: "sapporo", qtDate: day(-60), poNumber: "SF-1200", poFile: true, lines: [["kit", 100, 1100]] });
  await start(factory, o10.order);
  await finish(factory, o10.order, -55);
  const inv10 = await admin.post("/invoices", { orderId: o10.order.id, invoiceDate: day(-50) });
  await admin.post(`/invoices/${inv10.id}/payment`, { paymentDate: day(-40), amount: inv10.total });

  // ---- stock changes by hand: Add, Deduct (linked to an order), Adjust
  const lotOf = async (key) => (await admin.get(`/materials/${mat[key].id}`)).lots;
  await factory.post(`/materials/${mat.weld.id}/stock-changes`, { kind: "Add", lotNumber: "WR-2610-B", quantity: 10, changeDate: day(-4), note: "Delivery from Kansai Steel" });
  await factory.post(`/materials/${mat.paint.id}/stock-changes`, { kind: "Deduct", lotNumber: "PT-2607-A", quantity: 2, changeDate: day(-8), note: "Touch-up after inspection", orderId: o2.order.id });
  await admin.post(`/materials/${mat.gasket.id}/stock-changes`, { kind: "Adjust", lotNumber: "GK-2608-A", quantity: 3, changeDate: day(-5), note: "Stock count: 3 pieces found" });
  // the bolts: counted and found recalled, so none is left (status Out) and a purchase is on the way
  const boltLot = (await lotOf("bolt"))[0];
  await admin.post(`/materials/${mat.bolt.id}/stock-changes`, { kind: "Adjust", lotNumber: boltLot.lotNumber, quantity: -boltLot.quantity, changeDate: day(-1), note: "Stock count: lot recalled by the supplier" });

  // ---- report
  const materials = (await admin.get("/materials?pageSize=100")).map((m) => `${m.code}: ${m.total} ${m.unit} (${m.stockStatus ?? "no level"})`);
  const orders = (await admin.get("/orders?pageSize=100")).map((o) => `${o.orderNumber} ${o.qtNumber}: ${o.status}${o.started ? "" : ", not started"}${o.invoice ? `, ${o.invoice.invoiceNumber} ${o.invoice.status}` : ""}`);
  const dash = await admin.get("/dashboard");
  console.log("\nMaterials\n  " + materials.join("\n  "));
  console.log("\nOrders\n  " + orders.join("\n  "));
  console.log("\nDashboard", JSON.stringify(dash));
  console.log("\nSign in: admin@gmail.com / admin, worker@gmail.com / worker (Factory), sale@gmail.com / sale (Sales),\n         hana@gmail.com (Sales), ken@gmail.com (Factory), mika@gmail.com (Admin, Accounting): password demo123");

  return server;
}

let server;
main()
  .then((s) => {
    server = s;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    server?.close();
    await prisma.$disconnect();
    process.exit();
  });
