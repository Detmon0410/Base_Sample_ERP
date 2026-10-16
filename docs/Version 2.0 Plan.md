# Version 2.0 Plan

How the three new requirements are built, phase by phase. Sources:

- [User Version 2.0](User%20Version%202.0.md) (roles by department)
- [QT Upgrade 2.0](QT%20Upgrade%202.0.md) (printed QT form, customer PO, Confirm QT creates the order)
- [Purchase Logic Draft2](Purchase%20Logic%20Draft2.md) (suppliers, purchase orders, receiving, payment, files)
- Diagrams of the system as built: [ProjectdocInfo](../ProjectdocInfo/)

Status of this file: **built** (the five phases are done on the frontend and the mock; the backend follows `docs/api`). It stays as the record of the decisions D1 to D12. It is written so the frontend work and the backend work can start from the same page. The frontend runs on the mock API; the backend follows [docs/api](api/README.md).

## 1. Goal and scope

Version 2.0 adds three things to the Mini ERP:

1. **Department roles.** A Worker is either a Sale Worker or a Factory Worker, and the department decides the access.
2. **QT 2.0.** A QT has lines, is printed as a form, keeps the customer's PO, and **Confirm QT creates the production order**.
3. **Purchase.** Suppliers and their items, a one-page Purchase screen, purchase orders (PO) with a hand-set status, stock added on receiving, payment, and files.

Between them they need one shared piece: **file attachments**.

The last phase is a small UI pass so the new screens are easy to use.

Not in 2.0 (the sources say so): partial receiving, an approval step, a Manager role, QT statuses other than Draft and Confirmed, a separate Sales Order, and supplier invoices in Accounting.

## 2. Decisions

These answer the open questions of the three source documents. Rows marked **chosen** were decided by the user; the others are the proposed default and can be changed before the phase that uses them starts.

| # | Question | Decision | Source |
|---|---|---|---|
| D1 | How is a production order made? | **Only by Confirm QT.** The old "New production order" button and `POST /orders` go away. The order page stays as the page to edit the order before the start (lines, processes) | proposed |
| D2 | Status name of an order that has not started | **`Draft`** replaces `New`. The rule is unchanged: the status is computed. See D10 | **chosen** |
| D3 | Do QT prices go to the order? | **Yes.** The order lines copy product, quantity and unit price from the QT lines, so the invoice still prices from the order | proposed |
| D4 | Which lot gets the stock when a PO is received? | The user **types a lot number per PO line** when pressing Received. The form suggests `LOT-yyyymmdd` | proposed |
| D5 | Does a supplier have `active`? | **Yes.** `active` (default true). An inactive supplier cannot be picked on a new PO. This is the only master record with `active` | **chosen** |
| D6 | Payment fields of a PO | **As in the Purchase document:** date, amount, method, reference no., note | **chosen** |
| D7 | Who uses Purchase? | **Admin and Factory Worker.** Sale Worker has no access. Suppliers: Admin full, Factory view | proposed |
| D8 | Test accounts | The existing Worker becomes a Factory Worker. A Sale Worker is added: `sale@gmail.com` / `sale` | proposed |
| D9 | Must the PO payment equal the PO total? | **Yes**, the same rule as an invoice (`MUST_EQUAL_TOTAL`). One payment per PO | proposed |
| D10 | A started order with no progress yet | The status stays `Draft` (rename only), and the order page shows a **"Production started"** line so it is not confused with an unstarted draft | proposed |
| D11 | Payment methods | `Cash`, `Bank transfer`, `Cheque`, `Credit card`, `Other` (the list the invoice had) | proposed |
| D12 | Department on a PO | Chosen from `Sales`, `Factory`, `Accounting`, `Administration` (the user departments). Default is the department of the user | proposed |

## 3. What exists today (baseline)

- Roles `Admin` and `Worker`; `department` is a label. Menu: Dashboard, Sales (Quotations, Production orders), Accounting (Invoices, Receipts), Stock (Materials and stock, Movements), Master data (Customers, Products and BOM, Users).
- QT: number, date, customer, notes, optional file. An Admin makes an order from a QT by hand.
- Order status `New`, `In Progress`, `Completed` (computed). Start production deducts the BOM, oldest lot first, and answers `409 STOCK_SHORT` when a material is short; the page then shows the short materials with an **Add stock** button.
- Stock: lots, stock changes `Add`, `Deduct`, `Adjust`, status `Normal`, `Low`, `Out` from an optional minimum level.
- Invoice and receipt: no payment method, no payment note.
- Code layout: `frontend/src/{pages,components,services,services/mock,config,utils,i18n}`; the contract in `docs/api/*.md`; tests are vitest (page flows drive the mock) and Playwright (`frontend/e2e`).

## 4. Phases

| Phase | Name | Size | Needs |
|---|---|---|---|
| 1 | Department roles and the contract | small | none |
| 2 | File attachments | medium | 1 |
| 3 | QT 2.0 | large | 1, 2 |
| 4 | Purchase | large | 1, 2 |
| 5 | Small UI pass and wrap-up | medium | 1 to 4 |

Rules for every phase:

- A phase ends when its **done when** list is true and its tests pass.
- Every new text exists in **English and Japanese** (the existing key test checks the English side).
- Work is committed **by category** (page code, mock, tests, docs) when the user says so.
- During a phase run only the tests that touch it; the full vitest and Playwright runs are in phase 5.
- Each phase updates `docs/api` so the backend can follow.

---

## Phase 1. Department roles and the contract

### Why first
Every later screen asks "who may do this". The rules in [User Version 2.0](User%20Version%202.0.md) must exist before QT, orders and Purchase use them.

### 1.1 Rules

`role` stays `Admin` or `Worker`. For a Worker, `department` is required and is `Sales` or `Factory`.

| Page / action | Admin | Sale Worker | Factory Worker |
|---|---|---|---|
| Dashboard | all tiles, chart | order tiles | order tiles |
| QT | full | full | no access |
| Production order: view | yes | yes | yes |
| Production order: edit before start | yes | yes | no |
| Start production | yes | no | yes |
| Record progress | yes | no | yes (not on a Completed process) |
| Completed process: change or reopen | yes | no | no |
| Order evidence upload (phase 2) | yes | no | yes |
| Stock: view | yes | yes | yes |
| Stock changes by hand | yes | no | yes |
| Products | full | view | view |
| Customers | full | view | no access |
| Suppliers (phase 4) | full | no access | view |
| Purchase (phase 4) | full | no access | full |
| Invoices, receipts, users | full | no access | no access |

Admin passes every check.

### 1.2 Frontend work

| Area | Change |
|---|---|
| `utils/permissions.js` | `canUse(user, rule)`: the rule is a list of roles (as now) or `{ roles, departments }`. Add helpers by action, for example `can(user, "orders.start")`, so a page asks for an action and not for a department |
| `config/navigation.js` | Each entry gets `departments` beside `roles`; an entry is shown when both match. The menu with one visible entry still shows as that entry |
| `routes` | The route guard uses the same rule; a page of another department opens `/403` |
| Users page and form | A Worker must have `Sales` or `Factory`. The form shows the access table as a hint. Admin may have any department |
| Orders, QT, Stock pages | Hide the buttons the user cannot use (Start, edit order, stock change, QT menu) |
| `i18n` | Role labels `Sale Worker`, `Factory Worker`; hint texts; `403` text unchanged |
| Seed data | The existing Worker is `Factory`; add `sale@gmail.com` (Sales). Passwords are test values in `services/mock/users.js` |

### 1.3 Mock work

- `users.js`: add the Sale Worker; `requireDepartment` helper beside `requireAdmin`.
- Every mock route checks the table in 1.1 (`403 FORBIDDEN`). Reads stay open where the table says view.
- `POST` / `PUT /users`: a Worker without `Sales` or `Factory` answers `400 VALIDATION_ERROR`, `INVALID` on `department`.

### 1.4 Contract (docs/api)

| File | Change |
|---|---|
| `auth.md` | `department` decides the access of a Worker; the text "it gives no access" goes |
| `master-data.md` | users: the Worker rule above; customers: read for Admin and Sale |
| `qt.md`, `orders.md`, `stock.md` | Who may call each endpoint (the table in 1.1) |
| `README.md` | Add the new role names and the new documents to the list |

### 1.5 Tests

- Mock: a table-driven test, one row per endpoint and role (allowed or `403`).
- Pages: the menu of each of the three roles; a Factory Worker opening `/sale/quotations` goes to `/403`; the Start button is hidden from a Sale Worker.
- Users form: a Worker cannot be saved without `Sales` or `Factory`.
- Existing page tests that sign in as the old Worker use the Factory Worker.

### 1.6 Done when
- Signing in as Admin, Sale and Factory shows exactly the menu and the buttons of the table.
- Every endpoint in the mock follows the table, and the contract says the same.

### 1.7 Risks
- Many existing tests use the Worker. They move to the Factory Worker in one pass.
- A Worker with `Accounting` or `Administration` in old data would fail the next save. The mock has none; the migration note for the backend is in `master-data.md`.

---

## Phase 2. File attachments

### Why now
QT 2.0 keeps the customer's PO file, orders keep evidence, a PO keeps files. One feature serves all three.

### 2.1 Model

`Attachment`: `id`, `ownerType` (`QtReference`, `ProductionOrder`, `PurchaseOrder`), `ownerId`, `kind`, `fileName`, `fileType`, `uploadedBy`, `at`, and the file content.

| `kind` | Meaning |
|---|---|
| `PO_FILE` | The customer's PO on a QT, or the PO file of a purchase order. One per owner; a new upload **replaces** the old one |
| `QUOTATION` | A quotation file (the optional QT file of today; the supplier's quotation on a PO) |
| `EVIDENCE` | Images or documents of production, on a production order |
| `OTHER` | Any other printable document |

Rules: PDF, PNG or JPG, up to 10 MB (the QT file limits today). Which kinds an owner may have:

| Owner | Kinds |
|---|---|
| QtReference | `QUOTATION`, `PO_FILE`, `OTHER` |
| ProductionOrder | `EVIDENCE`, `OTHER` (and a read-only copy of the customer's `PO_FILE` from the QT) |
| PurchaseOrder | `PO_FILE`, `QUOTATION`, `OTHER` |

### 2.2 API (contract)

| Method | Path | Notes |
|---|---|---|
| `GET` | `/attachments?ownerType=...&ownerId=...` | The list without the file content: `{ id, ownerType, ownerId, kind, fileName, fileType, size, uploadedBy, uploadedByName, at }` |
| `GET` | `/attachments/:id` | One attachment with `file: { name, type, dataUrl }` (the mock keeps a data URL; a real backend should answer with a download address) |
| `POST` | `/attachments` | `201`. Body `{ ownerType, ownerId, kind, file: { name, dataUrl } }`. A `PO_FILE` for an owner that has one replaces it |
| `DELETE` | `/attachments/:id` | `200`, `data: null` |

Errors: `400 VALIDATION_ERROR` with `REQUIRED`, `INVALID`, `FILE_TYPE`, `FILE_TOO_BIG`; `404 NOT_FOUND` (owner or file); `403 FORBIDDEN`.

Who may upload (decided by the owner):

| Owner | Upload / delete |
|---|---|
| QtReference | Admin, Sale Worker |
| ProductionOrder | Admin, Factory Worker (evidence) |
| PurchaseOrder | Admin, Factory Worker |

Everyone who can open the owner can read its files.

### 2.3 Frontend work
- `components/common/Attachments.jsx`: the list (kind, name, who, when), an upload form (kind select, file), a delete button with a question, and a download link. Used by the three owners.
- `services/attachments.service.js`.
- Production order page: an **Evidence** section (Admin, Factory Worker).
- The old QT file field moves to this component in phase 3; in phase 2 it keeps working and is only wrapped.
- Reuse the file checks of the QT form (`FILE_TYPE`, `FILE_TOO_BIG`).

### 2.4 Mock work
- `services/mock/attachments.js`; the stores are plain arrays like the other mock modules.
- The QT module's existing `file` is read from and written to this store with `kind = QUOTATION`, so `GET /qt/:id` still answers the same shape until phase 3 changes it.

### 2.5 Tests
- Mock: upload, replace of a `PO_FILE`, delete, wrong type, too big, who may upload.
- Page: Factory Worker uploads evidence to an order and sees who and when; Sale Worker has no upload there.

### 2.6 Done when
- Evidence can be uploaded to an order, listed, downloaded and deleted by the right roles.
- The contract `docs/api/files.md` exists (new file) and the README links it.

### 2.7 Risks
- A real backend must not return file content in lists. The list shape above says so.

---

## Phase 3. QT 2.0

### 3.1 Model changes

`QtReference` (the QT):

| Field | Notes |
|---|---|
| `status` | `Draft` or `Confirmed` |
| `lines[]` | `{ id, productId, productCode, productName, quantity, unitPrice, amount }` |
| `total` | Sum of the line amounts (computed) |
| `customerPoNumber`, `customerPoDate` | Typed by the user; optional until Confirm (the user is warned) |
| `productionOrderId`, `productionOrderNumber` | Set by Confirm; one order per QT |
| files | Through attachments: `QUOTATION`, `PO_FILE` (phase 2) |

Production order:

- Status `Draft`, `In Progress`, `Completed` (D2): the same computed rule, with `Draft` in place of `New`.
- Gains `qtNumber` (already shown), `customerPoNumber`, and the QT's `PO_FILE` as a read-only attachment.
- The lines copy product, quantity and unit price from the QT (D3). Processes start empty and are added by the Admin or the Sale Worker before the start.

### 3.2 Rules

| Rule | Detail |
|---|---|
| Create | Number (unique), date, customer, notes, and lines. Prices start from the product and can be edited |
| Draft | Everything can change. A Draft QT can be deleted |
| Print | A PDF of the QT form at any status (customer name and address, lines, total, notes, blank spaces for prepared by, approved by, customer) |
| PO file | One per QT; a new upload replaces the old. A missing PO file warns on Confirm and does not block |
| Confirm | Needs a customer and at least one line. Sets `Confirmed`, creates **one** order in `Draft`, links both ways. Pressing Confirm again returns the existing order and changes nothing |
| Locked | A confirmed QT cannot change its lines, customer or quantities (`409 QT_LOCKED`). Notes and files may still be added |
| Delete | Only `Draft`. A confirmed QT answers `409 IN_USE` (the order uses it) |
| Undo | Cancelling or deleting the order does not reopen the QT. A new QT is made if the sale changes |
| Who | Admin and Sale Worker (phase 1) |

### 3.3 API (contract, `qt.md` and `orders.md`)

QT:

| Method | Path | Notes |
|---|---|---|
| `GET` | `/qt` | Rows add `status`, `total`, `productionOrderNumber`; no lines, no file content |
| `GET` | `/qt/:id` | Full QT with `lines`, files list, `productionOrderId` |
| `POST` | `/qt` | `201`. Body `{ qtNumber, qtDate, customerId, notes, customerPoNumber?, customerPoDate?, lines: [{ productId, quantity, unitPrice }] }` |
| `PUT` | `/qt/:id` | Draft only for lines and customer: `409 QT_LOCKED` otherwise |
| `POST` | `/qt/:id/confirm` | `200`, `{ qt, order, alreadyConfirmed: boolean, warnings: ["NO_PO_FILE"] }`. Creates the order; the second call returns the same order |
| `DELETE` | `/qt/:id` | Draft only; `409 IN_USE` when confirmed |

Orders:

- `POST /orders` is **removed** (D1). `PUT /orders/:id` stays for Admin and Sale Worker before the start.
- Status values: `Draft`, `In Progress`, `Completed`. The `status` filter uses the same values.
- `GET /orders/:id` adds `customerPoNumber` and the QT link fields.

Errors: `400 VALIDATION_ERROR` (`REQUIRED`, `INVALID`, `INVALID_DATE`, `DUPLICATE`), `409 QT_LOCKED`, `409 IN_USE`, `404 NOT_FOUND`. `POST /qt/:id/confirm` with no lines or no customer answers `400 VALIDATION_ERROR` (`REQUIRED` on `lines` or `customerId`).

### 3.4 Frontend work

| Area | Change |
|---|---|
| QT list | Columns QT No., date, customer, total, status badge, order number (link) |
| QT form | Header fields; a **lines table** (product select, quantity, unit price, amount, remove icon; **Add a product** button) and the total; customer PO block (PO No., PO date, file through `Attachments`); QT file; buttons **Save**, **Print**, **Confirm QT** (with a question; the question warns when the PO file is missing) |
| QT form (Confirmed) | Read-only lines; a banner "Confirmed" with a link to the order |
| Print | `components/documents/QtForm.jsx` (a printable block with signature spaces), reusing `utils/pdf.js` and `utils/print.js` |
| Orders menu | Remove the **New production order** button; the page `/sale/orders/new` redirects to `/sale/quotations` |
| Order page | Shows QT link, customer PO No. and file; the processes editor stays; a **Production started** line after the start (D10); Evidence section from phase 2 |
| Status text | `New` becomes `Draft` in the list, the filter, the header badge, the Dashboard tile and the status key tests (EN: Draft; JA: 下書き) |
| Dashboard | Tile label **Draft**; the chart row **Draft** |
| Navigation | No new entry; the QT page keeps its path |

### 3.5 Mock work
- `qt.js`: lines, status, totals, `confirm`, lock, delete rule, link to the order.
- `orders.js`: rename the status, remove the create route, an internal `createFromQt` used by Confirm, copy lines with prices (D3). Orders in the mock start empty as before.
- `deletes.js`: a QT that has an order is `IN_USE`.
- `invoices.js`: no change in logic (it prices from the order lines).

### 3.6 Tests
- Mock: QT lines and totals, confirm once, confirm twice returns the same order, locked QT, delete rules, order copies lines and prices, status `Draft`.
- Pages: build a QT with lines, print (the PDF call), upload a PO, confirm, land on the order, add processes as a Sale Worker, start as a Factory Worker.
- Update every test that created orders directly; they use a helper that makes a QT and confirms it.
- Playwright: the acceptance case becomes: QT with lines, upload the PO, Confirm, add the processes, Start, progress, invoice, payment, receipt.

### 3.7 Done when
- A QT can be made, printed, given a customer PO and confirmed, and the order it creates can be started and finished.
- The word `New` is gone from order statuses everywhere (UI, mock, tests, docs).

### 3.8 Risks
- The largest change to existing code and tests: QT, order, Dashboard and the main Playwright case. It is split into commits by category.
- The old `file` of a QT changes to attachments; the mock migration is inside the mock only.
- Decision D10: a started order with no progress still says `Draft`. The "Production started" line mitigates it. If this confuses users, add a `Started` status later (not planned).

---

## Phase 4. Purchase

### 4.1 Master data: suppliers and items

`Supplier`: `id`, `code` (unique), `name`, `contact`, `address`, **`active`** (default true, D5), `items[]` = `{ materialId, unitPrice }` (the materials the supplier sells, with the initial price).

| Rule | Detail |
|---|---|
| Items | A material appears once per supplier. Price is whole yen |
| Inactive | Cannot be chosen on a new PO; stays on old POs; can be switched back |
| Delete | Refused with `409 IN_USE` when a PO uses the supplier (kind `purchaseOrder`); otherwise deleted with its items |
| Material delete | Refused when a supplier item or a PO line uses it (`supplier`, `purchaseOrder`) |
| Who | Admin full; Factory Worker view; Sale Worker none |

`Material` gains `unit` (text, for example `kg`, `pcs`; default `pcs`) because a PO line shows a unit.

Contract: `GET/POST/PUT/DELETE /suppliers[/:id]` through the same generic master-data calls; body adds `active` and `items`. The `active` filter: `GET /suppliers?active=true`. `master-data.md` says that **only suppliers have `active`**, and gets the new delete rules.

### 4.2 Purchase order

`PurchaseOrder`: `id`, `poNumber` (`PO-yyyy-0001`, given by the server), `supplierId`, `supplierName`, `department`, `requiredDate`, `notes`, `status`, `total`, `lines[]`, `payment`, `receivedAt`, `createdBy`, `createdAt`, `updatedAt`.

`lines[]`: `{ id, materialId, materialCode, materialName, unit, quantity, unitPrice, amount, lotNumber? }`. `lotNumber` is set when the PO is received (D4).

Status: `Draft` → `Sent` → `Received`, one step forward by hand, no way back.

| Rule | Detail |
|---|---|
| Create | Supplier (active), required date, department (D12), lines. Only materials of the chosen supplier can be picked. Unit price starts from the supplier's item price and the user can change it. `total` = the sum of the amounts. Status `Draft` |
| Edit | Lines, supplier, dates only in `Draft` (`409 PO_LOCKED` otherwise) |
| Delete | Only `Draft` |
| Print | A PDF of the PO (supplier, required date, department, lines, total, blank spaces for prepared by, approved by, received by). Any status |
| Sent | The user presses **Mark as sent** |
| Received | The user presses **Mark as received** and types a **lot number per line** (D4). Each line is added to its lot as a stock change `Add` with note `Received PO-...` and a link to the PO. **Once only:** pressing again changes nothing |
| Payment | Needs `Received` (`409 PO_NOT_RECEIVED`). One payment per PO (`409 ALREADY_PAID`). Date, amount (= the PO total, D9, `MUST_EQUAL_TOTAL`), method (D11), reference no., note. The PO shows **Paid** or **Not paid** |
| Files | Through attachments at any status (`PO_FILE`, `QUOTATION`, `OTHER`) |
| Who | Admin and Factory Worker |

### 4.3 API (contract, new `purchase.md`)

| Method | Path | Notes |
|---|---|---|
| `GET` | `/purchase-orders` | Query `q` (PO No., supplier name), `status`, `supplierId`, `paid` (`true`/`false`), `page`, `pageSize`. Rows have no lines |
| `GET` | `/purchase-orders/:id` | The whole PO with lines and payment |
| `POST` | `/purchase-orders` | `201`. Body `{ supplierId, requiredDate, department, notes?, lines: [{ materialId, quantity, unitPrice }] }` |
| `PUT` | `/purchase-orders/:id` | Draft only |
| `DELETE` | `/purchase-orders/:id` | Draft only |
| `POST` | `/purchase-orders/:id/status` | Body `{ status: "Sent" }` or `{ status: "Received", lots: [{ lineId, lotNumber }] }` |
| `POST` | `/purchase-orders/:id/payment` | Body `{ paymentDate, amount, method, referenceNo?, note? }` |

The low-stock part of the page uses `GET /materials?status=Low` and `status=Out` (they exist) and needs no new endpoint.

Stock history entries gain `purchaseOrderId` and `purchaseOrderNumber` (a link on the Movements page).

Errors:

| HTTP | `error` | When |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | `REQUIRED`, `INVALID`, `INVALID_DATE`; `SUPPLIER_INACTIVE` on `supplierId`; `NOT_SOLD_BY_SUPPLIER` on `lines.n.materialId`; `DUPLICATE` for the same material twice; `MUST_EQUAL_TOTAL` on `amount`; `REQUIRED` on a lot number when receiving |
| 409 | `PO_LOCKED` | Edit or delete of a PO that is not `Draft` |
| 409 | `INVALID_STATUS_CHANGE` | Anything other than the next step |
| 409 | `PO_NOT_RECEIVED` | Payment before `Received` |
| 409 | `ALREADY_PAID` | A second payment |
| 403 | `FORBIDDEN` | Sale Worker |

### 4.4 Frontend work

New menu entry **Purchase** (`/purchase/orders`) with one entry, so it shows as one link. **Suppliers** in Master data.

The Purchase page is **one page** ([Purchase Logic Draft2](Purchase%20Logic%20Draft2.md)):

| Area | Content |
|---|---|
| Stock | Materials that are Low or Out (code, name, total, minimum level, status badge) and a **Create PO** action on each row that opens the form with that material ready |
| PO form | Supplier (active only), required date, department, lines (material of that supplier, quantity, unit shown, unit price, amount, remove icon, **Add a material**), total; **Save** makes a `Draft` |
| PO list | PO No., supplier, required date, total, status badge, paid badge; a search box and a status filter; the row opens the detail |
| PO detail | Lines, status buttons (**Mark as sent**, **Mark as received** with the lot numbers, only the next one), **Print PDF**, **Payment** block, **Files** (attachments), delete for a Draft |

Other work:
- `pages/suppliers/SuppliersPage.jsx` with an **Items** table (material, price) and the **Active** switch.
- Materials form gets **Unit**.
- Movements page: a PO link on rows made by a receipt; a movement filter for the PO is optional.
- The **Add stock** button on a short stock (from the order start) stays; a small link **Create PO** is added beside it for a Factory Worker or Admin (phase 5 decides the final wording).
- `components/documents/PurchaseOrderForm.jsx` for the print.
- Texts EN and JA.

### 4.5 Mock work
- `suppliers.js` (generic master resource with `items` and `active`), `purchase.js` for POs.
- Receiving calls the same stock code as a manual `Add`, so lots, history and status stay in one place.
- `deletes.js`: the new refusals.
- Seed data: 3 suppliers with items and prices, 1 PO in each status (browser only, like the other seed data).

### 4.6 Tests
- Mock: the PO status path, lock after Draft, items limited to the supplier, inactive supplier, receiving adds stock once, payment rules, delete refusals, the department roles.
- Pages: the whole path on the one page (low material → Create PO → Save → Print → Sent → Received with a lot → stock grew → payment → Paid).
- Suppliers page: items, the Active switch, delete refused when used.
- Playwright: a Purchase case (Factory Worker), and the acceptance case gets one extra step: the order is refused for a short stock, the material is bought through a PO and received, and the order starts.

### 4.7 Done when
- From a short material you can create, print, send, receive and pay a PO, and the stock and its history show it.
- Contract `docs/api/purchase.md` and the master-data changes are written.

### 4.8 Risks
- Receiving needs a lot number (D4). If the user wants the system to choose, change D4 before this phase.
- The PO payment keeps method and reference (D6) while the invoice payment does not. That is on purpose (the source documents differ) and is written in both contracts.

---

## Phase 5. Small UI pass and wrap-up

### 5.1 UI pass (small, for ease of use)

The list is a proposal; the user picks.

| Item | Change |
|---|---|
| Status badges | Use the one badge component for the new statuses: QT Draft / Confirmed, PO Draft / Sent / Received, Paid / Not paid; the page header status of an order, QT and PO uses the same badge |
| Contrast | The white text on the main purple (about 4:1) is darkened slightly to reach 4.5:1 |
| Text size | The base text goes up a little for the tables and forms |
| Buttons | The main action of a page is the filled button, the others are outlined; a danger action is red |
| New pages | The QT lines table, the PO lines table and the Suppliers items table share one look (row stripes, number columns on the right, icon remove button) |
| Guidance | The short stock message and the Purchase low-stock list point to the next action (Add stock or Create PO) |
| Empty states | One short sentence and the action button when a list is empty |
| Login | The system name on the sign-in page matches the smaller one in the header |

### 5.2 Wrap-up

- README: the new Workflow and roles, and the differences from the requirements.
- `docs/api`: check every file against the mock again (the same scripted check as before: every endpoint, the response fields and the error codes); `docs/api/README.md` lists `files.md` and `purchase.md`.
- `ProjectdocInfo`: turn Version 2.0 into Part 1 (as built) and keep a short list of what is left, if any.
- Seed data and test accounts: Admin, Sale, Factory.
- Run the **full vitest and Playwright** (desktop, tablet, phone), lint and build.
- Look at every new page in the browser, in English and Japanese.
- Remove anything unused (a scan of exports and i18n keys, as before).

### 5.3 Done when
- All tests pass on the three screen sizes, the pages were checked by eye, and the documents match the code.

---

## 5. Data and contract summary

New or changed records:

| Record | Change |
|---|---|
| User | Worker needs `department` in (`Sales`, `Factory`) |
| Customer, Product | no change |
| Material | `unit` |
| Supplier | new: `code`, `name`, `contact`, `address`, `active`, `items[]` |
| SupplierMaterial | new: `supplierId`, `materialId`, `unitPrice` |
| QtReference | `status`, `lines`, `total`, `customerPoNumber`, `customerPoDate`, `productionOrderId` |
| QtLine | new |
| ProductionOrder | status `Draft` / `In Progress` / `Completed`; created only from a QT |
| StockChange | `purchaseOrderId` |
| PurchaseOrder, PurchaseOrderLine, PurchasePayment | new |
| Attachment | new (owner type + id, kind, who, when) |
| Invoice, Payment, Receipt | no change |

New or changed contract files: `auth.md`, `master-data.md`, `qt.md`, `orders.md`, `stock.md`, `dashboard.md` (status name), **new** `files.md` and `purchase.md`, `README.md`.

## 6. Permission summary after phase 4

| Area | Admin | Sale Worker | Factory Worker |
|---|---|---|---|
| QT (create, print, PO, confirm) | yes | yes | no |
| Order: edit before start | yes | yes | no |
| Order: start, progress, evidence | yes | no | yes |
| Stock changes | yes | no | yes |
| Purchase (PO, status, print, payment, files) | yes | no | yes |
| Suppliers | full | no | view |
| Customers | full | view | no |
| Products | full | view | view |
| Invoices, receipts, users | full | no | no |

## 7. Test plan

| Layer | What |
|---|---|
| Mock (vitest) | One test file per module with every rule above; a permission table test (phase 1) |
| Pages (vitest + Testing Library) | One flow test per screen that drives the mock: QT, order, Purchase, Suppliers, Attachments, the menus by role |
| Playwright | The acceptance case follows the new flow; a Purchase case; the smoke test walks every page for each of the three roles; the raw-key scan covers the new pages |
| Contract check | A scripted comparison of the mock's endpoints, fields and error codes with `docs/api` (phase 5) |

## 8. Order of commits inside a phase

1. Contract and docs (so the backend can start).
2. Mock.
3. Pages and texts.
4. Tests.

## 9. Open points (small)

- D4, D9, D10, D11, D12 can still be changed before phase 3 and 4.
- The final wording and place of the **Create PO** link on the short-stock message (phase 5).
- Whether the Dashboard gets a Purchase tile (not planned).
