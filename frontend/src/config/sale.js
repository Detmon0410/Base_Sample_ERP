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
};

/** Tone of a history entry marker. */
export const HISTORY_TONES = {
  accept: "success",
  approve: "success",
  confirm: "success",
  delivered: "success",
  close: "success",
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
