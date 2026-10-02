# F2 Spec — App shell and Dashboard (D1)

Status: **BUILT with the suggested answers to Q1–Q7** (change them here and in the code if you decide otherwise) · Plan: [../frontend-plan.md](../frontend-plan.md) · Flow: Figma "Page Flow" and "User Flow" pages
After approval: build with mock data, then write `docs/api/dashboard.md` for the backend.

Decisions already made: sidebar is **collapsible**; the Dashboard is an **overview of all departments** for every signed-in user; JPY only; desktop only (≥ 1280px); EN first, JA later.

---

## 1. App shell (wraps every page after login)

```text
┌──────────────┬──────────────────────────────────────────────────────────┐
│ Sidebar      │ Header:  [☰]  Breadcrumb                          [User ▾]  │
│ (collapsible)├──────────────────────────────────────────────────────────┤
│              │ Page title (h1)                       [primary action]    │
│  menu groups │                                                           │
│              │ Page content                                              │
└──────────────┴──────────────────────────────────────────────────────────┘
```

### 1.1 Sidebar

| Item | Spec |
|---|---|
| Width | Expanded **280px**, collapsed **64px** (icons only). Fixed, full height, own scroll if the menu is long |
| Top | Factory icon + "Kanou ERP" (name hides when collapsed) |
| Toggle | Button in the header (☰ icon) with `aria-label` "Collapse / Expand menu", `aria-expanded`; keyboard shortcut `Ctrl/Cmd + B` |
| Memory | Open/closed state saved per browser in `localStorage` key `kanou.sidebar` (default: expanded) |
| Item size | Height 48px, label 16px, icon 22px. Collapsed: icon only, the label shows as a **tooltip** on hover and on keyboard focus |
| Active page | Highlighted (soft blue background, primary text, left bar). The group that contains the current page is open |
| Groups | Collapsible sections. Collapsed sidebar shows one icon per group; clicking opens that group's first page |
| Visibility | A group is **not listed at all** if the user has no role in that department. **Admin** sees everything. Dashboard is always listed |
| Menu for unbuilt pages | See open question Q1 |

Menu (order, icon, pages). Permission = department the user must belong to (Admin always passes):

| Group | Icon (lucide) | Pages (route) | Permission |
|---|---|---|---|
| Dashboard | `LayoutDashboard` | Dashboard `/` | everyone |
| Sale | `Handshake` | Quotations `/sale/quotations` · Customer POs `/sale/customer-pos` · Sale Orders `/sale/orders` · Delivery Notes `/sale/deliveries` | Sale |
| Factory | `Factory` | Work Orders `/factory/work-orders` · Production tracking `/factory/tracking` · Finished goods transfer `/factory/transfers` | Factory |
| Stock | `Warehouse` | Stock overview `/stock` · Stock movements `/stock/movements` · Stock adjustment `/stock/adjustments/new` | Stock (see Q5) |
| Purchase | `ShoppingCart` | Stock status board `/purchase/stock-status` · Purchase Orders `/purchase/orders` · Goods receipt `/purchase/receipts` | Purchase |
| Accounting | `Landmark` | Customer invoices · Customer receipts · Supplier bills · Supplier payments · Journal entries · Accounting master (`/accounting/...`) | Accounting |
| Traceability | `ScanSearch` | Product trace `/trace` | any department |
| Master Data | `Database` | Customers · Suppliers · Products · Materials · Warehouses · Machines · Employees · Units · Price lists (`/master/...`) | Admin (see Q4) |
| Administration | `ShieldCheck` | Users `/admin/users` · Departments and roles `/admin/roles` | Admin |

### 1.2 Header

| Part | Spec |
|---|---|
| Sidebar toggle | Left, text-free icon button with `aria-label` |
| Breadcrumb | `Dashboard / Sale / Quotations / QT-0012`. Last item is plain text (current page); earlier items are links. Built from route metadata, translated |
| Language | **Not in the header.** Two small rectangular flags (UK = English, Japan = 日本語) inside the user menu; the name is the accessible name and the tooltip. The login screen keeps the two flags beside the logo |
| User menu | **Avatar with initials only** (no name, no arrow; the name is the tooltip and the accessible name); opens a dropdown: name, e-mail, list of `Department · Role` (e.g. "Sale · Manager"), **language flags**, **Profile** (A6, disabled until built), **Log out** (red) |
| Height | 64px, white background, bottom border. The login screen's transparent navbar is unchanged |

### 1.3 Content area
Background `#F4F6F9`, padding 32px, max content width 1600px, centered on wider screens. One `h1` per page. Skip-to-content link stays (already built).

---

## 2. Dashboard (D1) — route `/`

Purpose: in one screen, show what needs attention across the whole factory, and jump to the right page.

The page title is not shown (see section 8). There is **no Refresh button and no "Live / Updated" indicator**: the page updates itself silently.

### 2.1 Blocks, top to bottom

| # | Block | What it shows | Source docs |
|---|---|---|---|
| 1 | **KPI cards** (8, two per department group) | See table 2.2 | Sale, Factory, Stock/Purchase, Accounting requirements |
| 2 | **Waiting for approval** | Documents awaiting an approval the user may give. Manager: own department(s); Admin: all. **Workers do not see this block** (replaced by block 2b) | `user_account_req.md` |
| 2b | **My recent documents** (Workers only) | Last 5 documents the user created or edited: type, number, status, time | – |
| 3 | **Material stock alerts** | Top 5 materials in Shortage or Near shortage: material, on hand, reorder point, status badge. Link "View stock status board" | `aditional_req.md` #2 |
| 4 | **Production in progress** | Up to 5 Work Orders in process: WO no., product, qty, progress bar (steps done / total), plan finish date, "Late" badge when past the plan date | `Factory_req.md` |
| 5 | **Recent activity** | Last 8 events across departments: time, document (type + number), action, who | – |
| 6 | ~~Quick actions~~ | **Removed** (decision after review): the Dashboard has no "New …" buttons; users create documents from each page | – |

Layout (≥ 1280px; the page title is not shown, see section 8): KPI cards in a 4-column grid (2 rows). Blocks 2 and 3 side by side (50/50); blocks 4 and 5 side by side; quick actions as a row of buttons under the page title area on the right.

### 2.2 KPI cards

Each card: label, big number (or JPY amount), one line of context, and an arrow link to the filtered list. If the user has no access to the target page the card is shown **without a link** (overview stays visible, see Q4/Q6).

| Group | Card | Value | Context line | Opens |
|---|---|---|---|---|
| Sale | Open Sale Orders | count of SO in Confirmed / In Production / Ready to Deliver | "{n} ready to deliver" | S5 filtered |
| Sale | Quotations waiting | count of QT in Sent | "oldest {d} days" | S1 filtered |
| Factory | Work Orders in process | count of WO in In Process | "{n} scheduled" | F1 filtered |
| Factory | Late Work Orders | WO not finished with plan finish < today | "plan finish passed" | F1 filtered |
| Stock / Purchase | Materials in shortage | count with qty ≤ reorder point | "{n} near shortage" | P1 |
| Stock / Purchase | POs waiting for goods | count of PO Approved but not fully received | "next due {date}" | P2 filtered |
| Accounting | Overdue invoices | JPY total + count | "{n} invoices" | C1 filtered |
| Accounting | Unpaid supplier bills | JPY total + count | "due within 7 days: {n}" | C3 filtered |

Status colors: numbers that signal a problem (shortage, late, overdue) use the danger color **plus** an icon and text — never color alone.

### 2.3 States (every block)

| State | Behavior |
|---|---|
| Loading | Skeleton placeholders with the final size (no layout jump) |
| Empty | Friendly one-liner, e.g. "Nothing is waiting for your approval." |
| Error | Block-level message "Could not load this section" with a **Try again** button; other blocks keep working |
| No access | Block hidden (approvals, quick actions) or KPI shown without link (see above) |

### 2.4 Behavior
- **Real time:** data loads when the page opens, then **every 15 seconds while the browser tab is visible**, and immediately when the tab becomes visible again. Updates are silent (no skeleton, no flicker); numbers just change. If an update fails, the last data stays on screen with "Could not refresh. Showing the data from hh:mm." until a later update succeeds. No polling while the tab is hidden.
- Dates follow the language (`2026-10-01` EN, `2026年10月1日` JA); money is `¥1,234,000` via `Intl.NumberFormat(locale, { style: "currency", currency: "JPY" })`.
- All text goes through i18n (`nav`, `dashboard` namespaces); JA values stay empty and fall back to EN.

---

## 3. Data needed (draft, used for the mock and later the API doc)

One request keeps the page fast; blocks fail independently by returning per-block `error` markers.

```jsonc
// GET /dashboard   (proposed)
{
  "generatedAt": "2026-10-02T09:30:00Z",
  "kpis": {
    "openSaleOrders":   { "count": 12, "readyToDeliver": 3 },
    "quotationsWaiting":{ "count": 5,  "oldestDays": 9 },
    "workOrdersInProcess": { "count": 4, "scheduled": 6 },
    "lateWorkOrders":   { "count": 1 },
    "materialsInShortage": { "count": 3, "nearShortage": 2 },
    "poWaitingForGoods":{ "count": 2, "nextDueDate": "2026-10-09" },
    "overdueInvoices":  { "count": 2, "amountJpy": 1850000 },
    "unpaidSupplierBills": { "count": 3, "amountJpy": 920000, "dueWithin7Days": 1 }
  },
  "approvals": [ { "type": "SO", "id": 31, "number": "SO-0031", "party": "ABC Appliance Store", "amountJpy": 7000000, "createdAt": "…", "department": "Sale" } ],
  "stockAlerts": [ { "materialId": 1, "code": "COMP", "name": "Compressor", "qtyOnHand": 40, "reorderPoint": 50, "uom": "pcs", "status": "SHORTAGE" } ],
  "production": [ { "woId": 5, "number": "WO-0005", "product": "RF-2D", "qty": 10, "stepsDone": 2, "stepsTotal": 4, "planFinish": "2026-10-05", "late": false } ],
  "activity": [ { "at": "…", "type": "INVOICE", "number": "INV-0041", "action": "Issued", "user": "Alice Sato" } ]
}
```

Visibility of `approvals` and `quick actions` is decided by the backend from the user's roles; the frontend also hides them.

---

## 4. Components and files

Already installed: `sidebar`, `breadcrumb`, `dropdown-menu`, `avatar`, `tooltip`, `collapsible`, `scroll-area`, `badge`, `card`, `button`, `skeleton`.
Still to install: `table`, `progress`.

| Piece | File (planned) |
|---|---|
| Menu definition (routes, icons, permission) | `src/config/navigation.js` |
| Sidebar | `src/components/layout/AppSidebar.jsx` |
| Header (toggle, breadcrumb, language, user menu) | `src/components/layout/AppHeader.jsx`, `Breadcrumbs.jsx`, `UserMenu.jsx` |
| Shell | update `src/layouts/MainLayout.jsx` |
| Dashboard | `src/pages/dashboard/DashboardPage.jsx` + block components (`KpiCard`, `ApprovalList`, `StockAlerts`, `ProductionList`, `ActivityList`, `QuickActions`) |
| Data | `src/services/dashboard.service.js`, `src/hooks/useDashboard.js`, mock handler for `GET /dashboard` |
| Shared | `StatusBadge`, `formatCurrency` / `formatDate` in `src/utils/format.js` |
| i18n | `src/i18n/locales/{en,ja}/nav.json` (extend), `dashboard.json` |

shadcn defaults are enlarged for our users (18px root, 48px items). Sidebar default width `16rem` is replaced by 280px / 64px.

## 5. Accessibility checklist
- Landmarks: `header`, `nav aria-label="Main"`, a **single** `main` (shadcn `SidebarInset` was changed from `<main>` to `<div>` to avoid a nested second `main`); one `h1`
- Sidebar toggle has `aria-expanded`; collapsed items have tooltips for mouse **and** keyboard focus
- Active menu item uses `aria-current="page"`
- Badges and KPI warnings use text + icon, not color only
- Tables have headers; progress bars have `aria-valuenow` and a text value
- All controls ≥ 44px; contrast ≥ 4.5:1; usable at 200% zoom

## 6. Test cases (to run before commit)
Admin, Manager (Sale + Purchase Worker), Worker (Factory) each see the right menu groups and blocks; collapse and reload keeps the state; Workers see no approvals block; user without a department sees only Dashboard (+ Traceability if allowed); KPI card without access has no link; each block's loading, empty, error state; EN ↔ JA switch; breadcrumb on a deep route; keyboard-only use of sidebar, header and user menu; no horizontal scroll at 1280px.

---

## 7. Open questions (need your decision)

| # | Question | Suggested answer |
|---|---|---|
| Q1 | Menu entries for pages not built yet | Show them all; the page opens a "Page under construction" placeholder inside the shell, so the whole navigation can be demonstrated |
| Q2 | Which documents count as "waiting for approval" | QT/SO (Draft), WO (Draft), PO (Draft), Invoice (Draft), Supplier bill (Draft) — from "Manager approves QT/SO, WO, PO, Invoice" |
| Q3 | Definitions: "late" WO, "overdue" invoice | Late = plan finish date < today and not Finished; overdue = due date < today and not Paid |
| Q4 | Do Workers see money amounts and KPI numbers of other departments? | Yes, it is an overview (your decision: all departments), but without links to pages they cannot open. Needs confirmation from the business side |
| Q5 | "Stock" is not a department in `user_account_req.md` (only Sale, Factory, Purchase, Accounting) | Show the Stock group to users in Factory or Purchase (and Admin) |
| Q6 | Master Data access | Admin edits; other roles read-only inside their own department's pages (requirement is silent — please confirm) |
| Q7 | Refresh | **Decided:** no button; real-time updates by polling every 15 s while the tab is visible (replace with SSE / WebSocket when the backend offers it) |

---

## 8. Differences between this spec and what was built

| Spec | Built | Why |
|---|---|---|
| Quick actions in the page-title row | A row of buttons **under** the title | At 1280px the title row cannot hold four buttons plus Refresh |
| Stock alerts: separate "on hand" and "reorder point" columns | One column "On hand / reorder point" (e.g. 40 / 50 pcs) | The two-column layout made the table scroll sideways at 1280px |
| Money in JA | Fullwidth yen sign (￥1,850,000) | That is what the browser produces for the ja-JP locale |
| Stock group visible to Factory and Purchase (Q5) | Same | Suggested answer taken |
| Master Data menu for Admin only (Q6) | Same | Suggested answer taken |
| Quick actions block (6) | **Removed** | Decision after review: the Dashboard must not have "add" buttons |
| Page title (h1) shown at the top of each page | **Not shown visually**; kept as a screen-reader-only h1 | The breadcrumb already says where the user is. Applies to every page through `PageHeader` |
| Logo badge in the collapsed sidebar | Centered, no side padding when collapsed | It was clipped by the 64px width |
| Language switch as EN / 日本語 text buttons in the header | Small rectangular **flags** in the user menu (and on the login screen) | Decision after review: keeps the header clean. Flags are SVG because flag emoji do not render on Windows |
| Refresh button + update after 5 minutes (Q7) | **No Refresh button.** Self-updating every 15 s while the tab is visible; nothing is shown about it (no button, no "Live" label, no time) | Decision after review: the Dashboard must update in real time |
