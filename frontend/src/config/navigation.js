import {
  DatabaseIcon,
  FactoryIcon,
  HandshakeIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  ScanSearchIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  WarehouseIcon,
} from "lucide-react";

import { canUse, roleInDepartment } from "@/utils/permissions";

/**
 * Single source of truth for the sidebar, the breadcrumb and the route table.
 * Every `to` is a page from docs/frontend-plan.md; pages that are not built yet open the
 * "not built yet" placeholder inside the shell.
 * `titleKey` / `labelKey` are i18n keys (namespace `nav`).
 */
export const DASHBOARD_ITEM = {
  key: "dashboard",
  to: "/",
  labelKey: "dashboard",
  icon: LayoutDashboardIcon,
};

export const NAV_GROUPS = [
  {
    key: "sale",
    labelKey: "groups.sale",
    icon: HandshakeIcon,
    access: { type: "departments", departments: ["Sale"] },
    items: [
      { key: "quotations", to: "/sale/quotations", labelKey: "items.quotations" },
      { key: "customerPos", to: "/sale/customer-pos", labelKey: "items.customerPos" },
      { key: "saleOrders", to: "/sale/orders", labelKey: "items.saleOrders" },
      { key: "deliveryNotes", to: "/sale/deliveries", labelKey: "items.deliveryNotes" },
    ],
  },
  {
    key: "factory",
    labelKey: "groups.factory",
    icon: FactoryIcon,
    access: { type: "departments", departments: ["Factory"] },
    items: [
      { key: "workOrders", to: "/factory/work-orders", labelKey: "items.workOrders" },
      { key: "productionTracking", to: "/factory/tracking", labelKey: "items.productionTracking" },
      { key: "fgTransfer", to: "/factory/transfers", labelKey: "items.fgTransfer" },
    ],
  },
  {
    key: "stock",
    labelKey: "groups.stock",
    icon: WarehouseIcon,
    // "Stock" is not a department in user_account_req.md; Factory and Purchase users see it.
    access: { type: "departments", departments: ["Factory", "Purchase"] },
    items: [
      { key: "stockOverview", to: "/stock", labelKey: "items.stockOverview" },
      { key: "stockMovements", to: "/stock/movements", labelKey: "items.stockMovements" },
      { key: "stockAdjustment", to: "/stock/adjustments", labelKey: "items.stockAdjustment" },
    ],
  },
  {
    key: "purchase",
    labelKey: "groups.purchase",
    icon: ShoppingCartIcon,
    access: { type: "departments", departments: ["Purchase"] },
    items: [
      { key: "stockStatus", to: "/purchase/stock-status", labelKey: "items.stockStatus" },
      { key: "purchaseOrders", to: "/purchase/orders", labelKey: "items.purchaseOrders" },
      { key: "goodsReceipt", to: "/purchase/receipts", labelKey: "items.goodsReceipt" },
      // only a Manager of the department (or an Admin) sees this entry
      { key: "purchaseApprovals", to: "/purchase/approvals", labelKey: "items.purchaseApprovals", managerOf: "Purchase" },
    ],
  },
  {
    key: "accounting",
    labelKey: "groups.accounting",
    icon: LandmarkIcon,
    access: { type: "departments", departments: ["Accounting"] },
    items: [
      { key: "invoices", to: "/accounting/invoices", labelKey: "items.invoices" },
      { key: "receipts", to: "/accounting/receipts", labelKey: "items.receipts" },
      { key: "bills", to: "/accounting/bills", labelKey: "items.bills" },
      { key: "payments", to: "/accounting/payments", labelKey: "items.payments" },
      { key: "journal", to: "/accounting/journal", labelKey: "items.journal" },
      { key: "accountingMaster", to: "/accounting/master", labelKey: "items.accountingMaster" },
    ],
  },
  {
    key: "traceability",
    labelKey: "groups.traceability",
    icon: ScanSearchIcon,
    access: { type: "anyDepartment" },
    items: [{ key: "productTrace", to: "/trace", labelKey: "items.productTrace" }],
  },
  {
    key: "masterData",
    labelKey: "groups.masterData",
    icon: DatabaseIcon,
    access: { type: "admin" },
    items: [
      { key: "customers", to: "/master/customers", labelKey: "items.customers" },
      { key: "suppliers", to: "/master/suppliers", labelKey: "items.suppliers" },
      { key: "products", to: "/master/products", labelKey: "items.products" },
      { key: "materials", to: "/master/materials", labelKey: "items.materials" },
      { key: "warehouses", to: "/master/warehouses", labelKey: "items.warehouses" },
      { key: "machines", to: "/master/machines", labelKey: "items.machines" },
      { key: "employees", to: "/master/employees", labelKey: "items.employees" },
      { key: "uom", to: "/master/uom", labelKey: "items.uom" },
      { key: "priceLists", to: "/master/price-lists", labelKey: "items.priceLists" },
    ],
  },
  {
    key: "administration",
    labelKey: "groups.administration",
    icon: ShieldCheckIcon,
    access: { type: "admin" },
    items: [
      { key: "users", to: "/admin/users", labelKey: "items.users" },
      { key: "roles", to: "/admin/roles", labelKey: "items.roles" },
    ],
  },
];

/** Groups the signed-in user may see. Groups without access are not listed at all. */
export function getVisibleGroups(user) {
  return NAV_GROUPS.filter((group) => canUse(user, group.access)).map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.managerOf || ["Manager", "Admin"].includes(roleInDepartment(user, item.managerOf))),
  }));
}

function isUnder(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Finds the menu entry for a path: the item with the longest matching `to`. */
export function findActive(pathname) {
  if (pathname === "/") return { group: null, item: DASHBOARD_ITEM };
  let best = null;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isUnder(pathname, item.to) && (!best || item.to.length > best.item.to.length)) {
        best = { group, item };
      }
    }
  }
  return best;
}
