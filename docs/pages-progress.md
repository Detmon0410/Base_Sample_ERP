# Frontend Pages — Progress

Plan and page specs: [frontend-plan.md](frontend-plan.md). API contract per page: [api/README.md](api/README.md). Update this file whenever a page is finished.

**Legend:** ⬜ not started · 🟦 in progress · ✅ done · ⏸ deferred

A page is **done** only when: UI built, all strings through i18n (EN), keyboard + contrast checklist passed, `pnpm lint` and `pnpm build` clean, works against the API or mock.

## Summary

| Area | Done | Total |
|---|---|---|
| Foundation (F0) | 0 | 6 |
| Authentication & shell | 3 | 5 |
| Dashboard | 1 | 1 |
| Sale | 0 | 8 |
| Factory | 0 | 5 |
| Stock | 0 | 3 |
| Purchase | 0 | 5 |
| Accounting | 0 | 6 |
| Traceability | 0 | 1 |
| Master data | 5 | 10 |
| Administration | 0 | 3 |

## Foundation

| Item | Status | Notes |
|---|---|---|
| Tailwind + shadcn/ui + tokens (`#1447E6` / `#FFFFFF`) | ✅ | Root font 18px, buttons/inputs 45–54px, JA font fallback stack |
| i18n (EN + empty JA, switcher) | ✅ | `react-i18next`, namespaces `common` / `auth` / `nav`, JA falls back to EN |
| Router + protected routes | ✅ | `ProtectedRoute`, `GuestRoute`, `RequirePermission` (not applied to any route yet) |
| `api.js` + interceptors + mock switch | ✅ | `VITE_USE_MOCK=true` serves `/auth/*` from `services/mock` |
| `AuthLayout` / `MainLayout` | ✅ | F2 shell: collapsible sidebar (280px / 64px, remembered), header with breadcrumb, language and user menu |
| Common components | ✅ | LanguageSwitcher, PageHeader, MessagePage, StatusBadge, DataTable, Pagination, ListPage, FormField, FormSection, FormFooter (sticky Save/Cancel), MoneyInput, ConfirmDialog; detail pages: DetailLayout (+DetailHeader, DetailSection, DetailFields), StatusTimeline, LinkedDocuments, ApprovalActions (Approve/Reject by role, reject needs a reason). Demo: `/dev/foundation` (dev only) |

## Pages

| ID | Page | Route | Pri | Status | API | i18n EN | i18n JA | Notes |
|---|---|---|---|---|---|---|---|---|
| A1 | Login | `/login` | P0 | ✅ | mock | ✅ | ⬜ | Verified in browser: validation, wrong password, inactive account, redirect-back, reload keeps session, logout, 401 → login |
| A2 | ~~Forgot password~~ | – | – | ⏸ | | – | – | Removed (Admin resets passwords) |
| A3 | Forbidden | `/403` | P0 | ✅ | – | ✅ | ⬜ | |
| A4 | Not found | `*` | P0 | ✅ | – | ✅ | ⬜ | |
| A5 | Server error | `/500` | P2 | ⬜ | – | ⬜ | ⬜ | |
| A6 | My profile | `/profile` | P2 | ⬜ | | ⬜ | ⬜ | |
| D1 | Dashboard | `/` | P0 | ✅ | mock | ✅ | ⬜ | Spec: specs/f2-app-shell-dashboard.md · API: api/dashboard.md · tested as Admin, Manager+Worker, Worker |
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
| M1 | Customers | `/master/customers` | P1 | ✅ | mock | ✅ | ⬜ | Shared list/form pattern built here. Tested as Admin; non-Admin gets 403. API: api/master-data.md |
| M2 | Suppliers | `/master/suppliers` | P1 | ⬜ | | ⬜ | ⬜ | |
| M3 | Products | `/master/products` | P1 | ⬜ | | ⬜ | ⬜ | |
| M4 | Materials | `/master/materials` | P1 | ⬜ | | ⬜ | ⬜ | |
| M5 | BOM editor | in Product | P1 | ⬜ | | ⬜ | ⬜ | |
| M6 | Warehouses | `/master/warehouses` | P1 | ✅ | mock | ✅ | ⬜ | Generic flat-field page (pages/master/simple). Tested as Admin: create, duplicate code, validation, deactivate, delete, in-use block. API: api/master-data.md |
| M7 | Machines / Lines | `/master/machines` | P2 | ✅ | mock | ✅ | ⬜ | Generic flat-field page (pages/master/simple). Tested as Admin: create, duplicate code, validation, deactivate, delete, in-use block. API: api/master-data.md |
| M8 | Employees | `/master/employees` | P2 | ✅ | mock | ✅ | ⬜ | Generic flat-field page (pages/master/simple). Tested as Admin: create, duplicate code, validation, deactivate, delete, in-use block. API: api/master-data.md |
| M9 | Units of measure | `/master/uom` | P2 | ✅ | mock | ✅ | ⬜ | Generic flat-field page (pages/master/simple). Tested as Admin: create, duplicate code, validation, deactivate, delete, in-use block. API: api/master-data.md |
| M10 | Price lists | `/master/price-lists` | P2 | ⬜ | | ⬜ | ⬜ | |
| U1 | Users | `/admin/users` | P1 | ⬜ | | ⬜ | ⬜ | |
| U2 | User form (dept + role) | `/admin/users/:id` | P1 | ⬜ | | ⬜ | ⬜ | |
| U3 | Departments & roles | `/admin/roles` | P2 | ⬜ | | ⬜ | ⬜ | |

## Change log

| Date | Change |
|---|---|
| 2026-10-05 | Master data forms (new / edit) now open as a sheet sliding in from the right over the list, background slightly blurred; list search/filter/page is kept and the list reloads after save. Applies to Customers, Units of measure, Warehouses, Machines and Employees (all later detail pages should use `DetailSheet`). |
| 2026-10-05 | Master Data: M9 Units of measure, M6 Warehouses, M7 Machines / lines and M8 Employees built with mock data from one generic list/form page; API doc updated. |
| 2026-10-05 | Shared UX/UI foundation completed: detail layout, status history, linked documents, role-based Approve/Reject, shared save/cancel footer; page minimum width lowered from 1280px to 640px so 200% zoom on a 1280px screen reflows without side scrolling (forms, detail and dashboard grids stack, sidebar becomes a menu button). Checked in the browser with fake records; Approve/Reject shown only to Admin and the Manager of the owning department, others see a "waiting" note. |
| 2026-10-02 | Plan and tracker created. No pages implemented yet. |
| 2026-10-02 | Foundation (F0) built: tokens, i18n, API client + mock, layouts, 403/404 pages. |
| 2026-10-02 | F3 Master Data spec drafted (specs/f3-master-data.md); suggested answers Q1–Q10 approved. |
| 2026-10-02 | F3: shared list/form pattern + M1 Customers built with mock data (search, filter, sort, paging in URL, create, edit, deactivate, delete, unsaved-changes guard). |
| 2026-10-02 | Dashboard: removed the Refresh button; it updates itself every 15 s while the tab is visible (polling; push later). No Live / Updated label is shown. |
| 2026-10-02 | Dashboard v2 proposed (specs/d1-dashboard-v2.md): department tiles + overview panel + chart cards, based on the POS reference; waiting for review. |
| 2026-10-02 | Sidebar narrowed again to 208px (menu rows 45px, sub-page labels 16px and wrapping instead of truncating); divider line added between the profile and language buttons. |
| 2026-10-02 | Top bar made compact (54px, sidebar 240px): profile button shows avatar + name; language is a separate flag button with a flag + name list (replaces the flags-in-profile-menu design). |
| 2026-10-02 | Language choice moved into the user menu as small rectangular flags (UK / Japan); login screen shows the same flags. Header user button is avatar-only; Log out is red. |
| 2026-10-02 | F2 review: removed Dashboard quick actions, hid visible page titles (screen-reader-only h1), fixed the logo badge in the collapsed sidebar. |
| 2026-10-02 | F2: app shell (collapsible sidebar by department, breadcrumb, user menu), Dashboard D1 with mock data, placeholder page for every unbuilt menu entry. |
| 2026-10-02 | F1: Login page, `AuthProvider` / `useAuth`, route guards, logout button in header. |
