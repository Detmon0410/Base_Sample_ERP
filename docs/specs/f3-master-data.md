# F3 Spec — Master Data (M1–M10)

Status: **APPROVED with the suggested answers (Q1–Q10). Pattern + M1 Customers + M9 UoM + M6 Warehouses + M7 Machines + M8 Employees + M4 Materials + M2 Suppliers (with supplier–material links) + M3 Products (BOM = M5, Routing) BUILT; only M10 Price lists is not built yet** · Plan: [../frontend-plan.md](../frontend-plan.md) · Data source: `BaseRequirement_md/master_data_req.md` (+ `Sale_req.md`, `Factory_req.md`)
After approval: build the shared list/form pattern with mock data, then write `docs/api/master-data.md` for the backend.

Why now: Sale, Factory, Stock, Purchase and Accounting all pick customers, suppliers, products, materials, BOM, warehouses and machines from these lists. The same screens (list, form, deactivate) are also the pattern for every later module.

Carried-over decisions: JPY only · desktop only (≥ 1280px) · EN first · page title not shown (breadcrumb only) · deactivate instead of delete · approvals follow `user_account_req.md`.

---

## 1. Scope

| ID | Page | Route | Pri | Notes |
|---|---|---|---|---|
| M1 | Customers | `/master/customers` | P1 | **Built first** — proves the pattern |
| M2 | Suppliers | `/master/suppliers` | P1 | tab "Materials supplied" |
| M3 | Products | `/master/products` | P1 | tabs BOM and Routing |
| M4 | Materials | `/master/materials` | P1 | tab Suppliers |
| M5 | BOM editor | inside a Product | P1 | not a menu item |
| M6 | Warehouses | `/master/warehouses` | P1 | |
| M7 | Machines / lines | `/master/machines` | P2 | |
| M8 | Employees | `/master/employees` | P2 | |
| M9 | Units of measure | `/master/uom` | P2 | needed early by M3/M4 selects — build with M6 |
| M10 | Price lists | `/master/price-lists` | P2 | see Q5 |

Build order: **shared pattern + M1 → M9 → M6 → M4 → M2 → M3 (+M5, routing) → M7 → M8 → M10.**

---

## 2. The shared pattern (used by every page above)

### 2.1 List page (`/master/<entity>`)

```text
Breadcrumb (header)
[ Search box: code or name ]  [ Status: All / Active / Inactive ]                [ + New <entity> ]
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Code ▲ │ Name │ (2–3 key columns per entity) │ Status │                                       │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ rows (click a row to open it)                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
                                          Showing 1–20 of 134      [ < ]  1 2 3 …  [ > ]
```

| Part | Spec |
|---|---|
| Search | One box, matches code and name, runs 300 ms after typing stops; search text and filters are kept in the URL (`?q=&status=&page=`) so Back/forward and reload keep them |
| Sort | Click a column header (Code default ascending); arrow shows direction |
| Paging | Server-side, 20 per page; shows range and total |
| Row | Whole row opens the form page; a text "Edit" link in the last column for keyboard users |
| Status | Badge **Active** (success) / **Inactive** (neutral), text + icon |
| Empty | "No customers yet." + the New button; with filters: "No result. Clear the filters." |
| Loading / error | Skeleton rows; error card with **Try again** |
| Create button | Right of the filters, label "New customer" etc. Shown only to users who may edit (Q6) |

### 2.2 Form page (`/master/<entity>/new`, `/master/<entity>/:id`)

| Part | Spec |
|---|---|
| Layout | Card with sections (e.g. "Basic", "Billing", "Contact"); one column of labelled fields, two columns for short pairs; same field sizes as the login form (45px) |
| Buttons | Footer bar: **Save** (primary) and **Cancel**. For an existing record also **Deactivate** / **Reactivate** (opens a confirm dialog that says what will happen) |
| Validation | Zod, messages under the field in plain language; summary on top after a failed save; unsaved changes → confirm before leaving |
| Code | Unique per entity; **cannot be changed after creation** (shown read-only) because documents refer to it |
| Result | Success toast "Saved", then back to the list (new) or stay on the page (edit) |
| Not found / no access | 404 / 403 pages |
| Read-only mode | Same page, fields disabled, no Save (for users without edit rights, Q6) |
| Tabs | Used only where a record owns sub-lists (Supplier, Product, Material); the first tab is always the form |

### 2.3 Deactivate, never delete
A record used by any document cannot be deleted without breaking history, so the only removal is **Deactivate**: it disappears from pick-lists in new documents but stays in old ones and in reports. A record that nothing refers to may be deleted by an Admin (confirm dialog) — see Q4.

### 2.4 Shared building blocks to create once

| Piece | File (planned) |
|---|---|
| Data table (sort, paging, row click, states) | `src/components/common/DataTable.jsx` (own component; `@tanstack/react-table` was **not** needed for server-side sort/paging) |
| List page shell (search, filters, table, New) | `src/components/common/ListPage.jsx` |
| Form shell (sections, footer bar, dirty guard) | `src/components/common/FormPage.jsx` |
| Confirm dialog | `src/components/common/ConfirmDialog.jsx` (`alert-dialog`) |
| Searchable select (customers, materials …) | `src/components/common/EntitySelect.jsx` (`command` + `popover`) |
| Money / number inputs (JPY, qty) | `src/components/common/MoneyInput.jsx`, `QtyInput.jsx` |
| Generic CRUD service | `src/services/crud.js` → `list / get / create / update / setActive` per resource |
| URL-synced list state | `src/hooks/useListQuery.js` |
| Mock data store (in memory, survives page changes) | `src/services/mock/masterData.js` |

shadcn components to install: `select`, `dialog`, `alert-dialog`, `tabs`, `checkbox`, `switch`, `textarea`, `popover`, `command`, `pagination`, `label` (have), `form` helpers via `field` (have). npm: `@tanstack/react-table`.

---

## 3. Entities — fields, lists, rules

Common to all: `id`, `code`, `name`, `status` (`active` | `inactive`), created/updated stamps (shown small at the bottom of the form).

### M1 Customer
| Field | Rules |
|---|---|
| Code | required, unique, ≤ 20, e.g. `C001` |
| Name | required, ≤ 100 |
| Tax ID | optional, digits |
| Address | optional, multi-line |
| Contact: person, phone, e-mail | optional; e-mail format checked |
| Payment terms | pick: Net 15 / Net 30 / Net 45 / Net 60 / Cash on delivery (Q3) |
| Credit limit (JPY) | optional, whole yen ≥ 0 |
List columns: Code · Name · Payment terms · Credit limit · Status.

### M2 Supplier
Same fields as Customer without credit limit. **Tab "Materials supplied"** (bridge `SupplierMaterial`): table of Material · Price (JPY) · Lead time (days) with **Add material** (searchable select, price, lead time), edit in place, remove. One material once per supplier. List columns: Code · Name · Payment terms · Materials (count) · Status.

### M3 Product (finished good)
| Field | Rules |
|---|---|
| Code, Name | as above (`RF-2D`, "Refrigerator 2-Door 15Q") |
| Unit of measure | required, from UoM (M9) |
| Selling price (JPY) | optional default price, whole yen ≥ 0 |
| Category | see Q2 |
**Tab BOM (M5):** Material · Qty per unit · UoM (read-only from the material). Add / edit / remove lines; a material only once; qty > 0, up to 3 decimals. **Tab Routing:** ordered steps `Step no · Process name · Machine/line` (add, remove, move up/down; step numbers stay consecutive). List columns: Code · Name · UoM · Price · Status.

### M4 Material
| Field | Rules |
|---|---|
| Code, Name, UoM | required (`COMP`, `STEEL`) |
| Reorder point | qty ≥ 0 — below or at it the material is "Shortage" (`aditional_req.md`) |
| Reorder qty | qty > 0, suggested purchase quantity |
| On hand | **read-only**, from Stock (shown with the warehouse) — never edited here |
**Tab Suppliers:** same bridge as in M2 seen from the material side (price, lead time). **Used in:** read-only list of products whose BOM contains it. List columns: Code · Name · UoM · Reorder point · Status.

### M6 Warehouse
Code, Name, **Type** (Raw material / Finished goods; required). List columns: Code · Name · Type · Status.

### M7 Machine / line
Code, Name, **Capacity per day** (number + unit text, e.g. 200 pcs). List columns: Code · Name · Capacity · Status. A machine used in a routing cannot be deleted (only deactivated).

### M8 Employee
Code, Name, **Position** (free text: Operator, QC Inspector …), optional link to a user account. List columns: Code · Name · Position · Status.

### M9 Unit of measure
Code (`pcs`, `kg`, `m`, `set`), Name. Small table, inline add/edit in a dialog instead of a full page. A UoM that is used cannot be deleted.

### M10 Price list
Product price per customer (or group): Product · Customer/group · Price (JPY) · Valid from/to. Fully defined after Q5.

---

## 4. Permissions (see Q6, Q7)
Master data is maintained by **Admin**. Everyone else needs to *see* it inside their own work (pick-lists in documents), which is separate from the menu. Proposal: the **Master Data menu stays Admin-only (F2)**; other roles only pick records through the searchable selects, with no list page.

## 5. i18n and accessibility
- New namespace `master` (common labels: code, name, status, active, inactive, new, save …) plus one block per entity; JA keys created empty, falling back to EN.
- Every field has a visible label; errors use `aria-describedby`; required fields marked with text "Required", not only an asterisk; table headers are real `<th>`, sortable headers announce `aria-sort`; confirm dialogs trap focus and return it on close; all controls ≥ 44px.

## 6. Mock data (from `master_data_req.md`)
Customers C001 ABC Appliance Store, C002 Best Home Mart · Suppliers S001 CompCo, S002 SteelCo, S003 BackupCo · UoM pcs, kg, m, set · Warehouses WH-R, WH-F · Products RF-2D, RF-1D · Materials COMP, DOOR, FOAM, STEEL (+ SHELF, THERMO) · BOM and SupplierMaterial rows as in the requirement · Machines LN-01…LN-03, QC-01 · Employees E001–E003. Enough extra rows (≈ 30 customers) to test search and paging.

## 7. Test cases (before each commit)
List: search, status filter, sort, paging, URL restored on reload, empty / loading / error. Form: required fields, unique code error, e-mail format, code read-only after creation, dirty-leave guard. Deactivate / reactivate with confirm. Sub-lists: add duplicate material blocked, remove, qty validation, routing reorder. Read-only mode. EN ↔ JA. Keyboard-only create → save → deactivate. 1280px layout without sideways scroll.

---

## 8. Open questions

| # | Question | Suggested answer |
|---|---|---|
| Q1 | Page order / scope of the first delivery | Pattern + M1, then continue in the order above; M10 last |
| Q2 | Product **category**: free text or a master list? | Free text with suggestions from existing values (no extra master) |
| Q3 | **Payment terms**: fixed list or free text? Requirement shows "Net 30 / Net 15" | Fixed list (Net 15/30/45/60, Cash on delivery) kept in one config so it can grow |
| Q4 | May an Admin **delete** a record nothing refers to? | Yes, with confirm; otherwise deactivate only |
| Q5 | **Price list**: what is a "customer group"? Not defined anywhere | Skip groups in v1: price per customer + product + valid dates |
| Q6 | Who edits master data? Requirement is silent beyond "Admin does everything" | Admin only |
| Q7 | Do Managers/Workers need read-only list pages? | No; they only use pick-lists in documents (menu stays Admin-only) |
| Q8 | Code format: free text or generated (C001, C002 …)? | Typed by the user (as in the examples), unique; no auto-numbering in v1 |
| Q9 | Multiple warehouses per type and stock per warehouse | Allowed (data model supports it); stock pages come in the Stock module |
| Q10 | Tax ID format (Japan: 13-digit corporate number, "T"+13 for invoice registration) | Accept digits and an optional leading "T"; no checksum in v1 |

---

## 9. Built so far (differences from the draft)

| Draft | Built | Why |
|---|---|---|
| `@tanstack/react-table` | Not used | Sorting and paging are done by the server; a small own table is enough |
| Install all shadcn components up front | Only `select`, `alert-dialog`, `textarea` so far; others when a page needs them | Less unused code |
| Dirty guard on every way of leaving | Cancel button + browser reload / tab close. **Links in the sidebar are not guarded** | The app uses `BrowserRouter`; blocking in-app navigation needs a data router (`useBlocker`). Revisit if users lose edits |
| Delete / Deactivate on the form | Same, with confirm dialogs; Delete blocked with `IN_USE` for records referenced elsewhere | Q4 |
| 300 ms search delay, URL state | Same (`?q=&status=&sort=&page=`) | |
| Table cell padding / sizes | Edit link, sort buttons and row controls are 45px tall; cells use tighter padding so the table fits 1280px without sideways scroll | 44px target rule |
| Units of measure as a dialog (M9) | Same full list + form pages as the others | One generic page (`pages/master/simple`, config in `config/simpleMaster.js`) serves UoM, Warehouses, Machines and Employees; a dialog would need a second pattern |
| Machine capacity "number + unit text" | Two fields: `capacityPerDay` (whole number) and `capacityUnit` (text) | Easier to sort and validate |
| Employee link to a user account | Not built | Users (U1/U2) do not exist yet |
| Order M9 → M6 → M4 → M2 → M3 → M7 → M8 | M9, M6, M7, M8 done together (flat fields); M4, M2, M3 (+BOM, routing, supplier materials) are next | They need tabs and a searchable select |
| Form as a separate page (`/new`, `/:id`) | Opens as a **sheet on the right** over the list (list stays visible, blurred slightly). Same URLs; the list keeps its search / filter / page in the URL and reloads after save / delete. Close (X, Cancel, Esc) asks first when there are unsaved changes | Requested after review. `DetailSheet` (components/common) + `FormFooter inSheet`. `components/ui/sheet.jsx` overlay is customised (darker, 3px blur) — restore after a shadcn re-install |
| Searchable select with `command` + `popover` | `EntitySelect` built on `popover` + a search box and a list; no `cmdk` | Fewer dependencies; the lists are short (≤ 100 options) |
| Sub-list edited with the form's Save | Links (supplier ↔ material) are saved one by one (add / change / remove save at once); the tab is disabled until the record exists | A link needs both ids, and users edit prices without re-saving the form |
| Tab "Used in" on a material | Built with Products: read-only list of products whose BOM has the material, link to the product | |
| Tabs | `Details` + one sub-list tab inside the detail sheet | `ui/tabs.jsx`, `ui/popover.jsx` written by hand with `radix-ui` |
| One form page per entity | `useRecordForm` hook + `RecordDialogs` hold the load / save / deactivate / delete / leave logic for Materials and Suppliers (Customers and the flat entities keep their own copy) | Less repeated code; move the others onto it when they are next touched |
| M5 BOM editor as a separate page | Tab "BOM" inside the product sheet (same as the draft: "inside a Product") | Add / change / remove save at once, like the supplier links |
| Routing step order edited in the form | Up / down buttons per step (keyboard friendly, no drag and drop); steps are renumbered by the server | Works without a mouse |
| Machine required in a routing step | Optional ("No machine selected") — an already chosen machine cannot be cleared in the UI yet | Not every step uses a machine |
| BOM quantity "up to 3 decimals" | Checked in the UI and in the mock | |
| Footer bar with Save / Cancel / Deactivate / Delete in the sheet | **Header** of the sheet: Deactivate / Reactivate and Delete as icon buttons (tooltip + accessible name), **Save**, and a close (X) icon in place of Cancel. Grey body (#F1F5F9) with white cards that have a shadow below (plain icon, no folding); "Record information" (created / updated) is the last card | Requested after review. `DetailSheet` + `RecordActions` + `SheetSection` / `FormSection` + `RecordInfoCard` + `RecordSheet`; every master data form uses `useRecordForm` + `RecordSheet` now. Save in the header works from every tab (the details form stays mounted) |
| Sheet opened with a skeleton while the record loads | The row the list showed fills the form at once (`utils/recordCache`); the full record is fetched in the background and never overwrites typed text | The skeleton plus the 15px width jump made the opening feel jerky |
| Confirm dialog for Deactivate / Reactivate; status badge in the sheet header | None: the power button in the header **is** the status (green = active, grey = inactive) and switches at once with a toast; the tooltip says what a click does. Delete still asks first | Requested after review |
| Fixed sheet width (max-w 2xl) | The sheet width is changed by dragging the three dots on its left edge (a light blue band shows on hover; arrow keys on the dots, double-click resets, 440px to window − 80px); the width is remembered in localStorage. Fields use two columns when the sheet is about 640px or wider and one column below that (container query), and cards stay open | Requested after review |
