// Sale module rules shared by the pages (docs/specs/f6-sale.md). The server enforces the same rules.
import { roleInDepartment } from "@/utils/permissions";

export const TAX_RATE = 0.1; // consumption tax (spec Q3), whole yen rounded down

export const QUOTATION_STATUSES = ["draft", "sent", "accepted", "rejected", "expired"];
export const ORDER_STATUSES = ["draft", "confirmed", "in_production", "ready_to_deliver", "delivered", "closed", "cancelled"];
export const DELIVERY_STATUSES = ["draft", "delivered"];

/** Tone of a status badge: success = good end, danger = bad end, warning = needs attention, neutral = in progress. */
export const STATUS_TONES = {
  draft: "neutral",
  sent: "warning",
  accepted: "success",
  rejected: "danger",
  expired: "danger",
  confirmed: "neutral",
  in_production: "warning",
  ready_to_deliver: "warning",
  delivered: "success",
  closed: "success",
  cancelled: "danger",
  scheduled: "neutral",
  in_process: "warning",
  finished: "success",
  transferred: "success",
  pending: "warning",
  approved: "success",
  partially_received: "warning",
  received: "success",
  posted: "success",
  issued: "neutral",
  partially_paid: "warning",
  paid: "success",
  overdue: "danger",
  confirmed: "neutral",
  reversed: "neutral",
};

/**
 * One colour per status, the same in the status stepper and in the badges of the tables.
 *   badge  chip in a table or a sheet header     ring / hover / solid / soft / title  parts of a stepper step
 */
export const STATUS_COLORS = {
  draft: { badge: "border-slate-300 bg-slate-100 text-slate-700", ring: "border-slate-400 text-slate-600", hover: "group-hover:bg-slate-100", solid: "border-slate-600 bg-slate-600", soft: "bg-slate-100 text-slate-700", title: "text-slate-700" },
  sent: { badge: "border-amber-300 bg-amber-50 text-amber-800", ring: "border-amber-500 text-amber-700", hover: "group-hover:bg-amber-50", solid: "border-amber-600 bg-amber-600", soft: "bg-amber-50 text-amber-700", title: "text-amber-700" },
  accepted: { badge: "border-emerald-300 bg-emerald-50 text-emerald-800", ring: "border-emerald-500 text-emerald-700", hover: "group-hover:bg-emerald-50", solid: "border-emerald-600 bg-emerald-600", soft: "bg-emerald-50 text-emerald-700", title: "text-emerald-700" },
  rejected: { badge: "border-red-300 bg-red-50 text-red-800", ring: "border-red-500 text-red-700", hover: "group-hover:bg-red-50", solid: "border-red-600 bg-red-600", soft: "bg-red-50 text-red-700", title: "text-red-700" },
  expired: { badge: "border-orange-300 bg-orange-50 text-orange-800", ring: "border-orange-500 text-orange-700", hover: "group-hover:bg-orange-50", solid: "border-orange-600 bg-orange-600", soft: "bg-orange-50 text-orange-700", title: "text-orange-700" },
  confirmed: { badge: "border-sky-300 bg-sky-50 text-sky-800", ring: "border-sky-500 text-sky-700", hover: "group-hover:bg-sky-50", solid: "border-sky-600 bg-sky-600", soft: "bg-sky-50 text-sky-700", title: "text-sky-700" },
  in_production: { badge: "border-amber-300 bg-amber-50 text-amber-800", ring: "border-amber-500 text-amber-700", hover: "group-hover:bg-amber-50", solid: "border-amber-600 bg-amber-600", soft: "bg-amber-50 text-amber-700", title: "text-amber-700" },
  ready_to_deliver: { badge: "border-violet-300 bg-violet-50 text-violet-800", ring: "border-violet-500 text-violet-700", hover: "group-hover:bg-violet-50", solid: "border-violet-600 bg-violet-600", soft: "bg-violet-50 text-violet-700", title: "text-violet-700" },
  delivered: { badge: "border-emerald-300 bg-emerald-50 text-emerald-800", ring: "border-emerald-500 text-emerald-700", hover: "group-hover:bg-emerald-50", solid: "border-emerald-600 bg-emerald-600", soft: "bg-emerald-50 text-emerald-700", title: "text-emerald-700" },
  closed: { badge: "border-slate-400 bg-slate-200 text-slate-800", ring: "border-slate-600 text-slate-800", hover: "group-hover:bg-slate-200", solid: "border-slate-700 bg-slate-700", soft: "bg-slate-200 text-slate-800", title: "text-slate-800" },
  scheduled: { badge: "border-sky-300 bg-sky-50 text-sky-800", ring: "border-sky-500 text-sky-700", hover: "group-hover:bg-sky-50", solid: "border-sky-600 bg-sky-600", soft: "bg-sky-50 text-sky-700", title: "text-sky-700" },
  in_process: { badge: "border-amber-300 bg-amber-50 text-amber-800", ring: "border-amber-500 text-amber-700", hover: "group-hover:bg-amber-50", solid: "border-amber-600 bg-amber-600", soft: "bg-amber-50 text-amber-700", title: "text-amber-700" },
  finished: { badge: "border-emerald-300 bg-emerald-50 text-emerald-800", ring: "border-emerald-500 text-emerald-700", hover: "group-hover:bg-emerald-50", solid: "border-emerald-600 bg-emerald-600", soft: "bg-emerald-50 text-emerald-700", title: "text-emerald-700" },
  transferred: { badge: "border-teal-300 bg-teal-50 text-teal-800", ring: "border-teal-500 text-teal-700", hover: "group-hover:bg-teal-50", solid: "border-teal-600 bg-teal-600", soft: "bg-teal-50 text-teal-700", title: "text-teal-700" },
  cancelled: { badge: "border-red-300 bg-red-50 text-red-800", ring: "border-red-500 text-red-700", hover: "group-hover:bg-red-50", solid: "border-red-600 bg-red-600", soft: "bg-red-50 text-red-700", title: "text-red-700" },
  pending: { badge: "border-amber-300 bg-amber-50 text-amber-800", ring: "border-amber-500 text-amber-700", hover: "group-hover:bg-amber-50", solid: "border-amber-600 bg-amber-600", soft: "bg-amber-50 text-amber-700", title: "text-amber-700" },
  approved: { badge: "border-emerald-300 bg-emerald-50 text-emerald-800", ring: "border-emerald-500 text-emerald-700", hover: "group-hover:bg-emerald-50", solid: "border-emerald-600 bg-emerald-600", soft: "bg-emerald-50 text-emerald-700", title: "text-emerald-700" },
  partially_received: { badge: "border-amber-300 bg-amber-50 text-amber-800", ring: "border-amber-500 text-amber-700", hover: "group-hover:bg-amber-50", solid: "border-amber-600 bg-amber-600", soft: "bg-amber-50 text-amber-700", title: "text-amber-700" },
  received: { badge: "border-emerald-300 bg-emerald-50 text-emerald-800", ring: "border-emerald-500 text-emerald-700", hover: "group-hover:bg-emerald-50", solid: "border-emerald-600 bg-emerald-600", soft: "bg-emerald-50 text-emerald-700", title: "text-emerald-700" },
  posted: { badge: "border-emerald-300 bg-emerald-50 text-emerald-800", ring: "border-emerald-500 text-emerald-700", hover: "group-hover:bg-emerald-50", solid: "border-emerald-600 bg-emerald-600", soft: "bg-emerald-50 text-emerald-700", title: "text-emerald-700" },
  issued: { badge: "border-sky-300 bg-sky-50 text-sky-800", ring: "border-sky-500 text-sky-700", hover: "group-hover:bg-sky-50", solid: "border-sky-600 bg-sky-600", soft: "bg-sky-50 text-sky-700", title: "text-sky-700" },
  partially_paid: { badge: "border-amber-300 bg-amber-50 text-amber-800", ring: "border-amber-500 text-amber-700", hover: "group-hover:bg-amber-50", solid: "border-amber-600 bg-amber-600", soft: "bg-amber-50 text-amber-700", title: "text-amber-700" },
  paid: { badge: "border-emerald-300 bg-emerald-50 text-emerald-800", ring: "border-emerald-500 text-emerald-700", hover: "group-hover:bg-emerald-50", solid: "border-emerald-600 bg-emerald-600", soft: "bg-emerald-50 text-emerald-700", title: "text-emerald-700" },
  overdue: { badge: "border-red-300 bg-red-50 text-red-800", ring: "border-red-500 text-red-700", hover: "group-hover:bg-red-50", solid: "border-red-600 bg-red-600", soft: "bg-red-50 text-red-700", title: "text-red-700" },
  reversed: { badge: "border-slate-300 bg-slate-100 text-slate-700", ring: "border-slate-400 text-slate-600", hover: "group-hover:bg-slate-100", solid: "border-slate-600 bg-slate-600", soft: "bg-slate-100 text-slate-700", title: "text-slate-700" },
};

/** Tone of a history entry marker. */
export const HISTORY_TONES = {
  accept: "success",
  approve: "success",
  "approve-order": "success",
  "reject-order": "danger",
  "adjustment-approve": "success",
  receive: "success",
  issue: "success",
  "bill-approve": "success",
  "money-confirm": "success",
  "entry-post": "success",
  pay: "success",
  post: "success",
  confirm: "success",
  delivered: "success",
  close: "success",
  finish: "success",
  transfer: "success",
  reject: "danger",
  "reject-confirm": "danger",
  cancel: "danger",
  expire: "danger",
};

/** A new, empty line of a document. */
export const EMPTY_LINE = { productId: null, qty: 1, unitPrice: 0, priceEdited: false };

/** Subtotal, consumption tax and total of lines [{ qty, unitPrice }] in yen (tax rounded down, like the server). */
export function documentTotals(lines) {
  const subtotal = (lines ?? []).reduce((sum, line) => sum + (Number(line?.qty) || 0) * (Number(line?.unitPrice) || 0), 0);
  const tax = Math.floor(subtotal * TAX_RATE);
  return { subtotal, tax, total: subtotal + tax };
}

export const saleRole = (user) => roleInDepartment(user, "Sale");
export const canWork = (user) => Boolean(saleRole(user));
export const isSaleManager = (user) => ["Manager", "Admin"].includes(saleRole(user));

/**
 * The buttons of a document in its current status for this user.
 *   key         action name sent to the server
 *   primary     shown as the main (blue) button
 *   noteLabel   "optional" | "required" | none: a note box in the confirmation
 *   dialog      the confirmation texts live in sale:actions.<key>
 *   needsManager  only Manager / Admin may press it
 * Anything not listed is not offered, so the user never sees a button that fails.
 */
export function quotationActions(doc, user) {
  const manager = isSaleManager(user);
  const list = [];
  if (doc.status === "draft") list.push({ key: "send", primary: true, noteLabel: "optional" });
  if (doc.status === "sent") {
    list.push({ key: "accept", primary: true, noteLabel: "optional" });
    list.push({ key: "reject", noteLabel: "required" });
    list.push({ key: "expire", noteLabel: "optional" });
  }
  if (doc.status === "accepted" && !doc.links?.some((link) => link.type === "order" && link.status !== "cancelled")) {
    list.push({ key: "create-order", primary: true, noteLabel: null });
  }
  if (manager && doc.history?.filter((entry) => entry.status).length > 1) list.push({ key: "revert", noteLabel: "required", needsManager: true });
  return list;
}

export function orderActions(doc, user) {
  const manager = isSaleManager(user);
  const list = [];
  const pending = doc.approval === "requested";
  if (doc.status === "draft" && !pending) {
    if (manager) list.push({ key: "approve", primary: true, noteLabel: "optional", needsManager: true });
    else list.push({ key: "request-confirm", primary: true, noteLabel: "optional" });
  }
  // while a request is pending the Manager sees Approve / Reject (ApprovalActions) and the Worker a waiting note
  if (doc.status === "confirmed") list.push({ key: "send-to-factory", primary: true, noteLabel: "optional" });
  if (doc.status === "in_production") list.push({ key: "mark-ready", primary: true, noteLabel: "optional" });
  if (doc.status === "ready_to_deliver") list.push({ key: "create-delivery-note", primary: true, noteLabel: null });
  if (doc.status === "delivered" && manager) list.push({ key: "close", primary: true, noteLabel: "optional", needsManager: true });
  if (["draft", "confirmed"].includes(doc.status)) list.push({ key: "cancel", noteLabel: "optional", danger: true });
  if (["in_production", "ready_to_deliver"].includes(doc.status) && manager) list.push({ key: "cancel", noteLabel: "required", danger: true, needsManager: true });
  if (manager && doc.history?.filter((entry) => entry.status).length > 1) list.push({ key: "revert", noteLabel: "required", needsManager: true });
  return list;
}

export function deliveryActions(doc, user) {
  const manager = isSaleManager(user);
  const list = [];
  if (doc.status === "draft") list.push({ key: "confirm", primary: true, noteLabel: "optional" });
  if (doc.status === "delivered" && manager) list.push({ key: "revert", noteLabel: "required", needsManager: true });
  return list;
}
