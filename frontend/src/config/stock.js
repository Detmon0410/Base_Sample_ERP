import { isAdmin } from "@/utils/permissions";

/** Statuses of a stock adjustment in the order a document goes through them (docs/specs/f8-stock.md). */
export const ADJUSTMENT_STATUSES = ["draft", "pending", "approved", "rejected", "cancelled"];
export const MOVEMENT_TYPES = ["opening", "receipt", "consume", "produce", "deliver", "adjust"];
export const ADJUSTMENT_REASONS = ["recount", "damaged", "lost", "found", "other"];
/** "opening" (the first quantity of an item that has no movement in that warehouse) is offered only when it applies. */
export const OPENING_REASON = "opening";

/** Statuses of the balance lists: a material is Shortage / Near shortage / Normal, a product In stock / Out of stock. */
export const MATERIAL_STOCK_STATUSES = ["shortage", "near_shortage", "normal", "not_set"];
export const PRODUCT_STOCK_STATUSES = ["in_stock", "out_of_stock"];

/** Shortage when on hand <= reorder point, near shortage when <= 1.2 x reorder point (aditional_req.md section 2). One rule for every screen. */
export function stockStatusOf(onHand, reorderPoint) {
  if (reorderPoint == null) return "not_set"; // the reorder level is optional
  if (onHand <= reorderPoint) return "shortage";
  if (onHand <= reorderPoint * 1.2) return "near_shortage";
  return "normal";
}

/** "Admin" | "Manager" | "Worker" | null. Stock is for Factory and Purchase users; the best role of the two counts. */
export function stockRole(user) {
  if (!user) return null;
  if (isAdmin(user)) return "Admin";
  const roles = user.memberships?.filter((membership) => ["Factory", "Purchase"].includes(membership.department)).map((membership) => membership.role) ?? [];
  if (roles.length === 0) return null;
  return roles.includes("Manager") ? "Manager" : "Worker";
}
export const canWork = (user) => Boolean(stockRole(user));
export const isStockManager = (user) => ["Manager", "Admin"].includes(stockRole(user));

/** The department that owns the document a movement came from, so the link is only shown to users who may open it. */
export const DOC_DEPARTMENT = { WO: "Factory", FT: "Factory", DN: "Sale", GR: "Purchase", ADJ: null };
export const DOC_PATH = { WO: "/factory/work-orders", FT: "/factory/transfers", DN: "/sale/deliveries", ADJ: "/stock/adjustments", GR: "/purchase/receipts" };

/**
 * The status buttons of a stock adjustment for this user (same idea as config/factory.js). A Worker drafts and
 * requests; a Manager also approves or rejects, but never their own adjustment (Q7).
 */
export function adjustmentActions(adj, user) {
  const manager = isStockManager(user);
  const own = adj.createdById === user?.id;
  const list = [];
  const mayHandle = canWork(user) && (manager || own);
  if (adj.status === "draft" && mayHandle) {
    list.push({ key: "request", primary: true, noteLabel: "optional" });
    list.push({ key: "cancel", noteLabel: "optional", danger: true });
  }
  if (adj.status === "pending") {
    if (manager && !own) {
      list.push({ key: "approve", primary: true, noteLabel: "optional" });
      list.push({ key: "reject", noteLabel: "required", danger: true });
    }
    if (mayHandle) list.push({ key: "back-to-draft", noteLabel: "optional" });
  }
  return list;
}

/** A draft adjustment may be edited or deleted by its author and by a Manager. */
export const canEditAdjustment = (adj, user) => adj.status === "draft" && canWork(user) && (isStockManager(user) || adj.createdById === user?.id);
