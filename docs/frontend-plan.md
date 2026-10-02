# Kanou ERP — Frontend Plan

Status: **PLAN (not yet implemented)** · Progress tracker: [pages-progress.md](pages-progress.md)

Source requirements: `BaseRequirement_md/` (Sale, Factory, Accounting, master_data, user_account, aditional, stack).
`Purchase_req.md` and `Sotck_req.md` are empty, so Stock / Purchase pages below are inferred from `master_data_req.md` and `aditional_req.md` and must be confirmed.

---

## 1. Principles

| Topic | Decision |
|---|---|
| Users | Japanese office staff, mostly 40–50+ → readability and predictability beat visual flair |
| Language | i18n with **EN (primary)** and **JA** (keys created now, values filled later; JA falls back to EN) |
| Theme | Primary `#003577`, surface `#FFFFFF`. Contrast of `#003577` on white ≈ **11.8:1** (passes WCAG AAA) |
| Accessibility target | WCAG 2.1 AA minimum |
| Look and feel | Structured ERP: top bar + left sidebar by department + breadcrumb + page title + content |
| Stack | React 19, Vite, react-router, Axios, shadcn/ui (Tailwind), react-i18next, Zod (forms) |
| Language of code | JavaScript / JSX only (per stack spec) |

### Usability rules for 40–50+ users
1. Base font **18px**, tables 16px minimum, never below 14px anywhere.
2. Controls at least **48px** high (WCAG minimum is 44px).
3. **Text labels on every button** and menu item. Icons only as decoration next to text.
4. Status shown with **text + icon + color** (never color alone).
5. One primary action per screen, in the same position (top-right of the page header).
6. Confirm dialogs for destructive or irreversible actions (Cancel SO, Confirm, Approve) that state exactly what will happen.
7. Errors appear next to the field in plain language, plus a summary at the top of the form.
8. Visible focus ring (3px), full keyboard operation, no hover-only information.
9. Predictable lists: search box + filters on top, table, pagination at the bottom, same on every list page.
10. Date format by locale (EN `2026-10-01`, JA `2026年10月1日`); numbers with thousands separators; currency shown explicitly.
11. Language switcher always visible in the header, choice persisted.
12. Layout must survive 200% zoom; min width 1280px is the design target (office desktops), tablet works, phone is out of scope.

### Design tokens (defined once in `src/index.css`)

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#003577` | Header, primary buttons, links, focus ring |
| `--color-primary-hover` | `#00285A` | Hover / pressed |
| `--color-primary-soft` | `#E6EDF6` | Selected row, active menu background |
| `--color-surface` | `#FFFFFF` | Cards, tables, forms |
| `--color-page` | `#F4F6F9` | App background |
| `--color-text` | `#1A2230` | Body text |
| `--color-text-muted` | `#4A5568` | Secondary text (≥ 7:1 on white) |
| `--color-border` | `#C5CEDA` | Inputs, tables |
| `--color-success` / `warning` / `danger` | `#1B6E3C` / `#8A5A00` / `#B42318` | Status only, always with text |

Spacing scale 4/8/12/16/24/32; radius 6px; one shadow level for cards and dialogs.

---

## 2. Navigation map

Sidebar groups follow departments in `user_account_req.md`. Menu items are shown only if the user has a role in that department (Admin sees all).

```text
Dashboard
Sale            Quotations · Customer POs · Sale Orders · Delivery Notes
Factory         Work Orders · Production Tracking · Finished Goods Transfer
Stock           Stock Overview · Stock Movements · Stock Adjustment
Purchase        Stock Status (shortage) · Purchase Orders · Goods Receipts
Accounting      Customer Invoices · Receipts · Supplier Bills · Payments · Journal Entries
Traceability    Product Trace
Master Data     Customers · Suppliers · Products · Materials · BOM · Warehouses · Machines · Employees · UoM
Administration  Users · Departments & Roles
```

Header: logo/system name · current page title area · language switcher (EN / 日本語) · user menu (name, department/role, Profile, Log out).

### Standard page templates (reuse everywhere)

| Template | Layout | Used by |
|---|---|---|
| **List page** | Breadcrumb → title + primary action → search + filters → table → pagination | every list |
| **Detail page** | Breadcrumb → title + status badge + action buttons → summary card → line items → history / related documents | QT, SO, WO, DN, PO, Invoice … |
| **Form page** | Breadcrumb → title → sectioned form → sticky footer (Save / Cancel) | create / edit |
| **Dashboard** | KPI cards → shortcut cards → alert lists | Dashboard |
| **Message page** | Centered card, one action | 403, 404, 500 |

---

## 3. Page inventory

Priority: **P0** = build first, **P1** = core flow, **P2** = later. Sources are the requirement files.

### 3.1 Authentication & shell

| # | Page | Route | Pri | Content / information shown |
|---|---|---|---|---|
| A1 | **Login** | `/login` | P0 | System name and logo, language switcher, Email field, Password field with show/hide text button, Log in button, inline error ("Email or password is incorrect"), disabled-account message, loading state. No self-registration. |
| ~~A2~~ | ~~Forgot password~~ | – | – | **Removed**: factory system, Admin resets passwords |
| A3 | Forbidden | `/403` | P0 | "You do not have permission", button back to Dashboard |
| A4 | Not found | `*` | P0 | "Page not found", link to Dashboard |
| A5 | Server error | `/500` | P2 | Generic error, retry |
| A6 | My profile | `/profile` | P2 | Name, email, department + role list (read-only), language preference, change password |

### 3.2 Dashboard

| # | Page | Route | Pri | Content |
|---|---|---|---|---|
| D1 | **Dashboard** | `/` | P0 | Greeting + role; KPI cards: open SOs, active WOs, overdue invoices, shortage materials; shortcut cards by department; "Needs my approval" list (Managers); shortage / near-shortage mini table; recent documents. Cards depend on role. |

### 3.3 Sale (`Sale_req.md`, `aditional_req.md`)

| # | Page | Route | Pri | Content |
|---|---|---|---|---|
| S1 | Quotation list | `/sale/quotations` | P1 | QT No., date, customer, sales person, total, status (Draft / Sent / Accepted / Rejected / Expired). Filters: status, customer, date range |
| S2 | Quotation form | `/sale/quotations/new`, `/:id/edit` | P1 | Customer, date, sales person, valid-until; line grid (product, qty, unit price, amount); totals; **Check material availability** panel (explodes BOM, shows Can produce Yes/No + shortfall list) |
| S3 | Quotation detail | `/sale/quotations/:id` | P1 | Header info, lines, status history, actions: Send, Mark accepted / rejected, Create SO |
| S4 | Customer PO list/form | `/sale/customer-pos` | P1 | Customer PO No., PO date, customer, attached file, linked QT / SO |
| S5 | Sale Order list | `/sale/orders` | P1 | SO No., date, customer, ref QT, ref customer PO, total, status (Draft → Confirmed → In Production → Ready to Deliver → Delivered → Closed / Cancelled) |
| S6 | Sale Order form | `/sale/orders/new` | P1 | Customer, ref QT, ref customer PO, lines, availability check, delivery date |
| S7 | Sale Order detail | `/sale/orders/:id` | P1 | Info, lines, linked WO(s), DN(s), Invoice(s) as a related-documents timeline, actions: Confirm, Send to Factory, Cancel |
| S8 | Delivery Note list / detail | `/sale/deliveries` | P1 | DN No., date, SO ref, customer, lines delivered, status (Draft → Delivered), action: Confirm delivery |

### 3.4 Factory (`Factory_req.md`)

| # | Page | Route | Pri | Content |
|---|---|---|---|---|
| F1 | Work Order list | `/factory/work-orders` | P1 | WO No., SO ref, product, qty, plan start / finish, status (Draft / Scheduled / In Process / Finished / Cancelled) |
| F2 | Work Order form | `/factory/work-orders/new` | P1 | Pick SO line, product, qty, plan start / finish; read-only BOM requirement and material availability |
| F3 | Work Order detail | `/factory/work-orders/:id` | P1 | Info, routing steps with progress bar, materials required vs available, production tracking table, actions: Schedule, Start, Finish |
| F4 | Production tracking | `/factory/tracking` | P1 | Per WO step: machine, operator, start / end time, qty completed, qty defect, status (Pending / In Progress / Done). Large Start / Done buttons for shop-floor use |
| F5 | Finished Goods Transfer | `/factory/transfers` | P1 | Transfer No., WO ref, product, qty, to warehouse, status (Draft → Transferred) |

### 3.5 Stock (inferred)

| # | Page | Route | Pri | Content |
|---|---|---|---|---|
| T1 | Stock overview | `/stock` | P1 | Tabs Materials / Products; code, name, warehouse, qty on hand, UoM, reorder point, status badge |
| T2 | Stock movements | `/stock/movements` | P2 | Date, item, warehouse, type (receipt / consume / produce / deliver / adjust), qty, reference document |
| T3 | Stock adjustment | `/stock/adjustments/new` | P2 | Item, warehouse, new qty, reason (required), Manager approval |

### 3.6 Purchase (inferred + `aditional_req.md`)

| # | Page | Route | Pri | Content |
|---|---|---|---|---|
| P1 | **Stock status board** | `/purchase/stock-status` | P1 | Material, qty on hand, reorder point, status (Shortage ≤ RP / Near shortage ≤ 1.2×RP / Normal), suggested supplier + price + lead time (from SupplierMaterial), button Create PO |
| P2 | PO list | `/purchase/orders` | P1 | PO No., date, supplier, total, status (Draft / Approved / Received / Closed / Cancelled) |
| P3 | PO form | `/purchase/orders/new` | P1 | Supplier, lines (material, qty, unit price), supplier price hints, total |
| P4 | PO detail | `/purchase/orders/:id` | P1 | Info, lines, receipt status, linked bill, actions: Approve, Receive goods |
| P5 | Goods receipt | `/purchase/receipts` | P2 | PO ref, received qty per line, warehouse, lot no. |

### 3.7 Accounting (`Accounting_req.md`)

| # | Page | Route | Pri | Content |
|---|---|---|---|---|
| C1 | Customer invoice list / detail / form | `/accounting/invoices` | P2 | Invoice No., customer, ref SO / DN, amount, tax, paid, balance, status (Draft / Issued / Partially Paid / Paid / Overdue / Cancelled) |
| C2 | Customer receipts | `/accounting/receipts` | P2 | Receipt No., customer, invoice ref, amount, method, bank account |
| C3 | Supplier bills | `/accounting/bills` | P2 | Bill No., supplier, ref PO, amount, status |
| C4 | Supplier payments | `/accounting/payments` | P2 | Payment No., supplier, bill ref, amount, method |
| C5 | Journal entries | `/accounting/journal` | P2 | JE No., date, ref document, account, debit, credit; balanced-entry check |
| C6 | Accounting master | `/accounting/master/*` | P2 | Chart of accounts, tax rates, payment methods, bank accounts |

### 3.8 Traceability (`aditional_req.md`)

| # | Page | Route | Pri | Content |
|---|---|---|---|---|
| R1 | Product trace | `/trace` | P2 | Search by product ID / batch; vertical timeline: WO → materials consumed (lot) → production steps (operator, machine) → FG transfer → SO / DN (customer) → Invoice |

### 3.9 Master data (`master_data_req.md`)

All use the **List + Form** templates. Delete is replaced by **Deactivate** where records are referenced.

| # | Page | Route | Pri | Key fields |
|---|---|---|---|---|
| M1 | Customers | `/master/customers` | P1 | Code, name, address, tax ID, contact, payment terms, credit limit |
| M2 | Suppliers | `/master/suppliers` | P1 | Code, name, address, tax ID, contact, payment terms; tab "Materials supplied" (price, lead time) |
| M3 | Products | `/master/products` | P1 | Code, name, UoM, price, category; tab BOM; tab Routing |
| M4 | Materials | `/master/materials` | P1 | Code, name, UoM, reorder point, reorder qty; tab Suppliers |
| M5 | BOM editor | inside Product | P1 | Material, qty per unit, UoM |
| M6 | Warehouses | `/master/warehouses` | P1 | Code, name, type (raw material / finished goods) |
| M7 | Machines / Lines | `/master/machines` | P2 | Code, name, capacity per day |
| M8 | Employees | `/master/employees` | P2 | Code, name, position |
| M9 | Units of measure | `/master/uom` | P2 | Code, name |
| M10 | Price lists | `/master/price-lists` | P2 | Product price per customer / group |

### 3.10 Administration (`user_account_req.md`)

| # | Page | Route | Pri | Content |
|---|---|---|---|---|
| U1 | Users | `/admin/users` | P1 | Name, email, status (active / inactive), assignments summary |
| U2 | User form | `/admin/users/:id` | P1 | Name, email, password (create / reset), status; **Department & Role table** (rows of department + role, add / remove) |
| U3 | Departments & roles | `/admin/roles` | P2 | Read-only matrix: Admin / Manager / Worker × permissions |

**Totals:** ~55 screens including variants (list / form / detail). Build order is in section 6.

---

## 4. Login page specification (first deliverable)

Layout (desktop): two columns. Left 40%: `#003577` panel with system name "Kanou ERP", one-line tagline, no decoration that carries meaning. Right 60%: white card, max-width 440px, vertically centered. On narrow widths the left panel collapses to a top banner.

| Element | Spec |
|---|---|
| Language switcher | Top-right, text buttons `English` / `日本語` (JA labels already real; strings otherwise EN) |
| Heading | `Log in` (key `auth.login.title`) |
| Email | Visible label above field, `type=email`, `autocomplete=username`, 48px height |
| Password | Visible label, `autocomplete=current-password`, **Show password** text button (not icon only) |
| Submit | Full-width primary button `Log in`; loading state `Logging in…` and disabled to prevent double submit |
| Errors | Field-level (required, invalid email) + form-level alert with `role="alert"` for server errors |
| Links | `Forgot your password?` (P2, hidden until implemented) |
| Keyboard | Tab order: language → email → password → show → submit; Enter submits |
| After success | Store token, fetch `/auth/me`, redirect to `/` (or the originally requested route) |

Server error mapping (from API `error` code): `INVALID_CREDENTIALS`, `ACCOUNT_INACTIVE`, `NETWORK_ERROR`, `INTERNAL_SERVER_ERROR`, each with its own EN message key.

---

## 5. Frontend architecture

Keeps the folder layout from `kanou_base_demo_stack.md` and adds i18n, routing and UI primitives.

```text
frontend/src/
├── main.jsx                  # providers: Router, i18n, Auth
├── App.jsx                   # <AppRoutes />
├── routes/
│   ├── index.jsx             # route table
│   ├── ProtectedRoute.jsx    # requires login
│   └── RequirePermission.jsx # department / role guard
├── layouts/
│   ├── AuthLayout.jsx        # login, forgot password
│   └── MainLayout.jsx        # header + sidebar + breadcrumb + <Outlet/>
├── pages/                    # one folder per module (auth, dashboard, sale, factory, ...)
├── components/
│   ├── ui/                   # shadcn/ui primitives (Button, Input, Dialog, Table ...)
│   └── common/               # PageHeader, DataTable, StatusBadge, FormField, ConfirmDialog, EmptyState
├── hooks/                    # useAuth, usePermission, useList ...
├── services/
│   ├── api.js                # axios instance + interceptors
│   ├── auth.service.js       # login, me, logout
│   └── <module>.service.js
├── i18n/
│   ├── index.js              # i18next init (fallback: en)
│   └── locales/
│       ├── en/{common,auth,nav,dashboard,...}.json
│       └── ja/{...}.json     # same keys, values empty → falls back to EN
└── utils/                    # format date / number / currency, permission helpers
```

### i18n rules
- Library: `i18next` + `react-i18next`, namespaces per module, `fallbackLng: "en"`.
- **No hard-coded UI strings** in components; every string is a key (`auth.login.title`).
- JA files are created with the same keys; empty values fall back to EN, so JA can be filled in later without code changes.
- Language stored in `localStorage`, `<html lang>` updated on change.
- Dates / numbers through `Intl` using the active locale.
- Status labels are keys too (`status.so.confirmed`), so badges translate automatically.

### API structure (prepared before backend exists)

Contract follows the stack spec: base URL `VITE_API_URL` (default `http://localhost:3000/api`), JSON, envelope `{ success, data, message }` / `{ success:false, message, error }`.

| Concern | Plan |
|---|---|
| Axios instance | `services/api.js`: base URL, JSON headers, request interceptor adds `Authorization: Bearer <token>`, response interceptor unwraps `data`, maps errors to `{ code, message }`, on 401 clears session and redirects to `/login` |
| Services | One file per module, pure functions returning data (React never calls Axios directly) |
| Hooks | `useXxx` wrap services (loading / error / data), pages use hooks only |
| Mock mode | `VITE_USE_MOCK=true` swaps services for local mock data so pages can be built and demoed before the backend exists. Mocks live in `services/mock/` and return the same envelope |
| List query convention | `GET /resource?page=1&pageSize=20&search=&status=&sort=-createdAt` → `{ data: [...], meta: { page, pageSize, total } }` |
| Document status change | `POST /resource/:id/actions/{confirm,cancel,approve...}` (explicit actions, not free status edits) |

Endpoints needed for the Login milestone:

```text
POST /api/auth/login    { email, password } → { token, user }
GET  /api/auth/me       → { id, name, email, memberships:[{department, role}] }
POST /api/auth/logout
```

Permission model on the client mirrors `user_account_req.md`: `memberships[]` of `{department, role}`; helpers `isAdmin()`, `canView(dept)`, `canApprove(dept)`. The client hides UI only; the **backend enforces** permissions.

---

## 6. Delivery plan

| Step | Scope | Deliverable |
|---|---|---|
| **F0 Foundation** | Tailwind + shadcn/ui init, tokens, i18n setup (EN + empty JA), router, `api.js`, mock switch, base layouts (`AuthLayout`, `MainLayout` skeleton), common components (`PageHeader`, `StatusBadge`, `FormField`, `ConfirmDialog`) | App shell runs, language switch works |
| **F1 Login** | A1 + A3 + A4, `auth.service`, `useAuth`, protected routes, mock auth | Login works end-to-end against mock |
| F2 App shell | Sidebar by permission, header, breadcrumb, profile menu, D1 Dashboard with mock KPIs | Navigable ERP frame |
| F3 Master data | M1–M6 | CRUD pattern proven, reused afterward |
| F4 Admin | U1–U2 | User + department/role assignment |
| F5 Stock + Purchase | T1, P1–P4 | Shortage board, PO flow |
| F6 Sale | S1–S8 (with availability check) | QT → SO → DN |
| F7 Factory | F1–F5 | WO → tracking → transfer |
| F8 Accounting + Trace | C1–C6, R1 | Invoice / bill / GL, product trace |
| F9 JA translation | Fill `ja/*.json`, test layout with longer JA text | Full JA |

Each step ends with: pages built, `pnpm lint` and `pnpm build` clean, a keyboard + contrast check against the checklist below, and [pages-progress.md](pages-progress.md) updated.

### Accessibility checklist per page
- [ ] Contrast ≥ 4.5:1 text, ≥ 3:1 controls
- [ ] Every input has a visible label and an error message tied via `aria-describedby`
- [ ] Fully usable with keyboard only, visible focus
- [ ] Controls ≥ 44px (design target 48px)
- [ ] Status not conveyed by color alone
- [ ] Landmarks (`header`, `nav`, `main`), one `h1` per page, `lang` attribute correct
- [ ] Works at 200% zoom

---

## 7. Decisions

- UI kit: **shadcn/ui + Tailwind** approved.
- No "Forgot password" page; Admin resets passwords (Users page, U2).
- Currency: **JPY only**, 0 decimals, format with `Intl.NumberFormat(locale, { style: "currency", currency: "JPY" })`.
- Layout: **desktop only** (design target ≥ 1280px); no mobile / tablet work for now.

## 8. Open questions (remaining)

1. Confirm the empty Stock / Purchase flows (goods receipt? who approves PO? stock adjustment approval?).
2. Auth: JWT in `Authorization` header (assumed) vs httpOnly cookie? Affects `api.js` and CORS.
3. Currency and tax: single currency (JPY?) and consumption tax 10 % / 8 %? Affects every amount column.
4. Login: is "Forgot password" required in the first release, or does an Admin reset passwords?
5. Display language of document numbers and master codes: keep as entered (assumed).
6. Is a phone / tablet layout needed, or desktop only (assumed)?
7. Approve using shadcn/ui + Tailwind (they were mentioned for the Login page) — not in the stack spec, which only lists React + Vite.
