// Demo data for GET /dashboard (VITE_USE_MOCK=true). Shape = docs/api/dashboard.md.
// Testing helper: set localStorage "kanou.mockFail" to a comma list of block names
// (e.g. "stockAlerts,production") to see a block-level error, or "all" for a failed request.

import { MockHttpError } from "./errors.js";
import { stockStatusOf } from "./stock.js";

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString();
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const APPROVALS = [
  { type: "SO", id: 31, number: "SO-0031", party: "ABC Appliance Store", amountJpy: 7000000, createdAt: minutesAgo(50), department: "Sale" },
  { type: "QT", id: 19, number: "QT-0019", party: "Best Home Mart", amountJpy: 1240000, createdAt: minutesAgo(190), department: "Sale" },
  { type: "PO", id: 18, number: "PO-0018", party: "CompCo", amountJpy: 2250000, createdAt: minutesAgo(320), department: "Purchase" },
  { type: "WO", id: 7, number: "WO-0007", party: "RF-2D x 10", amountJpy: null, createdAt: minutesAgo(480), department: "Factory" },
  { type: "INVOICE", id: 42, number: "INV-0042", party: "ABC Appliance Store", amountJpy: 3500000, createdAt: minutesAgo(900), department: "Accounting" },
];

const MY_RECENT = [
  { type: "WO", id: 6, number: "WO-0006", status: "Draft", at: minutesAgo(35) },
  { type: "WO", id: 5, number: "WO-0005", status: "In Process", at: minutesAgo(260) },
  { type: "PO", id: 17, number: "PO-0017", status: "Approved", at: minutesAgo(1500) },
];

const STOCK_ALERTS = [
  { materialId: 1, code: "COMP", name: "Compressor", qtyOnHand: 40, reorderPoint: 50, uom: "pcs", status: "SHORTAGE" },
  { materialId: 3, code: "FOAM", name: "Insulation Foam", qtyOnHand: 70, reorderPoint: 80, uom: "kg", status: "SHORTAGE" },
  { materialId: 4, code: "STEEL", name: "Steel Sheet", qtyOnHand: 520, reorderPoint: 500, uom: "kg", status: "NEAR_SHORTAGE" },
  { materialId: 2, code: "DOOR", name: "Door Panel", qtyOnHand: 110, reorderPoint: 100, uom: "pcs", status: "NEAR_SHORTAGE" },
];

const PRODUCTION = [
  { woId: 4, number: "WO-0004", product: "RF-1D", qty: 20, stepsDone: 3, stepsTotal: 4, planFinish: daysFromNow(-2), late: true },
  { woId: 5, number: "WO-0005", product: "RF-2D", qty: 10, stepsDone: 2, stepsTotal: 4, planFinish: daysFromNow(3), late: false },
  { woId: 6, number: "WO-0006", product: "RF-2D", qty: 15, stepsDone: 1, stepsTotal: 4, planFinish: daysFromNow(6), late: false },
];

const ACTIVITY = [
  { at: minutesAgo(12), type: "INVOICE", number: "INV-0041", action: "Issued", user: "Alice Sato" },
  { at: minutesAgo(35), type: "WO", number: "WO-0006", action: "Created", user: "Bob Tanaka" },
  { at: minutesAgo(50), type: "SO", number: "SO-0031", action: "Created", user: "Alice Sato" },
  { at: minutesAgo(140), type: "DN", number: "DN-0022", action: "Delivered", user: "Alice Sato" },
  { at: minutesAgo(260), type: "WO", number: "WO-0005", action: "Production started", user: "Bob Tanaka" },
  { at: minutesAgo(320), type: "PO", number: "PO-0018", action: "Created", user: "Alice Sato" },
  { at: minutesAgo(700), type: "GR", number: "GR-0009", action: "Goods received", user: "Alice Sato" },
  { at: minutesAgo(1500), type: "QT", number: "QT-0018", action: "Sent to customer", user: "Alice Sato" },
];

function failedBlocks() {
  try {
    return (window.localStorage.getItem("kanou.mockFail") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/** Approvals follow the rules in user_account_req.md: Admin all, Manager own departments, Worker none. */
function approvalsFor(user, source = APPROVALS) {
  const isAdmin = user.memberships.some((m) => m.role === "Admin");
  if (isAdmin) return source;
  const managerDepartments = user.memberships.filter((m) => m.role === "Manager").map((m) => m.department);
  if (managerDepartments.length === 0) return null; // not applicable for Workers
  return source.filter((a) => managerDepartments.includes(a.department));
}

// Demo only: a few numbers move every 15 s so the live updates of the page can be seen.
function withLiveDrift(blocks, { stockIsReal = false } = {}) {
  const tick = Math.floor(Date.now() / 15000);
  const { kpis } = blocks;
  kpis.openSaleOrders = { count: 12 + (tick % 4), readyToDeliver: 3 + (tick % 2) };
  kpis.overdueInvoices = { count: 2, amountJpy: 1850000 + (tick % 5) * 50000 };
  if (!stockIsReal) {
    blocks.stockAlerts = blocks.stockAlerts.map((alert) =>
      alert.code === "COMP" ? { ...alert, qtyOnHand: 40 - (tick % 4) } : alert,
    );
  }
  blocks.activity = [
    { at: new Date(tick * 15000).toISOString(), type: "SO", number: `SO-${String(32 + (tick % 60)).padStart(4, "0")}`, action: "Created", user: "Alice Sato" },
    ...blocks.activity.slice(0, 7),
  ];
  return blocks;
}

/** The materials that are short or near short, from the real stock balances (docs/specs/f8-stock.md). */
function stockAlertsFrom(ledger, materials) {
  const rows = materials
    .map((material) => ({ material, onHand: ledger.onHandTotal("material", material.id) }))
    .map(({ material, onHand }) => ({
      materialId: material.id,
      code: material.code,
      name: material.name,
      qtyOnHand: onHand,
      reorderPoint: material.reorderPoint,
      uom: material.uom,
      status: stockStatusOf(onHand, material.reorderPoint).toUpperCase(),
    }))
    .filter((row) => ["SHORTAGE", "NEAR_SHORTAGE"].includes(row.status));
  return rows.sort((a, b) => (a.status === b.status ? a.qtyOnHand / (a.reorderPoint || 1) - b.qtyOnHand / (b.reorderPoint || 1) : a.status === "SHORTAGE" ? -1 : 1)).slice(0, 5);
}

export function buildDashboard(user, ledger, getMaterials = () => [], getPurchase = () => null) {
  const fail = failedBlocks();
  if (fail.includes("all")) throw new MockHttpError(500, "INTERNAL_SERVER_ERROR", "Mock failure");

  // Purchase: the Draft POs wait for a Manager to send them; the POs waiting for goods are Sent / Partially received
  const purchase = getPurchase()?.summaries?.() ?? null;
  const draftPos = (purchase ?? []).filter((po) => po.status === "draft").map((po) => ({ type: "PO", id: po.id, number: po.number, party: po.supplierName, amountJpy: po.total, createdAt: po.createdAt, department: "Purchase" }));
  const approvals = approvalsFor(user, purchase ? [...APPROVALS.filter((a) => a.type !== "PO"), ...draftPos] : APPROVALS);
  const blocks = {
    kpis: {
      openSaleOrders: { count: 12, readyToDeliver: 3 },
      quotationsWaiting: { count: 5, oldestDays: 9 },
      workOrdersInProcess: { count: 3, scheduled: 2 },
      lateWorkOrders: { count: 1 },
      materialsInShortage: { count: 2, nearShortage: 2 },
      poWaitingForGoods: { count: 2, nextDueDate: daysFromNow(7) },
      overdueInvoices: { count: 2, amountJpy: 1850000 },
      unpaidSupplierBills: { count: 3, amountJpy: 920000, dueWithin7Days: 1 },
    },
    approvals,
    myRecentDocuments: approvals === null ? MY_RECENT : null,
    stockAlerts: ledger ? stockAlertsFrom(ledger, getMaterials()) : STOCK_ALERTS,
    production: PRODUCTION,
    activity: ACTIVITY,
  };

  if (purchase) {
    const waiting = purchase.filter((po) => ["sent", "partially_received"].includes(po.status));
    blocks.kpis.poWaitingForGoods = { count: waiting.length, nextDueDate: waiting.map((po) => po.expectedDate).filter(Boolean).sort()[0] ?? null };
  }
  if (ledger) {
    const shortage = blocks.stockAlerts.filter((alert) => alert.status === "SHORTAGE").length;
    blocks.kpis.materialsInShortage = { count: shortage, nearShortage: blocks.stockAlerts.length - shortage };
  }
  withLiveDrift(blocks, { stockIsReal: Boolean(ledger) });

  const errors = {};
  for (const name of fail) {
    if (name in blocks) {
      blocks[name] = null;
      errors[name] = "INTERNAL_SERVER_ERROR";
    }
  }
  return { generatedAt: new Date().toISOString(), ...blocks, errors };
}
