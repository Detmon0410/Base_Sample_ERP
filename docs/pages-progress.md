# Frontend Pages — Progress

Plan and page specs: [frontend-plan.md](frontend-plan.md). Update this file whenever a page is finished.

**Legend:** ⬜ not started · 🟦 in progress · ✅ done · ⏸ deferred

A page is **done** only when: UI built, all strings through i18n (EN), keyboard + contrast checklist passed, `pnpm lint` and `pnpm build` clean, works against the API or mock.

## Summary

| Area | Done | Total |
|---|---|---|
| Foundation (F0) | 0 | 6 |
| Authentication & shell | 0 | 6 |
| Dashboard | 0 | 1 |
| Sale | 0 | 8 |
| Factory | 0 | 5 |
| Stock | 0 | 3 |
| Purchase | 0 | 5 |
| Accounting | 0 | 6 |
| Traceability | 0 | 1 |
| Master data | 0 | 10 |
| Administration | 0 | 3 |

## Foundation

| Item | Status | Notes |
|---|---|---|
| Tailwind + shadcn/ui + tokens (`#003577` / `#FFFFFF`) | ⬜ | |
| i18n (EN + empty JA, switcher) | ⬜ | |
| Router + protected routes | ⬜ | |
| `api.js` + interceptors + mock switch | ⬜ | |
| `AuthLayout` / `MainLayout` | ⬜ | |
| Common components (PageHeader, StatusBadge, FormField, ConfirmDialog, DataTable) | ⬜ | |

## Pages

| ID | Page | Route | Pri | Status | API | i18n EN | i18n JA | Notes |
|---|---|---|---|---|---|---|---|---|
| A1 | Login | `/login` | P0 | ⬜ | mock | ⬜ | ⬜ | First deliverable |
| A2 | Forgot password | `/forgot-password` | P2 | ⬜ | | ⬜ | ⬜ | |
| A3 | Forbidden | `/403` | P0 | ⬜ | – | ⬜ | ⬜ | |
| A4 | Not found | `*` | P0 | ⬜ | – | ⬜ | ⬜ | |
| A5 | Server error | `/500` | P2 | ⬜ | – | ⬜ | ⬜ | |
| A6 | My profile | `/profile` | P2 | ⬜ | | ⬜ | ⬜ | |
| D1 | Dashboard | `/` | P0 | ⬜ | | ⬜ | ⬜ | |
| S1 | Quotation list | `/sale/quotations` | P1 | ⬜ | | ⬜ | ⬜ | |
| S2 | Quotation form | `/sale/quotations/new` | P1 | ⬜ | | ⬜ | ⬜ | Availability check |
| S3 | Quotation detail | `/sale/quotations/:id` | P1 | ⬜ | | ⬜ | ⬜ | |
| S4 | Customer PO | `/sale/customer-pos` | P1 | ⬜ | | ⬜ | ⬜ | |
| S5 | Sale Order list | `/sale/orders` | P1 | ⬜ | | ⬜ | ⬜ | |
| S6 | Sale Order form | `/sale/orders/new` | P1 | ⬜ | | ⬜ | ⬜ | |
| S7 | Sale Order detail | `/sale/orders/:id` | P1 | ⬜ | | ⬜ | ⬜ | |
| S8 | Delivery Note | `/sale/deliveries` | P1 | ⬜ | | ⬜ | ⬜ | |
| F1 | Work Order list | `/factory/work-orders` | P1 | ⬜ | | ⬜ | ⬜ | |
| F2 | Work Order form | `/factory/work-orders/new` | P1 | ⬜ | | ⬜ | ⬜ | |
| F3 | Work Order detail | `/factory/work-orders/:id` | P1 | ⬜ | | ⬜ | ⬜ | |
| F4 | Production tracking | `/factory/tracking` | P1 | ⬜ | | ⬜ | ⬜ | |
| F5 | FG transfer | `/factory/transfers` | P1 | ⬜ | | ⬜ | ⬜ | |
| T1 | Stock overview | `/stock` | P1 | ⬜ | | ⬜ | ⬜ | |
| T2 | Stock movements | `/stock/movements` | P2 | ⬜ | | ⬜ | ⬜ | |
| T3 | Stock adjustment | `/stock/adjustments/new` | P2 | ⬜ | | ⬜ | ⬜ | |
| P1 | Stock status board | `/purchase/stock-status` | P1 | ⬜ | | ⬜ | ⬜ | |
| P2 | PO list | `/purchase/orders` | P1 | ⬜ | | ⬜ | ⬜ | |
| P3 | PO form | `/purchase/orders/new` | P1 | ⬜ | | ⬜ | ⬜ | |
| P4 | PO detail | `/purchase/orders/:id` | P1 | ⬜ | | ⬜ | ⬜ | |
| P5 | Goods receipt | `/purchase/receipts` | P2 | ⬜ | | ⬜ | ⬜ | |
| C1 | Customer invoices | `/accounting/invoices` | P2 | ⬜ | | ⬜ | ⬜ | |
| C2 | Customer receipts | `/accounting/receipts` | P2 | ⬜ | | ⬜ | ⬜ | |
| C3 | Supplier bills | `/accounting/bills` | P2 | ⬜ | | ⬜ | ⬜ | |
| C4 | Supplier payments | `/accounting/payments` | P2 | ⬜ | | ⬜ | ⬜ | |
| C5 | Journal entries | `/accounting/journal` | P2 | ⬜ | | ⬜ | ⬜ | |
| C6 | Accounting master | `/accounting/master/*` | P2 | ⬜ | | ⬜ | ⬜ | |
| R1 | Product trace | `/trace` | P2 | ⬜ | | ⬜ | ⬜ | |
| M1 | Customers | `/master/customers` | P1 | ⬜ | | ⬜ | ⬜ | |
| M2 | Suppliers | `/master/suppliers` | P1 | ⬜ | | ⬜ | ⬜ | |
| M3 | Products | `/master/products` | P1 | ⬜ | | ⬜ | ⬜ | |
| M4 | Materials | `/master/materials` | P1 | ⬜ | | ⬜ | ⬜ | |
| M5 | BOM editor | in Product | P1 | ⬜ | | ⬜ | ⬜ | |
| M6 | Warehouses | `/master/warehouses` | P1 | ⬜ | | ⬜ | ⬜ | |
| M7 | Machines / Lines | `/master/machines` | P2 | ⬜ | | ⬜ | ⬜ | |
| M8 | Employees | `/master/employees` | P2 | ⬜ | | ⬜ | ⬜ | |
| M9 | Units of measure | `/master/uom` | P2 | ⬜ | | ⬜ | ⬜ | |
| M10 | Price lists | `/master/price-lists` | P2 | ⬜ | | ⬜ | ⬜ | |
| U1 | Users | `/admin/users` | P1 | ⬜ | | ⬜ | ⬜ | |
| U2 | User form (dept + role) | `/admin/users/:id` | P1 | ⬜ | | ⬜ | ⬜ | |
| U3 | Departments & roles | `/admin/roles` | P2 | ⬜ | | ⬜ | ⬜ | |

## Change log

| Date | Change |
|---|---|
| 2026-10-02 | Plan and tracker created. No pages implemented yet. |
