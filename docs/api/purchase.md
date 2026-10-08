# API — Purchase (P1–P5 and the links with Stock, Master data and the Dashboard)

Frontend: [specs/f9-purchase.md](../specs/f9-purchase.md) · mock: `frontend/src/services/mock/purchase.js` · services: `frontend/src/services/purchase.service.js`.
Envelope, auth, paging and error format: see [README.md](README.md). **Every status change is an explicit action called by a person; the one exception is posting the goods receipt that completes (or starts) a purchase order, which moves the PO to Received / Partially received** (written to the PO history). Only the **accepted** quantity of a **posted** receipt enters the stock ([stock.md](stock.md)).

## Access

| Who | Can |
|---|---|
| Purchase **Worker** | create / edit / delete **their own draft** PO, cancel their own draft, **create / edit / delete / post** goods receipts, `cancel` their own draft receipt, read everything in Purchase |
| Purchase **Manager** and **Admin** | all of the above on anybody's documents, plus `approve` / `reject` a PO of somebody else (see **Manual approval**), `send` (an approved PO), `back-to-draft`, `cancel` a sent PO (reason), `close-remaining` (reason), `close`, `revert` (reason), cancel a **posted** receipt (reason) |
| Anyone else (Factory, Sale, Accounting) | `403 FORBIDDEN` on every `/purchase/*` call (the menu is hidden too). Factory users see the on-order quantities through the Stock API |

The role is the user's role **in Purchase** (a Sale Manager who is a Purchase Worker is a Worker here).

## Numbers

`PO-2026-0001` and `GR-2026-0001`: prefix, year of the document date, 4 digits, running per type and year, created by the server on the first save.

## Stock status board — `GET /purchase/stock-status`

One row per material (all warehouses together). Params `q` (code, name), `scope` (`attention` default = shortage and near shortage only \| `all`), `status` (`shortage \| near_shortage \| normal \| not_set`, overrides the scope), `sort` (`status` default = shortage first then lowest on hand / reorder point, `code, name, onHand, available, onOrder, reorderPoint`; prefix `-` = descending), `page`, `pageSize`. `meta = { page, pageSize, total, statusCounts }` (counted with the search only).

Row: `{ id, code, name, uom, onHand, available, onOrder, reorderPoint (null when not set), reorderQty, suggestedQty, status, suppliers: [{ supplierId, code, name, price, leadTimeDays }], suggested }`.
- `onOrder` = Σ over POs that are **Sent or Partially received** of `ordered − accepted` (never below 0): what suppliers still owe.
- `suppliers` = the **active** suppliers that sell the material (supplier–material links), cheapest first (ties: shortest lead time); `suggested` = the first one or null.
- `suggestedQty` = `reorderQty` of the material, else `max(0, 2 × reorderPoint − onHand)`, null when there is neither. It is only a default for the PO form.

## Purchase orders — `/purchase/orders`

| Method | Path | Notes |
|---|---|---|
| GET | `/purchase/orders` | list; params `q` (number, supplier code / name, material code / name), `status`, `supplier` (id), `material` (id), `from`, `to` (PO date), `deliveryFrom`, `deliveryTo` (expected delivery), `receivable` (any value = only Sent / Partially received), `sort` (`number, date, supplierCode, expectedDate, total, status`, default `-date`), `page`, `pageSize`. `meta = { page, pageSize, total, statusCounts, sums: { total } }` (`statusCounts` is counted with every filter except `status`; `sums.total` is the total of the rows of the current filter) |
| GET | `/purchase/orders/:id` | one |
| POST | `/purchase/orders` | create a **draft**: `{ supplierId, date, expectedDate?, warehouseId, remarks, lines: [{ materialId, qty, unitPrice }] }` |
| PUT | `/purchase/orders/:id` | change a **draft or rejected** PO (author or Manager), same body; `409 INVALID_STATUS` otherwise (a pending PO is locked) |
| DELETE | `/purchase/orders/:id` | delete a **draft** (author or Manager) |
| POST | `/purchase/orders/:id/:action` | body `{ note? }`: `request-approval` (draft or rejected → **pending**, author or Manager), `withdraw` (pending → draft, author or Manager), `approve` (pending → **approved**, Manager) and `reject` (pending → **rejected**, Manager, **note required**) — see **Manual approval**; `send` (**approved** → sent, Manager), `back-to-draft` (sent → draft, Manager, only while no receipt is posted), `cancel` (draft, rejected or pending: its author or a Manager; approved: Manager, **note required**; sent: Manager, **note required**, only while no receipt is posted; draft receipts of the PO are cancelled with it), `close-remaining` (partially received → closed, Manager, **note required**; draft receipts are cancelled), `close` (received → closed, Manager), `revert` (closed or cancelled → the status before, Manager, **note required**; other statuses `409`) |

Rules (validation `400` with the field path; codes on the field): **R1** the supplier exists and is active (`REQUIRED` / `INACTIVE` on `supplierId`), the warehouse is a **raw material** warehouse (`REQUIRED` on `warehouseId`), every material exists, is active and **is sold by that supplier** (`REQUIRED`, `INACTIVE`, `NOT_SUPPLIED` on `lines.N.materialId`); **R2** `qty` > 0 (whole for pcs / set / box, up to 3 decimals otherwise: `INVALID` on `lines.N.qty`), `unitPrice` a whole number of yen ≥ 0 (`INVALID`), no material twice (`DUPLICATE`), at least one line (`REQUIRED` on `lines`); `expectedDate` not before `date` (`DATE_ORDER`); `remarks` ≤ 500 (`TOO_LONG`).

PO response: `{ id, number, date, status, supplierId, supplierCode, supplierName, supplierContact, supplierAddress, expectedDate, warehouseId, warehouseName, buyer, createdById, remarks, lines[], lineCount, subtotal, tax, total, taxRate, progress, receipts[], history[], links[] }`.
- `lines[]`: `{ materialId, materialCode, materialName, uom, qty, unitPrice, amount, listPrice (the supplier's current price, null if the link is gone), received (accepted on posted receipts), open (qty − received, min 0) }`.
- Totals like the Sale documents: `amount = round(qty × unitPrice)`, `subtotal` = Σ amounts, `tax = floor(subtotal × 10 %)`, `total = subtotal + tax`.
- `progress`: `{ ordered, received, percent, late, lateDays }`; `late` = Sent / Partially received and `expectedDate` is before today (nothing changes by itself).
- `receipts[]`: `{ id, number, date, status, accepted }`. `links[]`: the receipts (`goodsReceipt`) and a placeholder `{ type: "supplierBill", number: null }` until Accounting exists.

## Manual approval of a PO and the approval log (docs/specs/f12-requirements-2.md, N4–N6)

```text
draft ──request-approval──▶ pending ──approve──▶ approved ──send──▶ sent ▶ partially_received ▶ received ▶ closed
   ▲   ◀──withdraw────────────┤  └──reject (note)──▶ rejected ──edit, then request-approval──▶ pending
   └──────── cancelled (draft, rejected, pending: author or Manager; approved: Manager with a note)
```

- **Nothing is approved or sent by the system.** No amount, date, stock level or timer changes a status; totals are reference data. Only the actions above do, each called by a person.
- `approve` / `reject`: a Purchase **Manager or Admin**, and **not the person who made the PO** (`403 CANNOT_APPROVE_OWN`); an **Admin always may**. A Worker gets `403 FORBIDDEN`. `reject` needs `note` (the reason).
- A **pending** PO is locked (no `PUT`); `withdraw` brings it back to draft. A **rejected** PO can be corrected (`PUT`) and asked again.
- The statuses are: `draft, pending, rejected, approved, sent, partially_received, received, closed, cancelled` (`pending` is shown as "Pending approval"). `statusCounts` has all of them.
- The PO has `approvals: [{ id, action, status, actor, at, note }]`, oldest first: the entries of the actions `request-approval`, `withdraw`, `approve-order`, `reject-order` (the history of the PO has them too, with the same time and person).

### Approval log — `GET /purchase/approvals` (Purchase Manager and Admin; others `403`)

Read only; entries are never changed or deleted. One row per request, withdrawal, approval or rejection of any PO:

`{ id, poId, poNumber, supplierId, supplierName, total, action ("request-approval" | "withdraw" | "approve-order" | "reject-order"), status (status after), actor, at (ISO date-time), date, note }`

Params: `q` (PO number, supplier, person, reason), `status` (status after), `action`, `po` (id), `supplier` (id), `from`, `to` (date), `sort` (`at, poNumber, action, actor, total, status`, default `-at`), `page`, `pageSize`.

## Goods receipts — `/purchase/receipts`

| Method | Path | Notes |
|---|---|---|
| GET | `/purchase/receipts` | list; params `q` (number, PO number, supplier, material, supplier's delivery note), `status`, `supplier`, `po` (id), `from`, `to` (receipt date), `sort` (`number, date, poNumber, supplierCode, accepted, status`, default `-date`), `page`, `pageSize`; `meta.statusCounts` like the PO list |
| GET | `/purchase/receipts/:id` | one |
| POST | `/purchase/receipts` | create a **draft**: `{ poId, date, warehouseId, deliveryNoteNo?, remarks, lines: [{ materialId, delivered, accepted, rejectReason?, rejectNote?, lot? }] }` |
| PUT | `/purchase/receipts/:id` | change a **draft** (author or Manager); the PO cannot change |
| DELETE | `/purchase/receipts/:id` | delete a **draft** (author or Manager) |
| POST | `/purchase/receipts/:id/:action` | body `{ note? }`: `post` (draft → posted), `cancel` (draft: author or Manager; **posted: Manager, note required**) |

Rules: **R3** the PO must be **Sent or Partially received** (`INVALID_STATUS` on `poId`); the warehouse is a raw material warehouse; each line is a line of the PO; `delivered` ≥ 0, `accepted` ≥ 0 and **≤ delivered** (`INVALID`) and **≤ the open quantity of the PO line** — the quantity ordered minus the accepted quantity of the **posted** receipts (`TOO_MANY` on `lines.N.accepted`); when `delivered > accepted` the line needs `rejectReason` (`damaged \| wrong_item \| wrong_quantity \| quality \| other`, `REQUIRED`) and, for `other`, a `rejectNote` (`REQUIRED`); at least one line with `delivered` > 0 (`REQUIRED` on `lines`); `lot` ≤ 50, `remarks` ≤ 500. **R4** is checked again when the receipt is posted, so two drafts cannot take the same open quantity. **R5** `post` works once: a second `post`, or a post of a cancelled receipt, is `409 INVALID_STATUS`.
- **Posting** books one `receipt` movement per line with `accepted > 0` into the receiving warehouse (document = the receipt, note `Lot <lot>`), all together or none, then moves the PO: every line has nothing open → **Received**, otherwise **Partially received**. The rejected quantity is only recorded; it stays open on the PO (R6).
- **Cancelling a posted receipt** books the opposite movements (`409 NOT_ENOUGH_STOCK` if the materials were already used), then moves the PO back (Partially received / Sent). Refused when the PO is Closed or Cancelled (`409`: revert the PO first).
- Receipt response: `{ id, number, date, status, poId, poNumber, poStatus, supplierId, supplierCode, supplierName, warehouseId, warehouseName, deliveryNoteNo, remarks, receivedBy, createdById, lines[], accepted, history[], links[] }`; `lines[]`: `{ materialId, materialCode, materialName, uom, ordered, receivedBefore, open, delivered, accepted, rejected, rejectReason, rejectNote, lot }`. `links[]`: the PO, and once posted the stock movements (`/stock/movements?q=<number>`).

## Other API changes

- The `links` of a purchase order and of a goods receipt include their supplier bills (`type: "supplierBill"`, `to: "/accounting/bills/:id"`); a goods receipt is billed once ([accounting.md](accounting.md)).
- `GET /stock/balances` rows and `GET /stock/items/materials/:id` get `onOrder`; the item also gets `openOrders: [{ id, number, supplier, expectedDate, status, qty }]` (see [stock.md](stock.md)). A movement's document link `GR` opens `/purchase/receipts/:id` for Purchase users.
- `DELETE /master/suppliers/:id` and `DELETE /master/materials/:id` answer `409 IN_USE` when a purchase order uses them (they can be deactivated).
- `GET /dashboard`: `kpis.poWaitingForGoods = { count (Sent + Partially received), nextDueDate }`; `approvals` of a Purchase Manager lists the POs in status **pending** (`{ type: "PO", id, number, party: supplier, amountJpy: total }`) that wait for the Manager's approval.

## Errors used (besides the common ones)

| `error` | Where | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | PO, receipt | field codes above (`NOT_SUPPLIED`, `INACTIVE`, `DUPLICATE`, `TOO_MANY`, `DATE_ORDER`, `REQUIRED`, `INVALID`, `TOO_LONG`); `note` `REQUIRED` for the actions that need a reason |
| `INVALID_STATUS` | all | the action is not possible in the current status (e.g. `send` before `approve`) |
| `CANNOT_APPROVE_OWN` | `approve`, `reject` | `403`, the Manager made this PO; another Manager (or an Admin) must decide |
| `NOT_ENOUGH_STOCK` | cancelling a posted receipt | `409`, see [stock.md](stock.md) |
| `IN_USE` | master data delete | `409` |

## Backend checklist

- [ ] Tables: purchase orders + lines, goods receipts + lines (delivered, accepted, reject reason / note, lot), status history of both
- [ ] The supplier must be active and sell each material (supplier–material link); the warehouse a raw material one
- [ ] Open quantity = ordered − accepted of **posted** receipts, checked in a transaction when a receipt is saved and again when it is posted (two receipts cannot take the same quantity)
- [ ] Posting in one transaction: the stock movements (`receipt`), the receipt status and the PO status; never twice
- [ ] Cancelling a posted receipt books the opposite movements and refuses a negative balance; closing or cancelling a PO cancels its draft receipts
- [ ] `onOrder` and the board suggestion computed from the same open quantities; the dashboard KPI and approvals from the real POs
- [ ] A supplier / material used by a PO cannot be deleted
- [ ] Approval: no code path sets `approved` or `sent` except the actions; `approve` / `reject` refuse the author unless Admin; every request / withdrawal / approval / rejection writes an append-only log row (user, time, status after, note) in the same transaction as the status change
- [ ] Turn off `VITE_USE_MOCK` and re-run the test list in the spec
