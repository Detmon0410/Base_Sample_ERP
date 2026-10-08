# F9 Spec — Purchase module (P1–P5 and the links with Stock, Master data and the Dashboard)

Status: **APPROVED with the suggested answers (★) for Q1–Q12. BUILT with mock data** (differences: section 10) · Rule as before: spec → review → build with mock data → API doc (`docs/api/purchase.md`) → tests.
Sources: `BaseRequirement_md/Purchase_req.md` (flow, PO, Goods Receipt, rules) · `Sotck_req.md` (receipt into the raw material warehouse) · `aditional_req.md` §2 (shortage status, supplier suggestion from SupplierMaterial) · `master_data_req.md` (Supplier, SupplierMaterial) · `user_account_req.md` (a Manager approves a PO, a Worker creates it) · `Accounting_req.md` (the supplier bill refers to the PO / receipt) · `docs/frontend-plan.md` §3.6 (P1–P5) · `docs/test.txt` section 5 · `docs/specs/f8-stock.md` (the stock ledger the receipts book into).

Carried-over decisions: JPY only (the "currency" of the requirement is always JPY) · desktop (≥ 1280px) · EN first, JA keys empty with EN fallback · no visible page title · details open as the **side sheet** · **manual first** (a status moves only when a person presses a button, with a history line; the one exception is the same as in Sale: posting the receipt that completes a PO moves the PO to Received) · tables 15px `#666`, status stepper above lists with a status (the header eye hides it), quiet header buttons, shared parts reused (`DocumentListPage`, `DocumentSheet`, `DocumentActions namespace="purchase"`, `StatusStepper`, `EntitySelect`, `DateField`, `HistoryCard` / `LinksCard`, `useRecordForm`, `ConfirmDialog`).

---

## 1. The main idea

Stock tells the user what is low; Purchase turns that into an order and brings the goods back into Stock:

```text
Stock status board (P1)  ──"Create PO"──▶  Purchase Order (P2–P4)  ──"Receive goods"──▶  Goods Receipt (P5)
 on hand · available · on order            Draft → Sent → Partially Received → Received → Closed        │
 reorder point · status · suggested supplier                                                              ▼
                                                                          Stock movement "Purchase Receipt" (+ accepted quantity, WH-R)
```

- The **stock status board** is the starting point: a material in shortage or near shortage, what is already **on order** (open PO quantity, so nobody orders twice), and the supplier to buy from (from the supplier–material links: price and lead time).
- A **PO** is created directly, no material request. It is a document in the same style as the Sale documents: list with stepper, one sheet for the form and the detail, status buttons with a confirmation and a history line.
- A **Goods Receipt** records what really arrived against a PO: delivered, accepted and rejected quantities per line. Only the **accepted** quantity, on a **posted** receipt, books a `receipt` movement into the raw material warehouse (Stock already shows these as "Purchase Receipt").
- The supplier invoice and the payment stay in **Accounting**; the PO and the receipt give it their numbers (the sheets show "Supplier bill: not recorded" until that module exists).

## 2. Pages (build in this order)

| # | Page | Route | What it is |
|---|---|---|---|
| P0 | Foundation | – | `services/mock/purchase.js` (POs, receipts, suggestions), `purchase.service.js`, `config/purchase.js` (statuses, who may do what), `purchase` texts, status keys and colours, then the links of section 5 |
| P1 | Stock status board | `/purchase/stock-status` | the materials with their stock status, on order, suggested supplier and a Create PO button |
| P2 | PO list | `/purchase/orders` | list with status stepper, search, filters |
| P3–P4 | PO form and detail | `/purchase/orders/new`, `/:id` | one sheet: draft is editable, every other status is read only, with the receipt progress per line |
| P5 | Goods receipts | `/purchase/receipts`, `/new`, `/:id` | list with stepper (Draft, Posted, Cancelled), one sheet to enter and post a receipt |

### P1 Stock status board

- **Table** (materials, one row per material, all warehouses together): Code · Name · On hand · Available (the Stock numbers) · **On order** (open PO quantity: ordered − accepted on POs that are Sent / Partially Received) · Reorder point · Status badge (Shortage / Near shortage / Normal / No reorder point — the Stock rule) · **Suggested supplier** (the active supplier of this material with the lowest unit price, ties by the shortest lead time: "CompCo · ¥3,800 · 14 days") · button **Create PO**.
- Default view: only **Shortage and Near shortage** (a switch "Show all materials"). Sorted: shortage first, then by on hand / reorder point. Status filter, search (code, name), and a stepper-like count strip is not used (the status is the filter).
- A material that is already covered by open POs shows "On order 100 pcs" in blue next to the status (so the user can see it is on its way); the board does **not** hide it.
- **Create PO** opens a new PO sheet with the supplier, the material and the **reorder quantity** (master data `reorderQty`, else the quantity that brings the stock up to 2 × the reorder point) and the supplier's price filled in; nothing is saved until the user presses Save. If the material has no supplier link the button is disabled with the reason "No supplier sells this material. Add one in Master data."
- One PO is made for **one material** at a time (the Create PO button of the row). There is no tick box and no "one PO for several materials" button (removed on request).

### P2 PO list

- **Columns**: PO No. · Date · Supplier · Expected delivery · Lines (count) · Total (¥, right) · Received (a small bar "12 of 20 pcs" of the whole PO) · Status badge. Footer: number of rows and the total (like Sale lists).
- **Stepper** with counts: Draft · Sent · Partially received · Received · Closed · Cancelled. **Filters**: supplier, material, date range (PO date), expected delivery range. Search: PO number, supplier, material code / name. Default sort: newest first.
- A PO whose expected delivery date is past and that is not Received / Closed / Cancelled shows an amber **"N days late"** (like Work Orders; nothing changes by itself).
- New PO button: for Purchase Worker, Manager and Admin.

### P3–P4 PO sheet

```text
┌ PO-2026-0003   [Partially received]            [Receive goods] [Close remaining] [Cancel]  ───  Save ┐
│ ┌ Purchase order ───────────────────────────────────────────────────────────────────────────────┐    │
│ │ Supplier [CompCo ▾]   Date [2026-10-08]   Expected delivery [2026-10-22]                      │    │
│ │ Deliver to [WH-R ▾]   Buyer Ken Suzuki    Remarks [............]                              │    │
│ │ Supplier contact · Mori · 06-1111-2222 · sales@compco.example.jp (from the supplier master)   │    │
│ └───────────────────────────────────────────────────────────────────────────────────────────────┘    │
│ ┌ Lines ───────────────────────────────────────────────────────────────────────────────────────┐    │
│ │ Material        Ordered  Unit price  Amount     Received  Open     [x]                       │    │
│ │ COMP Compressor  100 pcs  ¥3,800    ¥380,000    60 pcs    40 pcs                             │    │
│ │ + Add a material                                  Subtotal / Tax / Total                     │    │
│ └───────────────────────────────────────────────────────────────────────────────────────────────┘    │
│  Goods receipts (list with numbers and status) · Status history · Linked documents                 │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Draft** is editable (Worker who created it, Manager, Admin). The **line table is the same one as the quotation lines** (material picker, quantity, price, amount, "+ Add a material", footer rows) with these rules: the supplier is chosen first; the material list shows **only the materials that supplier sells** (supplier–material links); choosing a material fills the **unit price** from the link (the user may change it; a small "list price ¥3,800" hint shows the difference) and sets the expected delivery to PO date + the longest lead time of the lines when the user has not typed one. Quantity > 0 (decimals up to 3 for kg / m, whole for pieces), price ≥ 0, at least one line, no material twice.
- **Tax**: the same consumption tax rule as Sale (10 %, rounded down) shown as Subtotal / Tax / Total, so the supplier bill matches (Q9).
- **Received / Open** columns appear after the PO is sent: *Received* = accepted quantity on posted receipts; *Open* = ordered − received (never below 0). A line with an open quantity of 0 gets a green check.
- **Receipts card**: the goods receipts of this PO (number, date, status, accepted quantity) as links.
- **Changing a sent PO** is not possible (Q8): to change it, the Manager cancels it (only while nothing is received) and a new one is made. Over-receiving is refused (rule R4).
- Cards at the bottom: Status history, Linked documents (the receipts and the "Supplier bill — not recorded" placeholder).

**Status buttons** (each with a confirmation and an optional / required note, like Sale):

| Status | Who | Buttons |
|---|---|---|
| Draft | Worker (own), Manager, Admin | Save · Delete · **Cancel** (note optional) |
| Draft | **Manager, Admin** | **Send to supplier** (primary; this is the approval of the PO, Q1) |
| Sent | Manager, Admin | **Back to draft** (only while nothing is received) · **Cancel** (note required, only while nothing is received) |
| Sent, Partially received | Worker, Manager, Admin | **Receive goods** (opens a new goods receipt for this PO, prefilled with the open quantities) |
| Partially received | Manager, Admin | **Close remaining** (note required: what was not delivered; closes the PO with the open quantity left unreceived) |
| Received | Manager, Admin | **Close** (the PO is finished) |
| any | Manager, Admin | **Revert** (back to the previous status, note required; not while a posted receipt would be left behind) |

Status changes made by a document: posting a receipt moves **Sent → Partially received** or **→ Received** when every line has nothing open; cancelling a posted receipt (see P5) moves it back. Nothing else changes a status by itself.

### P5 Goods receipts

- **List** (stepper Draft · Posted · Cancelled): GR No. · Receipt date · PO No. · Supplier · Receiving warehouse · Accepted (sum of accepted, with units of the first line when one unit) · Received by · Status. Filters: supplier, PO, date range. Search: GR number, PO number, supplier, material.
- **Sheet** (new from a PO only: `Receive goods` on the PO, or `New receipt` on the list where a PO is chosen from the Sent / Partially received ones):
  - Header: Receipt date · PO (read only after choosing) · Supplier (from the PO) · Receiving warehouse (default the PO's, a raw material warehouse) · Received by (the user) · **Delivery note no.** of the supplier (optional text) · Remarks.
  - **Lines** (one per PO line with an open quantity): Material · Ordered · Received before · **Open** · **Delivered now** · **Accepted** · **Rejected** (= delivered − accepted, shown) · **Rejection reason** (required when rejected > 0; a short list: Damaged, Wrong item, Wrong quantity, Quality, Other + note) · **Lot no.** (optional text; for traceability, Q6). Defaults: delivered = accepted = open; the user lowers them to what really came.
  - Rules: delivered ≥ 0, accepted ≥ 0, accepted ≤ delivered, **accepted ≤ open** (R4; otherwise `TOO_MANY` on the line); at least one line with delivered > 0.
  - **Draft** can be edited / deleted. **Post** (primary button, Purchase Worker, Manager, Admin; Q4) books the stock movements and moves the PO; it asks for confirmation and cannot be done twice (R5). **Cancel** a draft. **Cancel a posted receipt** (Manager, note required): books the opposite stock movement (refused with "Not enough stock" if the materials were already used) and gives the quantity back to the PO.
  - Cards: Status history, Linked documents (the PO, the stock movements — a link to `/stock/movements?q=GR-…`).

## 3. Rules

| # | Rule |
|---|---|
| R1 | A PO needs an **active** supplier and only materials that supplier sells (an active link). Inactive supplier or material → `400` with the field. The destination is a **raw material** warehouse. |
| R2 | Quantity > 0, price ≥ 0, whole numbers for pieces, up to 3 decimals for kg / m (the Stock rule), no material twice on one PO. |
| R3 | A **cancelled** or **closed** PO cannot receive goods; a **draft** PO cannot receive goods either (it must be sent first). |
| R4 | The cumulative **accepted** quantity of a PO line cannot exceed the ordered quantity (drafts of other receipts do not count; a posted receipt does). There is no PO change to allow more (Q8). |
| R5 | A receipt is posted **once**: a second Post, or a Post of a cancelled receipt, is `409 INVALID_STATUS`. All its stock lines are booked together or not at all. |
| R6 | Only **accepted** quantity enters Stock; rejected quantity is only recorded and stays open on the PO (the supplier is expected to deliver it again) unless the PO is closed. |
| R7 | PO number `PO-2026-0001`, receipt number `GR-2026-0001` (prefix, year of the document date, 4 digits, running per year, created by the server on the first save). |
| R8 | **Open PO quantity** of a material = Σ (ordered − accepted, min 0) over the lines of POs that are **Sent** or **Partially received**; it is the number shown as "On order". |
| R9 | The suggested supplier is only a suggestion; the user may pick any supplier that sells the material. |
| R10 | A supplier or material that has a PO cannot be deleted from master data (it can be deactivated). |

## 4. Roles

Purchase is a department. Same pattern as Sale and Factory:

| Who | May |
|---|---|
| Purchase **Worker** | create / edit / delete **their own draft** PO, cancel a draft, **Receive goods**, create / edit / delete / **post** a goods receipt, see everything in Purchase |
| Purchase **Manager** and **Admin** | all of the above on anybody's documents, plus **Send to supplier**, Back to draft, Cancel a sent PO, Close remaining, Close, Revert, cancel a posted receipt |
| Anyone else | no Purchase menu; `403` on every `/purchase/*` call. A Factory user sees the PO quantities through the **On order** column and the open POs of an item in the Stock pages (read only) |

(Alice Sato, a Sale Manager and a Purchase Worker, is the demo case of "creates but cannot send"; Hana Ito is the Purchase Manager.)

## 5. Links with the other modules (the second half of the build)

1. **Stock — receipt**: posting a receipt books `receipt` movements (accepted quantity, receiving warehouse, document = the GR) with the lot number in the note. The movement's document link now opens the receipt (`/purchase/receipts/:id`, shown to Purchase users). Cancelling a posted receipt books the opposite lines.
2. **Stock — seed**: the three seeded receipts of the Stock demo (`GR-2026-0001…0003`, COMP / STEEL / FOAM) are produced by seeded POs and receipts, so the numbers, links and totals agree; the opening balances still make the final numbers.
3. **Stock overview and item sheet**: a column / line **On order** (R8) next to Reserved / Available, and in the item sheet a card **Open purchase orders** (PO, supplier, open quantity, expected delivery) with links for Purchase users.
4. **Master data — Suppliers and Materials**: a supplier or material used by a PO cannot be deleted (R10); the supplier sheet's "Materials supplied" list stays the source of prices; the material sheet could show its open POs (not in v1).
5. **Dashboard**: KPI "PO waiting for goods" (count of Sent / Partially received POs and the next expected delivery date) and the stock alerts are real; the **approvals** block for a Purchase Manager lists **Draft POs waiting to be sent** (Q10).
6. **Accounting (later)**: the PO and the receipt expose `number`, `supplier`, `total` and the posted receipts so a supplier bill can refer to them; nothing is built now.
7. **Navigation**: the Purchase group already has the three entries (Stock status board, Purchase Orders, Goods receipt); no new menu items.

## 6. Mock data

- Suppliers, materials and the supplier–material links already exist (CompCo, SteelCo, BackupCo; 7 links with price and lead time).
- **6 POs**, one per status, on the seeded suppliers: Draft (Ken's / Alice's), Sent (nothing received), Partially received (2 of 3 lines partly received, one receipt with a rejected quantity), Received, Closed (with a "closed remaining" note), Cancelled. Totals consistent with the line prices; expected delivery dates around today (one in the past → "N days late").
- **5 receipts**: the three of the Stock seed (posted), one more posted with a rejection reason, one **draft** on the partially received PO, one cancelled.
- Latency, the `?mock=` error simulation and the 403 for other departments as in the other mocks.

## 7. Parts

| Part | New / reused |
|---|---|
| `services/mock/purchase.js`, `purchase.service.js`, `config/purchase.js` | new |
| `pages/purchase/stock-status/` | new, reuse `DocumentListPage` (without a stepper), `StockStatusBadge` |
| `pages/purchase/orders/` (`PurchaseOrdersPage`, `PurchaseOrderSheet`, `purchaseOrderSchema`) | new, reuse `DocumentListPage` with `stepper`, `DocumentSheet`, `DocumentActions`, the **document lines table** and totals footer of Sale |
| `pages/purchase/receipts/` (`GoodsReceiptsPage`, `GoodsReceiptSheet`, `receiptSchema`) | new, reuse the same list and sheet parts |
| `components/purchase/` (`ReceiptProgress`, `SupplierSuggestion`, `OpenOrdersCard`) | new, small |
| `i18n` `purchase` namespace; status keys `partially_received`, `received`, `posted` in the shared status texts, colours, icons and the stepper units | new |
| Changes in `services/mock/stock.js` (seed receipts come from Purchase), `dashboard.js`, `masterData.js` (R10), the Stock overview / item sheet, `DOC_PATH` of Stock | the links of section 5 |
| Tests | rule tests (R1–R10), mock route tests as `stock.test.js` (who may do what, receipts post once, open quantity, stock movements and reverts, 403), component tests, a browser check as Purchase Worker, Purchase Manager, Factory Manager and a Sale user |
| Docs | `docs/api/purchase.md`, updates of `api/stock.md`, `api/master-data.md`, `api/dashboard.md`, ticks of section 5 in `docs/test.txt`, `pages-progress.md` |

## 8. Out of scope for now

Supplier bills and payments (Accounting) · printing or e-mailing the PO to the supplier · a PO **change** (more quantity after sending) and its approval · purchase requests / approval by amount · multi-currency (JPY only) · supplier prices history and price list upload · returns to the supplier after posting · landed costs / unit cost valuation · lot / batch traceability screens (the lot number is only stored and shown) · receipts without a PO · automatic reordering (the requirement says it must not happen).

## 9. Questions (★ = my suggestion)

| # | Question | Options |
|---|---|---|
| Q1 | Approval of a PO | ★ a Worker drafts, **only a Manager sends** (Send = approval; no extra status, as in `Purchase_req.md`) · add an "Approved" status between Draft and Sent · no approval at all |
| Q2 | Stock status board contents | ★ the materials in **shortage / near shortage** by default, a switch for all, with On order and a suggested supplier · all materials always |
| Q3 | Creating a PO from the board | ★ one material per Create PO button (the tick-several-rows option was removed on request) |
| Q4 | Who posts a goods receipt | ★ Purchase Worker, Manager, Admin · only a Manager · also Factory users (they run the warehouse) |
| Q5 | Reorder quantity on Create PO | ★ the material's reorder quantity, else up to 2 × reorder point · always empty, the user types it |
| Q6 | Lot number | ★ an optional text per receipt line, stored and shown on the movement note · not at all now · required |
| Q7 | Rejected quantity | ★ stays open on the PO (the supplier delivers again) · reduces the PO line (counted as closed) |
| Q8 | Changing a sent PO | ★ not possible: cancel (while nothing is received) and make a new one; over-receiving is refused · allow editing quantities of a sent PO by a Manager |
| Q9 | Tax on a PO | ★ show Subtotal / Tax (10 %) / Total like Sale · prices are tax-excluded and only the subtotal is shown |
| Q10 | Dashboard | ★ real "PO waiting for goods" KPI and Draft POs waiting for a Manager in the approvals block · only the KPI |
| Q11 | Stock link | ★ On order column in the Stock overview and an Open purchase orders card in the item sheet · none |
| Q12 | Numbers | ★ `PO-2026-0001`, `GR-2026-0001` · other format |

When you answer (or say "take the suggestions"), the build starts with P0, then P1 → P5 and the links of section 5, each page checked in the browser, then the API doc, the tests and the ticks in `test.txt`.

---

## 10. Differences between this draft and what was built

- The three seeded receipts of the Stock demo are now **GR-2026-0001** (COMP 100), **0002** (STEEL 600) and **0004** (FOAM 300 of 320, 20 rejected for quality); **GR-2026-0003** is a receipt of doors with a rejection (25 delivered, 20 accepted) that arrived before the first work order. Receipt numbers follow the order of the dates.
- The seeded POs are 7 (Received × 2, Partially received, Closed with the note "The supplier cannot deliver the last 100 kg", Cancelled, Sent, Draft) and the receipts 6 (4 posted, 1 draft, 1 cancelled).
- **Create PO for several materials** is a plain checkbox column plus a button that appears from the second ticked row; it is enabled only when one supplier sells all the ticked materials, and it picks the cheapest such supplier.
- The board's **Needs attention | All materials** switch is in the URL (`?scope=all`); a status filter overrides it.
- The status stepper units `purchaseOrders` and `receipts` and the status keys `partially_received`, `received`, `posted` were added to the shared status texts, colours and icons.
- The PO sheet shows the receipts of the PO as a card of links, and the **Receive goods** button next to the status buttons (it opens a new receipt and is disabled while the form has unsaved changes).
- The Stock overview has an **On order** column, and the Stock item sheet an **Open purchase orders** card (the number is a link for Purchase users only).
