import { can } from "@/utils/permissions";

/**
 * Single source of truth for the menu in the header and for the route table.
 * An entry is a link (`to`) or a menu with sub-entries (`items`); `icon` is the name of its icon (components/layout/NavIcon.jsx). `action` (a key of `ACTIONS` in utils/permissions.js) says who sees it; a menu is shown when at least one of
 * its sub-entries is, and a menu with one visible sub-entry is shown as that sub-entry alone.
 * `labelKey` is an i18n key of the namespace `nav`.
 */
export const DASHBOARD_ITEM = { key: "dashboard", to: "/", labelKey: "dashboard", icon: "dashboard", action: "dashboard.view" };

export const NAV = [
  DASHBOARD_ITEM,
  {
    key: "orders",
    labelKey: "orders",
    icon: "orders",
    items: [
      { key: "qt", to: "/sale/quotations", labelKey: "qt", icon: "qt", action: "qt.use" },
      { key: "productionOrders", to: "/sale/orders", labelKey: "productionOrders", icon: "productionOrders", action: "orders.view" },
    ],
  },
  { key: "purchase", to: "/purchase/orders", labelKey: "purchase", icon: "purchase", action: "purchase.use" },
  {
    key: "accounting",
    labelKey: "accounting",
    icon: "accounting",
    items: [
      { key: "invoices", to: "/accounting/invoices", labelKey: "invoices", icon: "invoices", action: "invoices.use" },
      { key: "receipts", to: "/accounting/receipts", labelKey: "receipts", icon: "receipts", action: "receipts.use" },
    ],
  },
  {
    key: "stockGroup",
    labelKey: "stock",
    icon: "stockGroup",
    items: [
      { key: "materials", to: "/stock/materials", labelKey: "materialsStock", icon: "stock", action: "stock.view" },
      { key: "movements", to: "/stock/movements", labelKey: "movements", icon: "movements", action: "stock.view" },
    ],
  },
  {
    key: "master",
    labelKey: "master",
    icon: "master",
    items: [
      { key: "customers", to: "/master/customers", labelKey: "customers", icon: "customers", action: "customers.view" },
      { key: "products", to: "/master/products", labelKey: "products", icon: "products", action: "products.view" },
      { key: "suppliers", to: "/master/suppliers", labelKey: "suppliers", icon: "suppliers", action: "suppliers.view" },
      { key: "users", to: "/master/users", labelKey: "users", icon: "users", action: "users.use" },
    ],
  },
];

/** Every page that has a menu entry, in menu order. */
export const NAV_ITEMS = NAV.flatMap((entry) => (entry.items ? entry.items : [entry]));

/** The menu of this user: [{ type: "link", item } | { type: "menu", key, labelKey, items }]. */
export function getVisibleNav(user) {
  const visible = [];
  for (const entry of NAV) {
    if (!entry.items) {
      if (can(user, entry.action)) visible.push({ type: "link", item: entry });
      continue;
    }
    const items = entry.items.filter((item) => can(user, item.action));
    if (items.length === 1) visible.push({ type: "link", item: items[0] });
    else if (items.length > 1) visible.push({ type: "menu", key: entry.key, labelKey: entry.labelKey, icon: entry.icon, items });
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
