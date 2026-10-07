# API — Stock (T1–T3 and the links with Factory, Sale, Master data and the Dashboard)

Frontend: [specs/f8-stock.md](../specs/f8-stock.md) · mock: `frontend/src/services/mock/stock.js` · services: `frontend/src/services/stock.service.js`.
Envelope, auth, paging and error format: see [README.md](README.md). **The stock is a ledger**: a balance is the sum of its movements, nothing edits a balance or a movement, and a revert books the **opposite** movement. The only ways to change a number are the documents listed under "What books a movement" and an **approved adjustment**.

## Access

"Stock" is not a department: Factory and Purchase users (and Admin) use it.

| Who | Can |
|---|---|
| Factory or Purchase, any role | read balances, items and movements; read adjustments |
| Factory or Purchase **Worker** | create / edit / delete a **draft** adjustment (their own), `request`, `back-to-draft` and `cancel` their own |
| Factory or Purchase **Manager** and **Admin** | all of the above on anybody's adjustment, plus `approve` and `reject` — **never their own adjustment** (`403`) |
| Anyone else (Sale, Accounting) | `403 FORBIDDEN` on every `/stock/*` call (the menu is hidden too) |

The best role of the user in Factory and Purchase counts (a Sale Manager who is a Purchase Worker is a Worker here).

## Stock status rule (one function for every screen)

The reorder point of a material is **optional** (a reference quantity; `reorderPoint` may be null). Material: no reorder point → `not_set`; `onHand <= reorderPoint` → `shortage`; `onHand <= 1.2 × reorderPoint` → `near_shortage`; otherwise `normal`. Product (no reorder point): `onHand > 0` → `in_stock`, otherwise `out_of_stock`.

## Reserved and available

`available = onHand - reserved`. **Reserved** is what open documents have promised: the materials (BOM × quantity, raw material warehouse) of **scheduled** work orders, and the products of **draft** delivery notes (their warehouse). A work order stops reserving when it starts (the materials are issued then), is sent back to draft or is cancelled; a delivery note stops when it is confirmed or deleted. Reserving never blocks anything and never books a movement. The availability checks (`POST /sale/availability`, `POST /factory/availability`) compare the requirement with the **available** quantity; `POST /factory/availability` takes an optional `workOrderId` so that a scheduled work order is not counted against itself. The status above is judged on **on hand**, not on available.

## Quantities

Pieces are whole numbers; kg / m up to 3 decimals. A movement that would make a balance **negative** is refused with `409 NOT_ENOUGH_STOCK` (see Errors) and the document that asked for it keeps its status; nothing is booked (all the lines of one booking succeed together or not at all).

## Balances — T1

| Method | Path | Notes |
|---|---|---|
| GET | `/stock/balances` | one row per item **per warehouse of the right kind** (materials in raw material warehouses, products in finished goods warehouses), also when the quantity is 0. Params `kind` (`material` default \| `product`), `q` (code or name), `warehouse` (id), `status` (`shortage \| near_shortage \| normal \| not_set` or `in_stock \| out_of_stock`, `all`), `sort` (`code, name, warehouseName, onHand, reserved, available, reorderPoint, status`, default `code`), `page`, `pageSize`. `meta = { page, pageSize, total, statusCounts }` (counted without the `status` filter) |
| GET | `/stock/items/materials/:id`, `/stock/items/products/:id` | one item, see below |
| GET | `/stock/balance` | params `itemType` (`material \| product`), `itemId`, `warehouseId` → `{ itemType, itemId, warehouseId, onHand, hasMovements, uom }` (the number the adjustment form shows as "on hand now"; `hasMovements` tells whether an opening quantity is still possible) |

Balance row: `{ id ("<kind>-<itemId>-<warehouseId>"), itemType, itemId, code, name, uom, warehouseId, warehouseCode, warehouseName, onHand, reserved, available, reorderPoint (material only; null when not set), reorderQty, status }`.

Item response: `{ itemType, id, code, name, uom, category, reorderPoint, reorderQty, onHand (all warehouses), status, reserved, available, hasMovements, byWarehouse: [{ warehouseId, code, name, onHand, reserved, available }], lastMovements: [<movement row>] (10, newest first), usedIn: [{ productId, code, name, qtyPerUnit }] (materials: the products whose BOM uses it) }`.

## Movements — T2 (read only)

| Method | Path | Notes |
|---|---|---|
| GET | `/stock/movements` | the ledger. Params `q` (item code / name or document number), `type`, `kind`, `warehouse` (id), `item` (`material-3` \| `product-1`), `from`, `to` (date of the movement), `sort` (`at, qty, itemCode, type`, default `-at`), `page`, `pageSize` |

Row: `{ id, number ("MV-2026-0001"), at, from, to, type, itemType, itemId, itemCode, itemName, uom, warehouseId, warehouseCode, warehouseName, qty (+ in / − out), balanceAfter, docType, docId, docNumber, by, note }`.
`type` (shown as): `opening` (Opening Balance), `receipt` (Purchase Receipt, **booked by Purchase later**), `consume` (WO Material Issue), `produce` (Factory Finished Goods Receipt), `deliver` (Sale Delivery), `adjust` (Adjustment).
`docType`: `WO`, `FT`, `DN`, `ADJ`, `GR`, or null (opening). `number` is the **Movement No.**: prefix, year of the movement, 4 digits, running per year in time order. `from` / `to` say where the quantity went: an outgoing line is `from` the warehouse code `to` the document number (WO, DN, ADJ), an incoming line is `from` the document number (FT, GR, ADJ) `to` the warehouse code; an opening balance has no `from`. `balanceAfter` is the balance of that item in that warehouse right after the line, counting in time order.

## What books a movement (links with the other modules)

| Event | Movement | When it is refused |
|---|---|---|
| **Work order starts** (`POST /factory/work-orders/:id/start`, or the first step's `start`): status scheduled → in process | `consume` of every BOM material × the work order quantity, from the raw material warehouse (`-`) | a material is short → `409 NOT_ENOUGH_STOCK`, the work order stays scheduled |
| Work order **reverted** from in process, or **cancelled** while in process (and reverted from cancelled back to in process: consumed again) | the opposite `consume` lines (note "Reverted") | – (the second case can be refused for a short material) |
| **Finished goods transfer** `transfer` (draft → transferred) | `produce` of the transfer quantity into the transfer's warehouse (`+`) | – |
| Transfer `revert` | the opposite `produce` | the products were already delivered and the balance would go negative → `409 NOT_ENOUGH_STOCK` |
| **Delivery note** `confirm` (draft → delivered) | `deliver` of every line's `deliverNow` from the delivery note's warehouse (`-`) | the warehouse holds less → `409 NOT_ENOUGH_STOCK`, the note stays a draft |
| Delivery note `revert` | the opposite `deliver` | – |
| **Adjustment** `approve` | one `adjust` line: counted quantity − quantity on hand at approval time | – |
| Goods receipt (Purchase module, later) | `receipt` with the lot number | – |

A work order `finish` and `schedule` do not move stock. Stock is **not reserved** for orders: the availability checks (`POST /sale/availability`, `POST /factory/availability`) compare the BOM requirement with the on-hand quantity only, and now read the same balances.

## Adjustments — T3 — `/stock/adjustments`

Number `ADJ-2026-0001` (prefix, year of the date, 4 digits). Statuses: `draft` → `pending` → `approved`, `rejected`; `cancelled` from draft.

| Method | Path | Notes |
|---|---|---|
| GET | `/stock/adjustments` | list; params `q` (number, item code / name), `status`, `kind`, `warehouse`, `from`, `to`, `sort` (`number, date, itemCode, countedQty, difference, status`, default `-date`), `page`, `pageSize`; `meta.statusCounts` (counted without the `status` filter) |
| GET | `/stock/adjustments/:id` | one |
| POST | `/stock/adjustments` | create a **draft**: `{ itemType, itemId, warehouseId, countedQty, reason, date, remarks }`. The warehouse must be of the item's kind; `countedQty` ≥ 0 (whole for a product, up to 3 decimals for a material); `reason` is `recount \| damaged \| lost \| found \| other \| opening` (**opening** = the first quantity of an item that has no movement yet in that warehouse; otherwise `400` `HAS_MOVEMENTS` on `reason`, and `409 HAS_MOVEMENTS` if a movement appeared before the approval; its approval books a movement of type `opening` instead of `adjust`); `remarks` ≤ 500 characters and **required when `reason` is `other`** |
| PUT | `/stock/adjustments/:id` | change a **draft** (`409 INVALID_STATUS` otherwise; author or Manager): `{ date, countedQty, reason, remarks }`; item and warehouse cannot change |
| DELETE | `/stock/adjustments/:id` | delete a **draft** (author or Manager) |
| POST | `/stock/adjustments/:id/:action` | body `{ note? }` — `request` (draft → pending; remembers the quantity on hand at that moment), `back-to-draft` (pending → draft), `cancel` (draft → cancelled), `approve` (pending → approved, Manager who is not the author), `reject` (pending → rejected, same rule, **note required**). Answers the updated adjustment |

Response: `{ id, number, date, status, itemType, itemId, itemCode, itemName, uom, warehouseId, warehouseCode, warehouseName, countedQty, onHand, difference, onHandAtRequest, onHandChanged, reason, remarks, createdById, createdBy, history[], links[] }`.
- `onHand` is the **live** quantity while the adjustment is a draft / pending / rejected / cancelled, and the quantity **at approval time** once approved. `difference = countedQty − onHand`.
- **Approve** books `countedQty − (on hand at approval time)` so the result is exactly what was counted. If the on-hand quantity changed after the request, `onHandChanged` is true (compare `onHandAtRequest` with `onHand`) and the sheet warns.
- `links[]`: once approved, `{ type: "movement", number, to: "/stock/movements?q=<number>" }`.

## Other API changes

- `reorderPoint` of a material is now optional in `POST / PUT /master/materials` (null allowed).
- `GET /master/materials`: `onHand` is now the **sum of the stock** of the material in all warehouses (still read only).
- `GET /dashboard` `stockAlerts` and `kpis.materialsInShortage` are built from the real balances with the status rule above (shortage first, then the lowest on hand / reorder point first, at most 5).
- `POST /factory/work-orders/:id/start`, the first `POST /factory/work-orders/:id/steps/:stepId/start`, `POST /factory/transfers/:id/transfer`, `POST /sale/deliveries/:id/confirm` and the matching reverts can answer `409 NOT_ENOUGH_STOCK`.

## Errors used (besides the common ones)

| `error` | Where | Meaning |
|---|---|---|
| `NOT_ENOUGH_STOCK` | any booking | `409`; `errors = [{ path: ["stock"], message: "NOT_ENOUGH_STOCK", items: [{ code, name, uom, warehouse, needed, has }] }]`. The frontend writes "Not enough stock. COMP: needs 12 pcs, has 8" from `items` |
| `VALIDATION_ERROR` | adjustments | field codes `REQUIRED`, `INVALID`, `TOO_LONG`, `HAS_MOVEMENTS` |
| `INVALID_STATUS`, `FORBIDDEN`, `NOT_FOUND` | all | as in the other modules |

## Backend checklist

- [ ] Tables: stock movements (append only: item type, item, warehouse, type, quantity, document type / id / number, user, note, time) and adjustments (+ status history); the balance is a sum (or a table kept in the same transaction)
- [ ] One booking function used by every module, in **one transaction** with the status change of the document: lock the balances, refuse a negative result with `NOT_ENOUGH_STOCK`
- [ ] Reverts book the opposite movements (net of what the document already booked), never edit or delete a movement
- [ ] Reservations: scheduled work orders (materials) and draft delivery notes (products), computed when asked, used by the availability checks
- [ ] Movement numbers `MV-yyyy-nnnn` from a sequence per year
- [ ] The stock status rule in one place (balances, dashboard, availability checks, later the Purchase board)
- [ ] Approval rule: Manager of Factory or Purchase (or Admin), never the author; the approval books the counted quantity relative to the quantity at approval time
- [ ] `GET /stock/movements` with `balanceAfter` (running sum per item and warehouse in time order)
- [ ] `materials.onHand` comes from the stock; the dashboard and both availability checks read the same balances
- [ ] Turn off `VITE_USE_MOCK` and re-run the test list in the spec
