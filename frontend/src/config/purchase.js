import { roleInDepartment } from "@/utils/permissions";

/** Statuses in the order a document goes through them (docs/specs/f9-purchase.md). */
export const PO_STATUSES = ["draft", "sent", "partially_received", "received", "closed", "cancelled"];
export const RECEIPT_STATUSES = ["draft", "posted", "cancelled"];
export const REJECT_REASONS = ["damaged", "wrong_item", "wrong_quantity", "quality", "other"];
/** Units that are counted whole; kg, m ... may have up to 3 decimals (same rule as the stock). */
export const WHOLE_UNITS = ["pcs", "set", "box"];

export const purchaseRole = (user) => roleInDepartment(user, "Purchase");
export const canWork = (user) => Boolean(purchaseRole(user));
export const isPurchaseManager = (user) => ["Manager", "Admin"].includes(purchaseRole(user));

/** What a user may do with a draft: its author and a Manager. */
export const canEditOrder = (po, user) => po.status === "draft" && canWork(user) && (isPurchaseManager(user) || po.createdById === user?.id);
export const canEditReceipt = (gr, user) => gr.status === "draft" && canWork(user) && (isPurchaseManager(user) || gr.createdById === user?.id);
/** A PO that can still receive goods. */
export const canReceive = (po, user) => canWork(user) && ["sent", "partially_received"].includes(po.status);

const posted = (po) => po.receipts?.some((receipt) => receipt.status === "posted");

/**
 * The status buttons of a Purchase Order for this user (same idea as config/factory.js). "Receive goods" is not here:
 * it opens a new goods receipt, it does not change the status.
 *   key         action name sent to the server (texts: purchase:actions.<key>.*)
 *   primary     shown as the main (light blue) button         noteLabel   "optional" | "required" | none
 */
export function purchaseOrderActions(po, user) {
  const manager = isPurchaseManager(user);
  const list = [];
  if (po.status === "draft") {
    if (manager) list.push({ key: "send", primary: true, noteLabel: "optional" });
    if (canEditOrder(po, user)) list.push({ key: "cancel", noteLabel: "optional", danger: true });
  }
  if (po.status === "sent" && manager && !posted(po)) {
    list.push({ key: "back-to-draft", noteLabel: "optional" });
    list.push({ key: "cancel", noteLabel: "required", danger: true });
  }
  if (po.status === "partially_received" && manager) list.push({ key: "close-remaining", noteLabel: "required" });
  if (po.status === "received" && manager) list.push({ key: "close", primary: true, noteLabel: "optional" });
  if (["closed", "cancelled"].includes(po.status) && manager) list.push({ key: "revert", noteLabel: "required" });
  return list;
}

export function receiptActions(gr, user) {
  const list = [];
  if (gr.status === "draft" && canEditReceipt(gr, user)) {
    list.push({ key: "post", primary: true, noteLabel: "optional" });
    list.push({ key: "cancel", noteLabel: "optional", danger: true });
  }
  if (gr.status === "posted" && isPurchaseManager(user) && !["closed", "cancelled"].includes(gr.poStatus)) list.push({ key: "cancel", noteLabel: "required", danger: true });
  return list;
}

