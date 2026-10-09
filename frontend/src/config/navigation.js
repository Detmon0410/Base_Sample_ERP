import { canUse } from "@/utils/permissions";

/**
 * Single source of truth for the menu in the header and for the route table (docs/specs/s1-mini-erp-workflow.md, section 7).
 * An entry is a link (`to`) or a menu with sub-entries (`items`). `roles` says who sees it; a menu is shown when at least one of
 * its sub-entries is, and a menu with one visible sub-entry is shown as that sub-entry alone.
 * `labelKey` is an i18n key of the namespace `nav`.
 */
export const SUMMARY_ITEM = { key: "summary", to: "/", labelKey: "summary", roles: ["Admin", "Worker"] };

export const NAV = [
  SUMMARY_ITEM,
  {
    key: "orders",
    labelKey: "orders",
    items: [
      { key: "qt", to: "/qt", labelKey: "qt", roles: ["Admin"] },
      { key: "productionOrders", to: "/orders", labelKey: "productionOrders", roles: ["Admin", "Worker"] },
    ],
  },
  { key: "invoices", to: "/invoices", labelKey: "invoices", roles: ["Admin"] },
  { key: "stock", to: "/stock", labelKey: "stock", roles: ["Admin", "Worker"] },
  {
    key: "master",
    labelKey: "master",
    items: [
      { key: "customers", to: "/customers", labelKey: "customers", roles: ["Admin"] },
      { key: "products", to: "/products", labelKey: "products", roles: ["Admin", "Worker"] },
    ],
  },
  { key: "users", to: "/users", labelKey: "users", roles: ["Admin"] },
];

/** Every page that has a menu entry, in menu order. */
export const NAV_ITEMS = NAV.flatMap((entry) => (entry.items ? entry.items : [entry]));

/** The menu of this user: [{ type: "link", item } | { type: "menu", key, labelKey, items }]. */
export function getVisibleNav(user) {
  const visible = [];
  for (const entry of NAV) {
    if (!entry.items) {
      if (canUse(user, entry.roles)) visible.push({ type: "link", item: entry });
      continue;
    }
    const items = entry.items.filter((item) => canUse(user, item.roles));
    if (items.length === 1) visible.push({ type: "link", item: items[0] });
    else if (items.length > 1) visible.push({ type: "menu", key: entry.key, labelKey: entry.labelKey, items });
  }
  return visible;
}

function isUnder(pathname, base) {
  return base === "/" ? pathname === "/" : pathname === base || pathname.startsWith(`${base}/`);
}

/** Finds the menu entry for a path: the item with the longest matching `to`. */
export function findActive(pathname) {
  let best = null;
  for (const item of NAV_ITEMS) {
    if (isUnder(pathname, item.to) && (!best || item.to.length > best.to.length)) best = item;
  }
  return best;
}
