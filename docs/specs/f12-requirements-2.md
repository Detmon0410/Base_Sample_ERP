# F12 Spec — Second requirement round (Purchase approval, Serial Number and Traceability, header clock, role look)

Status: **APPROVED (all ★). Parts A (Purchase approval), D (header, role hat) and B (Serial Number) BUILT; C (Traceability page) not yet** — see section 9 for what differs · Rule as before: spec → review → build with mock data → API doc → tests → ticks in `docs/test.txt` section 9 (N1–N8).
Sources: the customer's new requirements (`docs/test.txt` section 9) · `docs/specs/f9-purchase.md` (the PO workflow that exists) · `docs/specs/f7-factory.md` (work order, steps, transfers) · `docs/specs/f8-stock.md` (movements) · `docs/test.txt` R1 Traceability.

Carried-over decisions: JPY only · desktop · EN first, JA keys empty with EN fallback · details open as the side sheet · manual-first workflow (every status change is a button pressed by a person) · tooltips for explanations · mock first, API doc per module.

---

## 1. What is important, and the order of work

| Order | Part | Why | Size |
|---|---|---|---|
| **A** | **Purchase manual approval** (N4–N6) | The customer states it as a rule of the process; the build is a change of what exists (PO already has "Send by a Manager") | small–medium |
| **B** | **Serial Number** (N1–N3) | The core of the customer's traceability need; everything in R1 hangs on it | large |
| **C** | **Traceability page by S/N** (R1) | Reads what B records; built right after B | medium |
| **D** | Header clock and role icon (N7, N8) | Small, can be built together with A in one afternoon | small |

Each part is built, tried in the browser, documented and tested before the next one; commits are split by part.

---

## 2. Part A — Purchase manual approval (N4–N6)

### What the requirement says
A Purchase document starts in **Pending Approval**; only a Manager confirms it by pressing a button; nothing in the system changes it to Confirmed / Approved by itself; calculated figures are only reference data; every approval is logged (who, date, time, status).

### What exists now
PO statuses `draft → sent → partially_received → received → closed / cancelled`. A Worker creates a draft; a Purchase Manager (or Admin) presses **Send to supplier**, which already is a manual step by a Manager. Nothing is automatic. There is no "Pending Approval" status, no Reject, and the history line has no approval reason.

### Proposal (★)
Add the approval as a **status of its own**, before the order can go to the supplier:

```text
Draft ──Request approval──▶ Pending approval ──Approve──▶ Approved ──Send to supplier──▶ Sent ──▶ Partially received ▶ Received ▶ Closed
                                   │ Reject (reason) ──▶ Rejected ──Edit and request again──▶ Pending approval
Cancelled (from Draft, Rejected, Pending approval by its author or a Manager)
```

- **Request approval** (the author or a Manager) moves Draft → **Pending approval**. The PO is read-only while it waits.
- **Approve** and **Reject** are for a **Purchase Manager or Admin** and **not for the person who made the PO** (a Manager who wrote it asks another Manager; an Admin may always approve — same rule as Sale orders and stock adjustments). Reject needs a reason.
- **Send to supplier** stays a separate button for a Manager after Approved (the approval is not the same act as sending). *(Option in Q2: merge Approve and Send.)*
- Totals and the supplier price are shown as **reference data** (a short note "Total is for reference; approval is always a person's decision"). **No code path changes the status because of an amount or a date.** The dashboard card "Draft POs" becomes "POs waiting for your approval".
- **Approval Log** (the audit trail): a card in the PO sheet and a list page `/purchase/approvals` (Manager and Admin) with: PO number, supplier, total, **action** (requested / approved / rejected), **who**, **date and time**, **status after**, **reason**. Rows are never edited or deleted. (The existing status history of the sheet already keeps who and when; the log is the same facts in a list across all POs, with the reason, readable by the Manager.)
- **Purchase Request**: the requirement says "Purchase Request / Purchase Order". The system has no separate PR (the stock status board "Create PO" button plays that role). ★ Keep one document, the PO. *(Q1)*
- Goods receipts keep their rules (a Worker posts a receipt; not an approval).

### API changes (docs/api/purchase.md)
New statuses `pending_approval`, `approved`, `rejected`; new actions `request-approval`, `approve`, `reject`; `GET /purchase/approvals` (the log, filters: PO, action, user, date range, paging). `statusCounts` and the stepper show the new statuses. Seeded POs: the existing `sent / received / closed` stay; one `draft`, one `pending_approval`, one `rejected` (with a reason) and one `approved` are added or converted so every state can be seen.

---

## 3. Part B — Serial Number (N1–N3)

### What the requirement says
In the Work Order, the **Product is a box of its own**; the system **generates a unique S/N for each unit**, **only when the user presses a button**; the S/N identifies a unit and is used for **Tag / Traceability**; the unit can be searched and its history checked for its whole life.

### Proposal (★)

**S/N format and rules**
- `<product code>-<yy>-<6 digits>` e.g. `RF-1D-26-000001` (readable on a label, the product is visible in it; the running number is per product and year, **never reused**, never changed). *(Q3)*
- One S/N = one unit of the finished product. A work order of 10 units can have **up to 10 S/N**; the user may generate them in one go ("Generate for N units") or one by one; **never more than the quantity of the work order**; there is no automatic generation (not when the work order is created, started or finished).
- Generating is allowed from status **Scheduled** and later (a draft is still being planned), by the Factory Worker or Manager; not on Cancelled work orders. A Finished work order may still receive its missing S/N *(Q4)*.
- S/N cannot be deleted. If a work order is cancelled with S/N already made, they stay and show **Void** (they stay searchable so the number is still understood).

**Work Order sheet — "Product and serial numbers" box**
- A card of its own, between the order data and the production steps: Product (code · name), quantity, S/N made `n / N`, a **Generate S/N** button (with a number field for how many, default = what is left), and a table of the units: S/N · status of the unit · where it is now · Tag print.
- **No tag, no printing, no QR code** (cut by the customer): the S/N is only a number shown on screen. It can still be written on a label by hand or pasted anywhere; the system has no print feature for it.

**What an S/N follows (the unit's life, recorded as events)**

| Event | Recorded when | Linked to |
|---|---|---|
| Serial generated | the button | work order, product, user, time |
| Materials used | the Work Order **Start** (the materials issued) | the issued materials and their lot / goods receipt (so "which door panel batch went into this unit") — recorded at **work order** level and shown on every S/N of that work order *(Q6)* |
| Production steps | each step Start / Done | step, machine, operator, times, defect quantity (work order level, shown for the unit) |
| Transferred to the warehouse | the FG transfer | transfer, warehouse |
| Delivered | the delivery note is confirmed | delivery note, customer, sale order |
| Invoiced | the invoice is issued | invoice |

**Picking S/N for a delivery.** To link a delivery to units, a delivery line of a serial-tracked product asks **which S/N are delivered** (a picker listing the units in stock, quantity must equal the number picked). ★ Required for products that have S/N made; products with no S/N (old data) deliver as before. *(Q7)* Confirming the delivery marks those units **Delivered** and links them to the customer and the invoice.

**Unit status:** `made → in stock (transferred) → reserved? → delivered → (void)`. ★ `Made`, `In stock`, `Delivered`, `Void`; no "reserved per unit".

### API (docs/api/serial.md, new)
`GET /serials` (list; params `q`, `product`, `status`, `workOrder`, `customer`, paging) · `GET /serials/:sn` (the unit with its **timeline**) · `POST /factory/work-orders/:id/serials` (`{ count }`, answers the new S/N; `422`-like `TOO_MANY` over the quantity) · `GET /factory/work-orders/:id/serials` · delivery lines carry `serials: [sn]`.

---

## 4. Part C — Traceability page (R1)

`/traceability` (open to every department as the menu already says):
- **Search by S/N** (also by work order, delivery note, invoice or customer: they open the list of their units) with suggestions while typing.
- The unit's page: a header (S/N, product, status, where it is now) and one **vertical timeline** of the events above, newest at the bottom, each event with date, who, document number as a link (work order, material lot / goods receipt, transfer, delivery note, invoice). The part "materials used" lists material code, name, quantity, lot number and the supplier / goods receipt it came from.
- **Backwards** (from a unit to its materials and supplier) and **forwards** (from a material lot to the units and customers that received it) *(Q8: forward search in this round or later)*.
- Empty / not found / void units are explained in words.

---

## 5. Part D — Header clock and role look (N7, N8)

**Header clock (N7).** In the top bar, on the right before the user menu: a live date and time, e.g. `Thu 8 Oct 2026 · 14:32`, updated every minute (seconds not shown: a person at a desk does not need them), in the user's language format, from the **browser clock**. "Online" is shown as a small status dot with the word **Online / Offline** that follows the browser's connection (`navigator.onLine`), so the word and the dot say it, not colour alone. *(Q9: seconds, time zone label)*

**Role icon and colour (N8).** One shared `RoleBadge` (icon + word, colour as help): ★ Admin = crown icon, purple · Manager = **hard hat** icon, blue · Worker = wrench/helmet icon, green *(the customer said "hat"; Q10)*. Shown: in the user menu in the header (next to the name, and one badge per department role), in the Users list (replacing the plain chips), in the user form, and in the U3 matrix column headers. The text is always there ("Manager").

---

## 6. Build order and parts

| Step | Content |
|---|---|
| A0 | Purchase: statuses, actions, mock seeds, log (mock + service) |
| A1 | PO list / sheet: new stepper steps, Request approval / Approve / Reject buttons with the reason dialog, reference-data note, Approval Log card; `/purchase/approvals` list; Dashboard card |
| A2 | Tests (who may approve, not your own, no automatic change, log is append-only), `api/purchase.md`, tick N4–N6 |
| D1 | Header clock + `RoleBadge` in the header, Users and U3; tick N7–N8 |
| B0 | Serial mock + service: ledger of S/N and events, numbering, rules |
| B1 | Work Order sheet: Product and serial numbers box, Generate |
| B2 | Delivery note: S/N picker; Dashboard / lists untouched |
| B3 | Tests, `api/serial.md`, tick N1–N2 |
| C1 | Traceability page: search, unit timeline, material lots; tests; tick N3 and R1 |

---

## 7. Out of scope for now

Batch / lot as a thing of its own in Stock (only the goods receipt lot number is used) · a Purchase Request document · e-mail or LINE notification of approvals · approval limits by amount (several levels of approval) · barcode scanner hardware · S/N for materials (only finished products) · re-printing history of tags · warranty.

---

## 8. Questions (★ = my suggestion)

| # | Question | Options |
|---|---|---|
| Q1 | Purchase Request | ★ No separate PR, the PO is the document · add a Purchase Request (PR) that a Worker creates and a Manager approves, then turned into a PO |
| Q2 | Approve and Send | ★ Two buttons: Approve, then Send to supplier · Approve also sends |
| Q3 | S/N format | ★ `RF-1D-26-000001` (product code, year, 6 digits) · only a running number · your own format |
| Q4 | When can S/N be generated | ★ From Scheduled, also on a Finished work order for the missing ones · only while In process · from Draft |
| Q5 | Tag | ~~QR code + text~~ → decided: **no tag and no printing**; the S/N is shown as text only |
| Q6 | Materials of a unit | ★ Work-order level (all units of one work order share the materials and lots) · per unit (the Worker picks the lots for each unit) |
| Q7 | Delivery | ★ Picking S/N is required for products that have S/N · optional · not at all (link by work order only) |
| Q8 | Forward trace (lot → customers) | ★ In this round, a search by lot number · later |
| Q9 | Header clock | ★ Date and time to the minute + Online / Offline word · with seconds · date only |
| Q10 | Role icons | ★ Admin crown (purple), Manager hard hat (blue), Worker wrench (green) · other icons / colours (tell me) |
| Q11 | Order of work | ★ A (Purchase approval) + D (clock, role) first, then B + C · B + C first |

When you answer (or say "take the suggestions"), the build starts with A0.

---

## 9. Differences between this draft and what was built (part A)

- The status of a PO that waits is stored as **`pending`** (shown "Pending approval"), not `pending_approval`: the shared status system already has a `pending` with colour, icon and text (used by stock adjustments), and `approved` and `rejected` too. Stepper: Draft, Pending approval, Rejected, Approved, Sent, Partially received, Received, Closed, Cancelled.
- **Withdraw request** (pending → draft by the author or a Manager) was added; it is logged like the other three actions.
- A rejected PO can be edited (a pending one is locked).
- The approval log page is `/purchase/approvals` ("Approval log" in the Purchase menu, only for a Purchase Manager and Admin); each row opens its PO.
- Seeded POs: the old ones now carry a request and an approval before "Sent" (Alice asked, Hana approved), and three POs were added: PO-2026-0008 pending, PO-2026-0009 rejected (with a reason), PO-2026-0010 approved and not yet sent.
- The U3 matrix has two new rows for Purchase: "Ask a Manager to approve" (everybody) and "Approve or reject a PO of somebody else" (Manager and Admin).

## 10. Differences between this draft and what was built (part D)

- **The role hat replaces the profile avatar** in the header user menu (decided after the draft): a round safety helmet in the colour of the role, with the name and the role in words next to it. The disabled "Profile" menu entry (it had no page) was removed.
- Colours follow the safety helmet chart: **Manager = white** (with a grey edge so it shows), **Worker = yellow**, **Admin = red**. A user with several roles shows the highest one in the header; the menu lists every department and role as a chip.
- **Departments have their own colour** on the chips: Sale = light blue, Factory = orange, Purchase = green, Accounting = red (the Admin chip is red). The same chips (helmet + department colour + words) are used in the Users list and the Users form; the helmets also head the Admin / Manager / Worker columns of the U3 matrix.
- The header clock shows date and time to the minute from the computer clock (e.g. `Thu, 8 Oct 2026 · 10:11`) and a dot with the word **Online** / **Offline** that follows the browser connection.
- One file holds the colours: `frontend/src/config/roleStyle.js` (change a colour there only).

## 11. Differences between this draft and what was built (part B)

- **Status of a unit is computed**, not stored (`made, in_stock, delivered, void`): the units of a Work Order are moved in the order of their numbers, so the first N numbers are the N units of the posted transfers. This way a revert of a transfer or of a delivery note moves the units back by itself.
- The **Product and serial numbers** box is a card of its own on the Work Order sheet (above Progress): product, quantity, the **Generate S/N** button as a table with one row per unit: **the button sits in the first empty row and, once pressed, becomes that row's S/N** (one press, one unit, one number; no "how many" field), a table of the units (number, status, where it is) and **Print tag** (one) or **Print all tags**. A draft Work Order shows "Serial numbers can be made once the work order is scheduled" (Q4 ★: from Scheduled; a finished Work Order can still make its missing ones).
- **Delivery note**: a line of a product that has units in the warehouse shows **Serial numbers of the units** with a picker (checkboxes of the free units, "Choose the first N", Clear). Saving checks the numbers; **confirming needs exactly as many as pieces** (Q7 ★). Products with no unit in the warehouse are delivered as before.
- Seeds: WO-2026-0001 has 4 numbers (made), WO-2026-0003 all 30 (18 delivered on DN-2026-0002, 11 in stock, 1 not transferred), WO-2026-0005 all 6 (delivered on DN-2026-0001), so the demo draft note DN-2026-0003 (12 pieces of RF-2D) has only 11 units to choose: lower its quantity to 11.
- The history of the unit (timeline API) is built; the **page that shows it** is part C.
- A crash of the delivery note sheet when it was opened directly by its address (the record was not loaded yet) was fixed on the way.
