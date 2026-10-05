# F6 Spec — Sale module (S1–S8)

Status: **APPROVED with the suggested answers (★) for Q1–Q16. BUILT (all of S1–S8) with mock data** · API: [../api/sale.md](../api/sale.md) · the differences from this draft are in section 11
After approval: build the pages with mock data, then write `docs/api/sale.md` for the backend (the usual rule: spec → review → mock build → API doc).

Why now: all of master data (customers, products, BOM, price lists, UoM, warehouses) is done, and the shared parts exist (detail sheet, foldable-free cards, status history, linked documents, approval actions, searchable select, record form hook). Sale is the first module that uses them for **documents with lines**.

Carried-over decisions: JPY only (whole yen) · desktop only (≥ 1280px, reflows at 200% zoom) · EN first, JA keys empty with EN fallback · no visible page title (breadcrumb only) · details open in the **right-side sheet** over the list (resizable, remembered width, header actions as icons, grey body with white shadowed cards) · status shown with text + icon, never color alone · controls 45px · mock data first.

---

## 1. Scope and flow

| ID | Page | Route | Pri |
|---|---|---|---|
| S1 | Quotations (list) | `/sale/quotations` | P1 |
| S2 | Quotation form (new / edit a draft) | `/sale/quotations/new`, `/:id` | P1 |
| S3 | Quotation detail | `/sale/quotations/:id` | P1 |
| S4 | Customer POs (list + entry) | `/sale/customer-pos`, `/new`, `/:id` | P1 |
| S5 | Sale Orders (list) | `/sale/orders` | P1 |
| S6 | Sale Order form | `/sale/orders/new`, `/:id` | P1 |
| S7 | Sale Order detail | `/sale/orders/:id` | P1 |
| S8 | Delivery Notes (list + detail) | `/sale/deliveries`, `/:id` | P1 |

```text
Create QT ─► Send to customer ─► Customer accepts ─► (Customer PO received) ─► Create SO ─► Confirm
   ─► Send to Factory ─► (Factory produces) ─► Ready to deliver ─► Delivery Note ─► Delivered ─► Closed
```

Build order: **shared document parts → S1–S3 Quotations → S4 Customer POs → S5–S7 Sale Orders → S8 Delivery Notes.**

Form and detail of one document are **one sheet** (S2 + S3, S6 + S7): a draft opens editable, every other status opens read-only with the actions of that status. Routes keep `/new` and `/:id`.

---

## 2. Who can do what (`user_account_req.md`)

| Who | Can |
|---|---|
| Sale **Worker** | create and edit **drafts** of QT / SO / DN, send a QT, record a Customer PO, check availability |
| Sale **Manager** | everything a Worker can, **plus approve** (see Q2) |
| **Admin** | everything, in every department |
| Anyone else | no Sale menu; opening `/sale/...` shows the 403 page (already built) |

The UI hides or disables actions the user cannot use (never an enabled button that fails); the API must enforce the same rules. The approval waiting note and Approve / Reject buttons come from the existing `ApprovalActions` (department `Sale`).

### 2.1 Manual first (the main principle of this module)

Factory, Stock-out, Accounting and the other modules are not built yet, and even later the business may want to decide by hand. So **no status changes by itself**: every step is a **button that a person presses in Sale**, with a short confirmation that says exactly what will happen, an optional note, and a line in the status history (who, when, note).

- Buttons appear only when the document is in the right status and the user has the right role; others see the status as plain text.
- The statuses that other modules would move later (**In Production, Ready to Deliver, Delivered, Closed**) have their own manual buttons now (see 3.3 and 3.4). When Factory / Delivery / Accounting exist they can call the same actions; the buttons stay for Manager / Admin as a manual override (Q13).
- Nothing is automatic, **not even expiry**: a quotation past its "valid until" date shows a warning and the **Mark expired** button; nothing flips by itself (Q16).
- A wrong click can be undone by a Manager: **Revert to previous status** with a required reason, recorded in the history (Q15).

---

## 3. Documents, statuses and actions

Numbers: `QT-2026-0001`, `SO-2026-0001`, `DN-2026-0001` — prefix, year, 4-digit running number per type and year, created by the server when the document is first saved (Q1). The Customer PO keeps the **customer's own** PO number.

### 3.1 Quotation (QT)

| Status | Meaning | Actions (who) |
|---|---|---|
| **Draft** | being written | Edit, Save, Delete (Worker+) · **Send** (Worker+; needs approval first if Q2 asks for it). "Send" records that the quotation was sent (date, note); the system does not e-mail it |
| **Sent** | sent to the customer | **Mark accepted**, **Mark rejected** (Worker+), Create SO (only when Accepted) |
| **Accepted** | customer agreed | **Create SO** |
| **Rejected** | customer said no | none (read-only) |
| **Expired** | past "valid until" without an answer | none. Set by hand with **Mark expired** (Worker+) on a Sent quotation; past the date the sheet shows "Past valid-until date" as a warning |

Fields: QT No., date, customer, sales person (employee, default = the signed-in user's employee if any, else choose), valid until (default date + 30 days, Q4), remarks, lines.
Line: product, qty (> 0, whole units; decimals not needed for finished goods), unit price (¥, default from the **customer's price list** for that product on the document date, else the product's selling price; editable), amount (= qty × unit price).
Totals: subtotal, consumption tax, total (Q3).

### 3.2 Customer PO (S4)

A **record of a document that came from the customer**, not generated by the system: Customer PO No. (theirs), PO date, customer, attachment (PDF / image), note, and links to a QT and later the SO made from it.
Status: none (a PO is just recorded). It can be **edited / deleted** until an SO references it; after that read-only (Q5).
Attachment: choose a file (≤ 10 MB, PDF / PNG / JPG); in the mock the file name and size are kept, the real upload (multipart) is documented in the API file.

### 3.3 Sale Order (SO)

| Status | Meaning | Actions (who) |
|---|---|---|
| **Draft** | being written (often created from a QT) | Edit, Save, Delete · **Confirm** (needs Manager approval if Q2 asks for it) |
| **Confirmed** | accepted by Sale | **Send to Factory** (records the request and moves to In Production), **Cancel** |
| **In Production** | the factory is making it | **Mark ready to deliver** (Worker+, Q14), **Cancel** (Manager / Admin, with a reason, Q6) |
| **Ready to Deliver** | finished goods are ready | **Create Delivery Note** (as many as needed, Q9) |
| **Delivered** | every quantity is delivered (set when the last Delivery Note is confirmed) | **Close order** (Manager, Q14) |
| **Closed** | finished | none |
| **Cancelled** | stopped before delivery | none |

Fields: SO No., date, customer, **reference QT** (optional, picks only Accepted QTs of the same customer), **reference Customer PO** (optional, same customer), sales person, **requested delivery date**, remarks, lines (as QT), totals.
When created from a QT, customer, lines and prices are copied (editable until Confirmed).
Every status change above is a **manual button** (section 2.1). Linked documents show what exists: Delivery Notes are real; Factory work orders and Accounting invoices appear as plain text placeholders ("WO — not recorded here") until those modules exist, so nothing depends on them. The seed data has sale orders in every status so all screens can be reviewed.

### 3.3.1 Material availability check (aditional_req §1)

Shown as a card **"Material availability"** on QT and SO (draft: a **Check availability** button; also re-checks when lines change; read-only documents show the last result).

```text
for every line: BOM of the product × qty   →  sum per material over ALL lines of the document
compare with stock on hand of that material (Raw Material warehouse)
result: Can produce — yes / no, and a shortfall list: material, required, available, missing, unit
```

Example from the requirement: 10 × RF-2D needs 10 COMP, 20 DOOR, 35 kg FOAM; with only 8 COMP: "Cannot fully produce — short 2 COMP".
Rules: only materials of the BOM count; a product with an **empty BOM** shows "No BOM defined" for that line (cannot check); stock **already needed by other open SOs is not subtracted** in v1 (Q7); an unavailable result **does not block** saving or sending, it is advice (Q8).
Mock: `onHand` from the materials master data; BOM from Products.

### 3.4 Delivery Note (DN)

| Status | Actions |
|---|---|
| **Draft** | Edit delivered quantities, Delete, **Confirm delivery** (Worker+) |
| **Delivered** | none (read-only) |

Created from an SO in *Ready to Deliver*: lines = remaining undelivered quantities, editable down to 0 but never above the remaining quantity (Q9: partial deliveries allowed). Fields: DN No., date, SO ref, customer (from the SO), warehouse (finished goods warehouse, default the first), lines (product, ordered, already delivered, **deliver now**). **Confirm delivery** is pressed by hand; it moves stock out later (Stock module) and sets the SO to **Delivered** when every line is complete (otherwise the SO stays *Ready to Deliver*).

---

## 4. Pages

### 4.1 Lists (S1, S4, S5, S8)

The same pattern as master data: search + filters above, table, paging below, **New** button on the right, row opens the sheet, empty and "no result" texts, loading skeleton, error with **Try again**, state in the URL.

| Page | Columns | Filters |
|---|---|---|
| S1 Quotations | QT No. · Date · Customer · Sales person · Total · Valid until · Status | search (No., customer), status, customer, date range |
| S4 Customer POs | Customer PO No. · PO date · Customer · Linked QT · Linked SO · Attachment (icon + name) | search, customer, date range |
| S5 Sale Orders | SO No. · Date · Customer · Ref QT · Ref PO · Delivery date · Total · Status | search, status, customer, date range |
| S8 Delivery Notes | DN No. · Date · SO · Customer · Lines · Status | search, status, customer, date range |

Filters: search box, a status select, a customer searchable select, and **From / To** dates; a "Clear search and filters" button when any is set. Default sort: newest document first.
The **New** button is shown only to users who may create (Sale Worker, Manager, Admin).

### 4.2 Document sheet (S2/S3, S6/S7, S8)

Wider than master data sheets: default **880px** (still draggable, remembered per kind).

```text
┌ Header: QT-2026-0007 [Draft]            [Send] [⋯ icons: delete] [Save] [X] ┐
├ Card  Customer and dates       customer · date · valid until · sales person · remarks
├ Card  Lines                    grid: Product · Qty · Unit price · Amount · remove     [+ Add line]
│       Totals                   Subtotal · Tax · Total
├ Card  Material availability    [Check availability]  Can produce: No — short 2 COMP   (table of shortages)
├ Card  Status history           timeline: who, when, note (reject reason)
└ Card  Linked documents         SO-…, Customer PO …, WO …, DN …, Invoice … (links)
```

- The header shows the status badge (text + icon) and **primary action first** (e.g. Send / Confirm / Send to Factory), icon buttons for delete, **Save** (drafts only) and close. Destructive actions ask first; Delete only on drafts.
- A **Draft** is editable; a document in any other status is read-only with only its status actions. Unsaved edits ask before closing (existing guard).
- Line grid: product chosen with the searchable select (active products only), qty and unit price as numeric inputs (price: changing the customer **re-prices lines that were not edited by hand**, Q10), amount computed, total updates live. A product can appear once per document (add the quantity instead).
- Approval: when a document **needs approval** (Q2) the header shows the existing Approve / Reject (reject needs a reason, written to the status history) to the Sale Manager / Admin, and a "Waiting for approval by the Sale Manager" note to everyone else.
- Status history card: one entry per status change (who, when, note), newest first (existing `StatusTimeline`).
- Linked documents: existing `LinkedDocuments`; items whose module is not built yet are shown as plain text (no link).

### 4.3 Customer PO sheet (S4)

Cards: **Customer PO** (PO No., date, customer, note), **Attachment** (choose / replace / remove file, shows name and size, **Open** link), **Linked documents** (QT / SO links, picks Accepted QTs of the same customer). Delete is blocked once an SO uses it (`IN_USE`).

### 4.4 Dashboard impact

The Sale tile and cards of the Dashboard (open orders, quotations waiting, recent documents) will read these documents later; nothing changes on the Dashboard in this step.

---

## 5. New shared building blocks

| Block | Used for | File (planned) |
|---|---|---|
| `DocumentSheet` | document sheet shell: status badge, primary action, icon actions, wider default width | `components/documents/DocumentSheet.jsx` (builds on `DetailSheet`) |
| `LineItemsCard` | line grid with searchable product select, qty, unit price, amount, add / remove, totals | `components/documents/LineItemsCard.jsx` |
| `TotalsCard` / `DocumentTotals` | subtotal, tax, total in yen | `components/documents/DocumentTotals.jsx` |
| `AvailabilityCard` | "Material availability" panel (button, result, shortage table) | `components/documents/AvailabilityCard.jsx` |
| `DocumentFilters` | search + status + customer + date range bar for the 4 lists | `components/documents/DocumentFilters.jsx` |
| `FileField` | choose / show / remove an attachment | `components/common/FileField.jsx` |
| `useDocumentForm` | like `useRecordForm` but for documents: status actions, approval, number, unsaved guard | `hooks/useDocumentForm.js` |

Reused as they are: `DetailSheet`, `SheetSection`, `StatusTimeline`, `LinkedDocuments`, `ApprovalActions`, `EntitySelect`, `StatusBadge`, `ConfirmDialog`, `DataTable`, `ListPage`, `useListQuery`, `useResourceList`.
Services: `quotation.service`, `customerPo.service`, `saleOrder.service`, `deliveryNote.service`, `availability.service`; mock in `services/mock/sale.js`.

---

## 6. Data (for the mock now, the API doc next)

```text
Quotation      id, number, date, customerId, salesPersonId, validUntil, remarks, status, lines[], totals, history[], createdBy…
SaleOrder      id, number, date, customerId, quotationId?, customerPoId?, salesPersonId, deliveryDate, remarks, status, lines[], totals, history[]
CustomerPo     id, poNumber, poDate, customerId, quotationId?, attachment{ name, size, url }?, note
DeliveryNote   id, number, date, saleOrderId, customerId, warehouseId, status, lines[{ productId, ordered, delivered, deliverNow }]
Line           productId, qty, unitPrice, amount          (amount = qty × unitPrice, whole yen)
Availability   canProduce, lines[{ productId, noBom }], shortages[{ materialId, required, available, missing, uom }]
```

Endpoints (detail in `docs/api/sale.md` when built): CRUD + status actions per document (`POST /sale/quotations/:id/send|accept|reject|approve`, `POST /sale/orders/:id/confirm|send-to-factory|cancel`, `POST /sale/orders/:id/delivery-notes`, `POST /sale/deliveries/:id/confirm`), `POST /sale/availability` (body: lines → result), `GET /master/price-lookup?productId&customerId&date`.
Errors: `INVALID_STATUS` (409, action not allowed in this status), `PERIOD…` not used, `IN_USE`, `VALIDATION_ERROR`, `FORBIDDEN` (not Sale / not Manager).

**Mock records:** ~12 quotations (every status, one expired, one waiting approval), 5 Customer POs (one with an attachment, two linked), ~8 sale orders (every status), 4 delivery notes (draft and delivered). Customers C001–C003, products RF-2D and RF-1D (BOM exists), at least one availability shortage (COMP and DOOR have low stock in the master data).

---

## 7. Accessibility, i18n, states

- Every field has a visible label; required fields say "Required"; errors under the field with `aria-describedby`; the line grid is a real table with column headers, each input has an accessible name like "Quantity, line 2".
- Status is text + icon; "Cannot produce" uses the danger tone **with** an icon and the words, never color alone.
- Filters, buttons and the sheet are keyboard reachable; the Esc key closes the sheet (asks first when edited).
- New i18n namespace `sale` (EN; JA keys empty with EN fallback); document status names and action labels live there.
- States: skeleton rows, empty, no result, error with retry, validation, confirmation for Send / Confirm / Cancel / Delete (says exactly what happens).

---

## 8. Test cases (before each commit)

List: search, status / customer / date filters, URL restored on reload, empty / loading / error, role-based **New** button. Sheet: required fields, line add / remove / duplicate product blocked, totals, price default from the price list, availability yes / no / no BOM, Send → Accept → Create SO → Confirm → Send to Factory → Mark ready → Create DN → Confirm delivery → Close order, every step manual with its confirmation and a history line, Revert with reason, no status changes without a click, reject with reason (history), Worker vs Manager vs non-Sale user (403), read-only after Draft, unsaved-changes guard, Esc, 200% zoom, keyboard-only create → send.

---

## 9. Open questions — pick one option per question (★ = suggested)

Answer like "Q1 A, Q2 B …", or "ตามที่เสนอ" for every ★.

| # | Question | Options |
|---|---|---|
| **Q1** | Document numbers | **A ★** server creates `QT-2026-0001` (type + year + 4 digits, per type and year) when first saved · **B** the user types the number by hand · **C** created automatically but editable until the first save |
| **Q2** | Which documents need **Manager approval** (the requirement says the Manager approves QT/SO but gives no step) | **A ★** only **Sale Order → Confirm** · **B** QT **Send** and SO **Confirm** · **C** no approval at all in Sale (the Manager simply has the same buttons) |
| **Q3** | Consumption tax on QT / SO totals | **A ★** subtotal + **10 % tax** + total, rate in one config, rounded down to whole yen · **B** prices already include tax, no breakdown · **C** no tax in Sale (Accounting adds it on the invoice) |
| **Q4** | Quotation "valid until" default | **A ★** 30 days after the QT date · **B** 14 days · **C** empty (user must choose) |
| **Q5** | Customer PO edited after an SO uses it | **A ★** read-only, delete blocked · **B** always editable · **C** editable except the PO number |
| **Q6** | Cancel an SO that is **In Production** | **A ★** Manager / Admin only, reason required · **B** any Sale user, reason required · **C** not allowed |
| **Q7** | Availability check: subtract material already needed by other open SOs | **A ★** no, stock on hand only (the requirement), noted as "not reserved" · **B** yes, subtract open SOs (Confirmed / In Production) |
| **Q8** | If it **cannot produce** | **A ★** warning only, nothing blocked · **B** block **Confirm** (Manager may override with a note) · **C** block Send and Confirm |
| **Q9** | Partial deliveries | **A ★** yes, several DNs per SO, quantity defaults to the remainder and never above it · **B** one DN per SO for the full quantity |
| **Q10** | Changing the customer on a draft | **A ★** re-price lines whose price was not edited by hand · **B** never re-price · **C** ask each time |
| **Q11** | Sales person | **A ★** pick from Employees (M8) · **B** free text · **C** wait until users are linked to employees |
| **Q12** | Where documents open | **A ★** sheet for form + detail, default 880px (as for all details) · **B** full page for documents |
| **Q13** | Later status steps (In Production → Ready → Delivered → Closed) once other modules exist | **A ★** keep manual buttons now; later the other modules call the same actions and the buttons stay for Manager / Admin as override · **B** manual buttons only, forever · **C** remove the buttons when the modules arrive |
| **Q14** | Who presses the manual steps | **A ★** Worker+ for operational steps (Send, Accept / Reject, Send to Factory, Mark ready, Confirm delivery); Manager / Admin for Confirm (if Q2 needs it), Cancel and **Close order** · **B** any Sale user for every step · **C** only Managers for every step |
| **Q15** | Undo a wrong click | **A ★** Manager / Admin can **Revert to previous status** with a reason, shown in the history · **B** no undo (cancel and create again) · **C** Admin only |
| **Q16** | Quotation expiry | **A ★** manual **Mark expired** button + warning when past the date · **B** automatic at the end of the valid-until day |

---

## 10. Files (planned)

`src/pages/sale/{quotations,customer-pos,orders,deliveries}/…Page.jsx` + `…Sheet.jsx` + schema, `src/components/documents/*`, `src/hooks/useDocumentForm.js`, `src/services/{quotation,customerPo,saleOrder,deliveryNote,availability}.service.js`, `src/services/mock/sale.js`, `src/i18n/locales/{en,ja}/sale.json`, `docs/api/sale.md`; routes: `quotations`, `customerPos`, `saleOrders`, `deliveryNotes` in `IMPLEMENTED_PAGES`.

---

## 11. Built so far (differences from the draft)

| Draft | Built | Why |
|---|---|---|
| New component names `DocumentSheet`, `LineItemsCard`, `TotalsCard`, `AvailabilityCard`, `DocumentFilters`, `FileField`, `useDocumentForm` | `DocumentSheet`, `LineItemsCard`, `DocumentTotals`, `AvailabilityCard`, `DocumentListPage` (with the filter bar inside), `FileField`, `ActionDialog`, `DocumentActions`, `DocumentStatusBadge`, `HistoryCard` / `LinksCard`; **no `useDocumentForm`**: `useRecordForm` got `afterCreatePath` and `applyRecord` and is used for documents too | Less new code; the same hook now serves every sheet |
| Wider sheet "per kind" | `DetailSheet` has `defaultWidth` and `widthKey`; documents default to 880px and remember their own width (`kanou.documentSheetWidth`) | Master data keeps its 672px |
| A saved new document stays in the sheet | After the first save the URL becomes `/sale/.../:id` and the sheet shows the saved document with its status buttons (`RemountOnId` rebuilds the sheet) | Lets the user press Send right away |
| Status buttons | All status changes are buttons with a confirmation dialog (what will happen, a note that is optional or required, written to the history). A button is **disabled while the form has unsaved edits** ("Save your changes first") so an action cannot throw edits away | Manual first, no lost work |
| Approval (Q2 A) | Worker sees **Request confirmation**; the draft then shows the badge "Waiting for approval" and is not editable; Manager / Admin see **Approve / Reject** (reject needs a reason) or **Confirm order** for a draft that was never requested | Uses the existing `ApprovalActions` |
| Cancel (Q6 A) | Worker: draft and confirmed; Manager / Admin: also in production and ready to deliver, with a reason | |
| Order Delivered | The order becomes **Delivered** when the last delivery note that completes every line is confirmed; **Close order** is a Manager button | The only status change that follows another person's click |
| Master data reads | `GET` of master data is open to every signed-in user in the mock (pick-lists); writes stay Admin only | Sale users are not Admin |
| Mock users | **Nina Sato** (Sale Worker) was added next to Alice (Sale Manager) and Demo Admin | To test both roles |
| Customer PO attachment | Only the file name and size are kept (no real upload) | Real upload belongs to the backend |
| Work order / invoice links | Shown as plain text "Not recorded here" | Those modules do not exist yet |
| Filters | search, status, customer, from, to — all in the URL; the customer PO list has no status filter | |
| Not built | Document numbering by hand (Q1 B/C), tax options (Q3 B/C) | Only the suggested options were built |
