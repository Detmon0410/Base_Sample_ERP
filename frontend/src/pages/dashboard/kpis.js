import { formatCurrency, formatDate, formatNumber } from "@/utils/format";

/**
 * The 8 KPI cards, two per department group (docs/specs/f2-app-shell-dashboard.md 2.2).
 * `department` decides who gets a link; `problem(k)` marks numbers that need attention.
 */
export const KPI_DEFS = [
  {
    key: "openSaleOrders",
    department: "Sale",
    to: "/sale/orders",
    value: (k, lng) => formatNumber(k.count, lng),
    context: (k, lng) => ({ count: formatNumber(k.readyToDeliver, lng) }),
  },
  {
    key: "quotationsWaiting",
    department: "Sale",
    to: "/sale/quotations",
    value: (k, lng) => formatNumber(k.count, lng),
    context: (k) => ({ count: k.oldestDays }),
  },
  {
    key: "workOrdersInProcess",
    department: "Factory",
    to: "/factory/work-orders",
    value: (k, lng) => formatNumber(k.count, lng),
    context: (k, lng) => ({ count: formatNumber(k.scheduled, lng) }),
  },
  {
    key: "lateWorkOrders",
    department: "Factory",
    to: "/factory/work-orders",
    value: (k, lng) => formatNumber(k.count, lng),
    context: () => ({}),
    problem: (k) => k.count > 0,
  },
  {
    key: "materialsInShortage",
    department: "Purchase",
    to: "/purchase/stock-status",
    value: (k, lng) => formatNumber(k.count, lng),
    context: (k, lng) => ({ count: formatNumber(k.nearShortage, lng) }),
    problem: (k) => k.count > 0,
  },
  {
    key: "poWaitingForGoods",
    department: "Purchase",
    to: "/purchase/orders",
    value: (k, lng) => formatNumber(k.count, lng),
    context: (k, lng) => ({ date: formatDate(k.nextDueDate, lng) }),
  },
  {
    key: "overdueInvoices",
    department: "Accounting",
    to: "/accounting/invoices",
    value: (k, lng) => formatCurrency(k.amountJpy, lng),
    context: (k, lng) => ({ count: formatNumber(k.count, lng) }),
    problem: (k) => k.count > 0,
  },
  {
    key: "unpaidSupplierBills",
    department: "Accounting",
    to: "/accounting/bills",
    value: (k, lng) => formatCurrency(k.amountJpy, lng),
    context: (k, lng) => ({ count: formatNumber(k.dueWithin7Days, lng) }),
  },
];
