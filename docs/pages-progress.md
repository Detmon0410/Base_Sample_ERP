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
| Sale | 8 | 8 |
| Factory | 0 | 5 |
| Stock | 0 | 3 |
| Purchase | 0 | 5 |
| Accounting | 0 | 6 |
| Traceability | 0 | 1 |
| Master data | 10 | 10 |
| Administration | 0 | 3 |

## Foundation

| Item | Status | Notes |
|---|---|---|
| Tailwind + shadcn/ui + tokens (`#0D6EB3` / `#FFFFFF`) | ✅ | Root font 18px, buttons/inputs 45–54px, JA font fallback stack |
| i18n (EN + empty JA, switcher) | ✅ | `react-i18next`, namespaces `common` / `auth` / `nav`, JA falls back to EN |
| Router + protected routes | ✅ | `ProtectedRoute`, `GuestRoute`, `RequirePermission` (not applied to any route yet) |
| `api.js` + interceptors + mock switch | ✅ | `VITE_USE_MOCK=true` serves `/auth/*` from `services/mock` |
| `AuthLayout` / `MainLayout` | ✅ | F2 shell: collapsible sidebar (232px by default and draggable between 208 and 360px / 64px collapsed, both remembered), header with breadcrumb, language and user menu |
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
| S1 | Quotation list | `/sale/quotations` | P1 | ✅ | mock | ✅ | ⬜ | Search, status, customer and date filters in the URL; status badges (text + icon); empty / no result / error states. Tested as Sale Manager, Sale Worker and a non-Sale user. API: api/sale.md |
| S2 | Quotation form | `/sale/quotations/new` | P1 | ✅ | mock | ✅ | ⬜ | One sheet with S3: customer and dates, line grid with default prices from the customer's price list, totals with 10 % tax, material availability. Tested as Sale Manager, Sale Worker and a non-Sale user. API: api/sale.md |
| S3 | Quotation detail | `/sale/quotations/:id` | P1 | ✅ | mock | ✅ | ⬜ | Draft editable, other statuses read-only; manual Send / Mark accepted / rejected / expired / Create sale order / Revert, each with a confirmation and a history line. Tested as Sale Manager, Sale Worker and a non-Sale user. API: api/sale.md |
| S4 | Customer PO list/form | `/sale/customer-pos` | P1 | ✅ | mock | ✅ | ⬜ | Duplicate PO number refused per customer; attachment name + size (no upload in the mock); locked once an order uses it. Tested as Sale Manager, Sale Worker and a non-Sale user. API: api/sale.md |
| S5 | Sale Order list | `/sale/orders` | P1 | ✅ | mock | ✅ | ⬜ | Filters like quotations; "Waiting for approval" badge. Tested as Sale Manager, Sale Worker and a non-Sale user. API: api/sale.md |
| S6 | Sale Order form | `/sale/orders/new` | P1 | ✅ | mock | ✅ | ⬜ | One sheet with S7; references limited to the customer's accepted quotations and POs. Tested as Sale Manager, Sale Worker and a non-Sale user. API: api/sale.md |
| S7 | Sale Order detail | `/sale/orders/:id` | P1 | ✅ | mock | ✅ | ⬜ | Request confirmation → Approve / Reject → Send to factory → Mark ready → Create delivery note → Close order; Cancel; Revert; delivered column. Tested as Sale Manager, Sale Worker and a non-Sale user. API: api/sale.md |
| S8 | Delivery Note list / detail | `/sale/deliveries` | P1 | ✅ | mock | ✅ | ⬜ | Created from a ready order; partial deliveries; Confirm delivery by hand (the order becomes Delivered when everything is delivered). Tested as Sale Manager, Sale Worker and a non-Sale user. API: api/sale.md |
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
| M2 | Suppliers | `/master/suppliers` | P1 | ✅ | mock | ✅ | ⬜ | Details sheet with tabs. Tested as Admin: validation, create, supplier links added / edited / removed from both sides, duplicate link blocked. API: api/master-data.md |
| M3 | Products | `/master/products` | P1 | ✅ | mock | ✅ | ⬜ | Details sheet with tabs. Tested as Admin: validation, create, delete (in use is blocked), BOM add / edit / remove, routing add / move / remove with renumbering. API: api/master-data.md |
| M4 | Materials | `/master/materials` | P1 | ✅ | mock | ✅ | ⬜ | Details sheet with tabs. Tested as Admin: validation, create, supplier links added / edited / removed from both sides, duplicate link blocked. API: api/master-data.md | "Used in" tab waits for Products.
| M5 | BOM editor | in Product | P1 | ✅ | mock | ✅ | ⬜ | Tab "BOM" of the product sheet; the material's "Used in" tab reads it. API: api/master-data.md |
| M6 | Warehouses | `/master/warehouses` | P1 | ✅ | mock | ✅ | ⬜ | Generic flat-field page (pages/master/simple). Tested as Admin: create, duplicate code, validation, deactivate, delete, in-use block. API: api/master-data.md |
| M7 | Machines / Lines | `/master/machines` | P2 | ✅ | mock | ✅ | ⬜ | Generic flat-field page (pages/master/simple). Tested as Admin: create, duplicate code, validation, deactivate, delete, in-use block. API: api/master-data.md |
| M8 | Employees | `/master/employees` | P2 | ✅ | mock | ✅ | ⬜ | Generic flat-field page (pages/master/simple). Tested as Admin: create, duplicate code, validation, deactivate, delete, in-use block. API: api/master-data.md |
| M9 | Units of measure | `/master/uom` | P2 | ✅ | mock | ✅ | ⬜ | Generic flat-field page (pages/master/simple). Tested as Admin: create, duplicate code, validation, deactivate, delete, in-use block. API: api/master-data.md |
| M10 | Price lists | `/master/price-lists` | P2 | ✅ | mock | ✅ | ⬜ | Details sheet. Tested as Admin: list, search by product or customer, create, validation (required, price, end before start), overlapping period blocked, pair read-only after creation, edit from the header, status button, delete. API: api/master-data.md |
| U1 | Users | `/admin/users` | P1 | ⬜ | | ⬜ | ⬜ | |
| U2 | User form (dept + role) | `/admin/users/:id` | P1 | ⬜ | | ⬜ | ⬜ | |
| U3 | Departments & roles | `/admin/roles` | P2 | ⬜ | | ⬜ | ⬜ | |

## Change log

| Date | Change |
|---|---|
| 2026-10-06 | **Link tables in master data sheets** (Materials sold by a supplier, Suppliers of a material, BOM and Routing of a product) now look like the lines of a quotation: numbered rows, the price / lead time / quantity are plain cells that are changed by clicking them (saved when you leave the cell or press Enter; a wrong value is put back), a red bin removes a row (asks first), no Edit button, and "Add a material" opens one more row at the end with a check (save) and a cross (cancel). In the Routing tab the process name is a plain cell, the machine is picked in its cell (saved at once), the arrows move a step up or down and the bin removes it; "Add a step" opens one more row. |
| 2026-10-06 | **Master data tables**: rows are 46px high (smaller status badge); the Edit column is gone (a click on the row opens the sheet; the first column is also a real link for the keyboard); the Units of measure table has fixed widths for Code and Status so the Name column takes the rest. The sheet of a saved record is titled "Edit unit of measure" / "Edit customer" ... (like "New ..."). The Active / Inactive button in the sheet header is a **toggle switch** (green on, grey off, one click, tooltip says what it does). `DataTable` columns can set `width` and `align: "center"`. |
| 2026-10-06 | **Faster first load**: every page is its own file that is loaded when its route is opened (`React.lazy` in `routes/index.jsx`; the sign-in screen, the layout and the system pages stay in the first file; a short skeleton shows while a page arrives). The first JavaScript file went from 1.1 MB to about 350 KB and the "larger than 500 kB" build warning is gone. **Search by product**: the search box of Quotations, Sale Orders and Delivery Notes also finds the code or the name of a product on the lines (`q`, see api/sale.md). |
| 2026-10-06 | **Automated tests** (vitest + Testing Library, `npm run test` in `frontend`): 49 tests in 6 files. `config/sale.test.js` (tax, who may press which status button), `utils/format.test.js`, `services/mock/sale.test.js` (the Sale API against the mock: validation, numbering, status flow, role checks, copy a quotation, stepper counts and sums over all pages, partial deliveries), and components: `StatusStepper`, `DataTable` summary row, `PrintDocument`. The mock has no waiting time in tests. Not covered yet: the sheets (forms), the filter menu and the date picker (they need more browser parts), Master Data, and the real backend. |
| 2026-10-06 | **Print and copy (Sale)**: every quotation, sale order and delivery note sheet has a Print icon (opens the browser print dialog straight away, Print / Save as PDF, of an A4 page; the delivery note has no prices and two signature lines). The company details are placeholders in `config/company.js`. A quotation sheet also has a Copy icon: **Copy as a new quotation** makes a new draft with a new number (today, valid 30 days, same customer and lines; history says "Copied from QT-…"). API: `POST /sale/quotations/:id/duplicate`, see api/sale.md. |
| 2026-10-06 | **Sale lists**: a status stepper above Quotations (5 steps) and Sale Orders (7 steps) with the number of documents in each; pressing a step filters the list (press again for all). Table status badges and the stepper share one colour per status (`STATUS_COLORS` in `config/sale.js`). The last row of every table says "Total N items"; quotations and sale orders also show the sum of the Total column for the whole filtered list. Empty tables use the shadcn `Empty` (no records / no results). API: `meta.statusCounts`, `meta.sums`, see api/sale.md. |
| 2026-10-06 | **Sheets**: the header is one quiet row (title is cut with … when narrow; Save is the only filled button; status buttons are borderless tinted fills: blue main step, red reject / cancel, amber expire, grey revert). The quotation header card shows number and status at its right end; edit and read-only use the same two-column layout. Lines table: numbered rows, cells look like plain text until hovered, red delete icon. Material availability: numbers first (Needed / In stock / Left after use), green or red row, small part icons (door, compressor, foam, steel, shelf, thermostat). Status history is a vertical stepper (reui) with the newest step on top. Sheets no longer blur the page (dim only) and slide in faster. |
| 2026-10-06 | **Pickers and files**: every date field is a calendar (shadcn Calendar, month / year dropdowns, Clear and Today) including the date range in Filters; a list inside a popover now scrolls when it is opened in a sheet; the file box of a customer PO opens the file in a new tab (images also show a preview). A **Refresh** button in the header reloads the lists and the dashboard of the current page. Primary buttons are `#0EA5E9`. Table header is `#EEEEEE` with `#4C4C4C` text. `FilterField` (the old labelled filter boxes) was removed; `ListToolbar` replaced it. |
| 2026-10-05 | **Brand colour changed to `#0D6EB3`** (was `#1447E6`; white on it and it on white are both 5.4:1). The soft tint behind selected menu items is `#E5F1FA`. **The top bar (AppHeader) is now the brand colour with white text**: menu toggle, breadcrumb, profile, divider and language button are white / translucent white, the avatar is white with a brand-colour initial, hover is a white 15 % wash and focus rings are white. The Sale colour on the Dashboard follows the new brand colour. |
| 2026-10-05 | List filter bars are compact (36px) and wrap neatly: new `FilterField` shows a filter as one box with a grey label cell (`Status | All`), used for Status, Customer (searchable dropdown with an "All" row) and a grouped `Date | from – to` range. The search box and filters shrink first and wrap onto a second line on narrow windows; New stays on the right. Same look on the master data lists. |
| 2026-10-06 | List toolbar redesigned (all lists): one pill-shaped bar with a **Filters** menu on the left of the search box and the New button on the same line. The menu lists Status / Customer (searchable) / Date range; active filters are blue in the menu and show as removable chips under the bar. Below the table: **Show [10/20/50/100]** rows per page, the row count, and Previous / page numbers / Next (`size` is kept in the URL). Sheets no longer blur the page behind them (dim only) and draw their content two frames after they start sliding. |
| 2026-10-05 | The sidebar header (factory logo + "Kanou ERP") is now the same brand-colour band as the top bar, with a white logo badge and a white name, and **no line** between the two: the band runs across the whole top of the page (the sidebar header also covers the 1px right border of the sidebar). |
| 2026-10-05 | Content starts closer to the top bar: a page with no description or actions renders only its hidden h1 (no empty header block), and the main area has 18px top padding, so the first box sits 18px under the top bar on every page (it was about 50px). |
| 2026-10-05 | Fluid layout: the main content has no maximum width any more (it was 1600px, centred) and fills the space right of the sidebar with 20px (`p-5`) padding on every side; checked at 640, 1280 and 2200px. |
| 2026-10-05 | Page background: the content area of every signed-in page is now `#F1F5F9`, the same grey as the detail sheet body, with white cards, boxes and the white top bar and sidebar on it. Loading placeholders use a slightly darker grey so they stay visible on it. |
| 2026-10-05 | **Table look**: zebra rows, thin 1px grid, light grey header, all table text 15px `#666666` (document numbers and codes included, no blue link), and each list in a white box with a faint shadow all around (`PANEL_CLASS`). Applies to every list and to the tables inside sheets (`ui/table.jsx`, `DataTable`, `ListPage`, `DocumentListPage`). |
| 2026-10-05 | Type scale checked on Login, Master Data lists and sheets, Dashboard and Sale: nothing below 15px except the profile initials. Login labels and subtitle raised to 16px. **Bug fixed:** opening a detail sheet by its URL (or reloading with a sheet open) showed a white screen on Master Data pages because the page read `record.id` before the record was loaded; `useRecordForm` now gives an empty record while loading. |
| 2026-10-05 | **Type scale**: text size now follows importance (see `index.css`, `@theme`): 22px sheet titles and totals, 18px document numbers and card titles, 16px body (table cells, field values, buttons), 15px secondary (labels, table headers, hints, dates, meta). Table headers and labels are smaller and quieter than the values; document numbers and codes are the largest text in a row; the page body default is 16px (the root stays 18px). |
| 2026-10-05 | Sale module built with mock data (S1–S8): quotations, customer POs, sale orders and delivery notes as document sheets with line items, default prices from the price list, material availability and a **manual status workflow** (every step is a button with a confirmation and a history line; Manager approval, cancel, close and revert). New shared parts: document sheet, line items, availability card, action dialog, document list with filters. API doc: api/sale.md. |
| 2026-10-05 | Sale module spec drafted (specs/f6-sale.md): S1–S8 as quotation / customer PO / sale order / delivery note sheets with line items, material availability check and approval; waiting for review: v2 is manual-first (every status is a button pressed in Sale) and each of Q1–Q16 has options. |
| 2026-10-05 | Master Data: M10 Price lists built with mock data (price per product + customer + period, no customer groups; overlapping active periods are refused). **All 10 master data pages are done.** |
| 2026-10-05 | Sidebar: wider by default (232px, "Master Data" fits on one line), all rows and arrows aligned, and its width can be changed by dragging the thin grey line on its right edge (208-360px, remembered; hidden while the sidebar is collapsed). The drag handle (`ResizeHandle`, a line that darkens on hover; no dots, no colored band) is shared with the detail sheet and sits last in the DOM so opening a sheet never focuses it. |
| 2026-10-05 | Detail sheet: cards no longer fold and their icons have no background; the sheet is resizable by dragging its left edge (width remembered) and fields switch between one and two columns with the sheet width. |
| 2026-10-05 | Detail sheet redesigned: grey body with white shadowed cards (with icons), Save + icon buttons (deactivate, delete, close) in the header instead of a footer; opens at once from the list row instead of showing a skeleton. All master data forms now use `useRecordForm` + `RecordSheet`. |
| 2026-10-05 | Master Data: M3 Products with the BOM (M5) and Routing tabs, and a "Used in" tab on materials. Only M10 Price lists is left. Dev page `/dev/testcomponents` lists every UI component of the app. |
| 2026-10-05 | Master Data: M4 Materials and M2 Suppliers built with mock data, each with a tab for the supplier ↔ material links (price per unit, lead time) edited from either side; new shared parts: tabs, searchable select (EntitySelect), `useRecordForm`. |
| 2026-10-05 | Master data forms (new / edit) now open as a sheet sliding in from the right over the list, background dimmed; list search/filter/page is kept and the list reloads after save. Applies to Customers, Units of measure, Warehouses, Machines and Employees (all later detail pages should use `DetailSheet`). |
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
