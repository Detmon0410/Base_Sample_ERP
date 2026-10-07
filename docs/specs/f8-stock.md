# F8 Spec — Stock module (T1–T3 + the links with Factory, Sale and the Dashboard)

Status: **APPROVED with the suggested answers (★) for Q1–Q12. BUILT with mock data** (differences: section 10) · Rule as before: spec → review → build with mock data → API doc (`docs/api/stock.md`) → tests.
Sources: `BaseRequirement_md/Overall_ERP.md` ("Manage Product and stock quantities") · `master_data_req.md` (Stock = one record per product / material per warehouse; the two warehouses WH-R and WH-F) · `aditional_req.md` §1 (availability check) and §2 (reorder point and the Shortage / Near / Normal rule) · `docs/frontend-plan.md` §3.5 (T1–T3) · `docs/test.txt` section 4 · `docs/specs/f7-factory.md` Q9 ("no stock movement now; Stock is later"). `Sotck_req.md` is empty, so the flow below is inferred and must be confirmed (section 8).

Carried-over decisions: JPY only · desktop (≥ 1280px) · EN first, JA keys empty with EN fallback · no visible page title (breadcrumb only) · details open as the **side sheet** · **manual first** (nothing changes by itself except the stock movements that a document you press a button on makes, each with a history line) · tables 15px `#666`, quiet header buttons, stepper above the lists that have a status (and the header eye hides it) · shared parts reused (`DocumentListPage`, `DocumentSheet`, `DataTable`, `StatusStepper`, `AvailabilityCard`, `ListToolbar`, `useRecordForm`, `ConfirmDialog`).

---

## 1. The main idea

Today the stock is only a number on the material master (`onHand`) and four hard-coded alerts on the Dashboard; nothing moves it. This module makes it a **ledger**:

- **Stock balance** = how many of an item are in a warehouse now (one row per material or product per warehouse).
- **Stock movement** = one line every time a balance changes: date, item, warehouse, type, quantity (+ in / − out), the document that caused it. The balance is always the sum of its movements, so the numbers can be explained and never edited by hand.
- The only ways to change a number: a document in another module (a Work Order starts, a transfer is made, a delivery is made, later a goods receipt) or an **approved Stock adjustment**.

```text
Purchase (later)        Goods receipt ──────────────▶ (+) material   WH-R
Factory   Work Order    Start ──────────────────────▶ (−) materials  WH-R   (BOM × quantity)
Factory   FG transfer   Transferred ────────────────▶ (+) product    WH-F
Sale      Delivery      Delivered ──────────────────▶ (−) product    WH-F
Stock     Adjustment    Approved ───────────────────▶ (±) any item   any warehouse
```

Movement types: `opening` (the seed balance), `receipt`, `consume`, `produce`, `deliver`, `adjust`. A revert of a document (back to the previous status) makes the **opposite movement** with the same type and the note "reverted"; a movement is never changed or deleted.

## 2. Pages (build in this order)

| # | Page | Route | What it is |
|---|---|---|---|
| T0 | Foundation | – | mock `services/mock/stock.js` (balances, movements, adjustments), `stock.service.js`, `config/stock.js` (types, statuses, the stock status rule, who may do what), nav texts, then the links of section 5 |
| T1 | Stock overview | `/stock` (+ `/stock/materials/:id`, `/stock/products/:id`) | balances list with a Materials / Products switch; row opens a read-only item sheet |
| T2 | Stock movements | `/stock/movements` | read-only ledger with filters and links to the source document |
| T3 | Stock adjustments | `/stock/adjustments` (+ `/new`, `/:id`) | list with status stepper, form and sheet, approval by a Manager |

### T1 Stock overview

- **Switch** Materials | Products (the tab is remembered; it is also `?tab=` in the address).
- **Table (materials)**: Code · Name · Warehouse · On hand (right, with the UoM) · Reorder point · Status badge (Shortage = on hand ≤ reorder point, red · Near shortage = ≤ 1.2 × reorder point, amber · Normal, green — the rule of `aditional_req.md` §2). Footer: the number of rows.
- **Table (products)**: Code · Name · Warehouse · On hand · Status (Out of stock when 0, otherwise In stock; a product has no reorder point).
- **Filters**: search (code or name), warehouse, status. A row has one line per warehouse (a material is only in WH-R, a product only in WH-F in the seed, but the model allows both).
- **Item sheet** (read-only, opens from a row): top card with code, name, UoM, reorder point and reorder quantity (a link "Edit in master data"), a **By warehouse** card (warehouse, on hand), a **Last movements** card (the latest 10, a link "All movements" to T2 filtered by this item), and for a material the **Used in** list (the products whose BOM uses it, with the quantity per unit). Button "New adjustment" (opens T3 with the item filled in) for users who may adjust.
- Empty state, loading skeleton, error with Retry, and the Refresh of the header as in the other lists.

### T2 Stock movements

- **Table**: Date and time · Type (a coloured label: Receipt, Consume, Produce, Deliver, Adjust, Opening) · Item (code · name) · Warehouse · Quantity (right, **+12 green / −12 red**, with the UoM) · Balance after (right) · Document (a link: WO-…, FT-…, DN-…, ADJ-…, later GR-…) · By (user).
- **Filters**: search (item code / name or document number), type, warehouse, item kind (material / product), date range. Newest first; sortable by date and quantity. Pager like the other lists. Nothing can be added or edited here.
- A row opens the document it came from (when that document has a page); an opening balance has no link.

### T3 Stock adjustments

For a count that does not match (damage, loss, recount). Number `ADJ-2026-0001`.

- **Statuses and stepper**: Draft → Pending approval → Approved, and Rejected (and Cancelled from Draft). Same stepper and badge colours as the other documents.
- **Form** (Draft): Item kind (Material / Product) · Item (search) · Warehouse · **Counted quantity** (the new quantity) · the system shows *On hand now* and the **Difference** (+ or −, coloured) · **Reason** (required, a short list: Recount, Damaged, Lost, Found, Other + a note) · Remarks.
- **Buttons** (status buttons like the other sheets, each with a confirmation and a history line): Request approval (Draft → Pending) · Approve / Reject (Manager; Reject asks for a note) · Back to draft (from Pending, by the author or a Manager) · Cancel (Draft).
- **On Approve** the difference is booked as an `adjust` movement at that moment. If the on-hand quantity changed between the request and the approval, the sheet shows both numbers and the approval books **the counted quantity** minus the quantity on hand at approval time (so the result is exactly what was counted), with a warning line "On hand changed since the request".
- Sheet cards: Adjustment, Status history, Linked documents (the movement, once approved).
- A negative result (counted quantity < 0) is refused.

## 3. Rules

| # | Rule |
|---|---|
| R1 | A balance is the sum of its movements. There is no screen that edits a balance or a movement. |
| R2 | Quantities: pieces are whole numbers, kg etc. up to 3 decimals (the same rule as the BOM). |
| R3 | A movement that would make a balance negative is refused with a clear message ("Not enough stock: needs 20, has 12") and the document keeps its status. |
| R4 | A document makes its movements once, at the moment of the status change, and the opposite movements when that change is reverted. |
| R5 | The stock status rule is one function used everywhere (overview, Dashboard, availability checks, later Purchase). |
| R6 | Reserving stock for an order is **not** done: the availability checks compare the requirement with the quantity on hand only (as today). |
| R7 | Dates and times in the local calendar, the user who pressed the button is stored on the movement. |

## 4. Roles

"Stock" is not a department (`user_account_req.md`): Factory and Purchase users see it, as the menu already does.

| Who | May |
|---|---|
| Factory or Purchase, any role | view T1, T2 and the item sheets |
| Factory or Purchase **Worker** | create / edit a draft adjustment, Request approval, Back to draft, Cancel their own draft |
| Factory or Purchase **Manager** | all of the above, plus Approve and Reject |
| A user from another department (Sale, Accounting) | no Stock menu; the address gives the same "no access" page as Factory does |

An author cannot approve their own adjustment (a Manager may approve anyone else's; for the demo with one Manager see Q7).

## 5. Links with the other modules (the second half of the build)

1. **Factory — Work Order Start** books `consume` for every BOM material × the work order quantity from WH-R. If any material is short the Start is refused (R3) and the message lists the materials ("Compressor: needs 12, has 8"). The Work Order sheet already shows the availability card for a draft or scheduled order; after the start it shows "Materials issued" with the quantities. **Back to previous status / Cancel after the start** book the opposite movements.
2. **Factory — Finished goods transfer**: when a transfer becomes **Transferred**, `produce` adds the product quantity to the chosen warehouse; reverting the transfer takes it out again (refused if it was already delivered and the balance would go negative).
3. **Sale — Delivery**: when a delivery note becomes **Delivered**, `deliver` takes the product quantity out of WH-F (R3 refuses it when the stock is not enough). Reverting is not offered today, so there is no opposite movement.
4. **Master data — Materials**: the *On hand* number of the material list and sheet is read from Stock (it stays read-only); the master data mock no longer keeps its own copy.
5. **Sale and Factory availability checks** (`/sale/availability`, `/factory/availability`) read the same balances (WH-R), so all three places agree.
6. **Dashboard**: the stock alerts block is built from the real balances and the same rule (R5) instead of four hard-coded rows; a link on each row opens the item sheet.
7. **Purchase (a later module)**: Goods receipt will book `receipt` with the lot number, and the Purchase stock status board will reuse the same status function. Until then the seed contains a few `receipt` movements with a document number but no link.

## 6. Mock data (so every screen has something to show)

- Balances: the 6 materials of the master data in WH-R and the 2–3 products in WH-F, with numbers that give a mix of Shortage / Near shortage / Normal for materials (COMP, FOAM short · STEEL, DOOR near · SHELF normal …).
- Movements are **generated from the seed documents** so that the history agrees with the other modules: an `opening` movement per item, `receipt`s for a few materials, `consume` for the Work Orders that are In process or Finished, `produce` for the transferred transfers, `deliver` for delivered delivery notes, one approved `adjust`. The sum of each item's movements equals its balance.
- Adjustments: 5 seeded: one of each status, with the Stock manager user (Factory Manager) and a Purchase user (Purchase Manager) as authors and approvers.
- The latency, error simulation (`?mock=...`) and the 403 for other departments work as in the other mocks.

## 7. Parts

| Part | New / reused |
|---|---|
| `services/mock/stock.js`, `stock.service.js`, `config/stock.js` | new |
| `pages/stock/overview/` (`StockOverviewPage`, `StockItemSheet`) | new, reuse `DocumentListPage` (without a status stepper), `RecordSheet` cards |
| `pages/stock/movements/StockMovementsPage` | new, reuse `DataTable`, `ListToolbar` |
| `pages/stock/adjustments/` (`AdjustmentsPage`, `AdjustmentSheet`, `adjustmentSchema`) | new, reuse `DocumentListPage` with `stepper`, `DocumentSheet`, `DocumentActions namespace="stock"` |
| `components/stock/` (`StockStatusBadge`, `MovementQty`, `MovementTypeLabel`) | new, small |
| `i18n` `stock` namespace (EN, JA keys empty), `nav.json` texts already exist | new |
| Changes in `services/mock/factory.js`, `sale.js`, `masterData.js`, `dashboard.js` | the links of section 5 |
| Tests | rule tests (R1–R7, status function, each link and its revert), mock route tests (as `factory.test.js`), component tests, a browser check as Factory Manager, Factory Worker, Purchase Manager and a Sale user |
| Docs | `docs/api/stock.md`, update of `api/factory.md`, `api/sale.md`, `api/master-data.md`, `api/dashboard.md` for the changed behaviour, ticks of section 4 in `docs/test.txt`, `pages-progress.md` |

## 8. Out of scope for now

Stock reservation for orders (R6) · lot / batch numbers and the traceability screen (a later module, `aditional_req.md` §3) · moving stock between warehouses · stock counts by scanning · valuation (cost per unit) and stock value reports · printing · Excel export · unit conversion.

## 9. Questions (★ = my suggestion)

| # | Question | Options |
|---|---|---|
| Q1 | When do the materials leave WH-R | ★ at **Work Order Start** (whole BOM × quantity) · at Finish · by hand per step |
| Q2 | If a material is short at Start | ★ refuse the Start and list what is missing · allow it and let the stock go negative · Manager may override with a reason |
| Q3 | When do finished products enter WH-F | ★ when the **transfer is Transferred** (not at Finish, because they are still on the line) · at Finish |
| Q4 | Delivery takes products out | ★ at **Delivered**, refused when WH-F has less · at Mark ready |
| Q5 | Adjustment approval | ★ Worker requests, **Manager approves** (as in the plan) · no approval, the author books it directly |
| Q6 | The overview rows | ★ one row per item **per warehouse** · one row per item with the total |
| Q7 | Can a Manager approve their own adjustment | ★ no, another Manager must (the demo has a Factory Manager and a Purchase Manager) · yes |
| Q8 | Who sees Stock | ★ Factory and Purchase users (as the menu is now) · also Sale (read-only overview of products) |
| Q9 | Product status in the overview | ★ In stock / Out of stock only (no reorder point on products) · add a reorder point to products |
| Q10 | Numbers | ★ `ADJ-2026-0001` like the other documents · other format |
| Q11 | Where the master data "On hand" comes from | ★ read from Stock (one source of truth) · keep as it is |
| Q12 | Dashboard stock alerts | ★ built from the real balances, link to the item sheet · leave the sample rows |

When you answer (or say "take the suggestions"), the build starts with T0, then T1, T2, T3 and the links of section 5, each page checked in the browser, then the API doc, the tests and the ticks in `test.txt`.

---

## 10. Differences between this draft and what was built

- The Dashboard "Stock alerts" link on a row opens the **item sheet** (`/stock/materials/:id`) for Factory and Purchase users; the "view all" link opens the Stock overview for Factory users (Purchase users keep the link to the stock status board, which is built with the Purchase module).
- A Purchase **Manager** demo user was added (`hana@kanou.test` / `hana1234`) so that an adjustment written by the Factory Manager can be approved by somebody else.
- The Work Order sheet shows a **Materials issued** card (the net quantity booked for that work order) once it has started.
- An approval books *the counted quantity − the quantity on hand at approval time* (not the difference seen at request time), and the sheet shows a warning line when the stock changed in between.
- Status keys added to the shared status texts / colours: `pending` (Pending approval) and `approved`; the stepper unit `adjustments`.

## 11. Changes after reading `Sotck_req.md` (decided: "take the suggestions")

`Sotck_req.md` was empty when this spec was written; it has content now. Compared with it:

- **Available quantity** (Stock Balance: available = on hand − reserved for open WOs or deliveries): reservation is now built (R6 is replaced). The overview has *Reserved* and *Available* columns; scheduled work orders reserve their BOM materials and draft delivery notes reserve their products; the Sale and Factory availability checks and the item sheet use *available*. The status (Shortage / Near / Normal) is still judged on *on hand*.
- **Opening quantities by warehouse** (flow step 1): an adjustment with the reason **Opening balance**, offered only for an item that has no movement in that warehouse yet (the item sheet shows "Set opening quantity"). The approval books a movement of type *Opening Balance*.
- **Stock Movement fields**: a **Movement No.** (`MV-2026-0001`) and **From → To** (warehouse and document) were added; the movement types are named as in the requirement (Opening Balance, Purchase Receipt, WO Material Issue, Factory Finished Goods Receipt, Sale Delivery, Adjustment).
- **Reorder level optional**: a material may have no reorder point; its stock status is then "No reorder point" and it does not appear in the dashboard alerts.
- **Kept as built**: the materials leave the warehouse automatically, all at once, when the work order starts (the requirement's partial *WO Material Issue* document is not built; a document with partial issues can replace it later).
- **Goods receipt**: the requirement says Stock confirms the received quantities while `test.txt` puts the Goods receipt page (P5) in Purchase. Decision: Purchase owns the page; a Stock user can also confirm a receipt; it books the *Purchase Receipt* movement (to be built with the Purchase module).
