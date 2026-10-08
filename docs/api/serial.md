# API — Serial Numbers (S/N) of finished products (N1–N3)

Frontend: [specs/f12-requirements-2.md](../specs/f12-requirements-2.md) · mock: `frontend/src/services/mock/serial.js` · service: `frontend/src/services/serial.service.js`.
Envelope, auth, paging and error format: see [README.md](README.md). The timeline of a unit and the search page (R1 Traceability) are built on these calls.

## The idea

One **serial number (S/N) identifies one unit** of a finished product. It is made **only when a Factory user presses the button** on a Work Order (never automatically: not when the Work Order is created, started or finished). It is never changed, never deleted and **never used twice**. What happens to the unit afterwards is **not stored in the S/N**: it is read from the Work Order, the finished goods transfers, the delivery notes and the invoices, so the S/N can never disagree with them.

## Access

| Who | Can |
|---|---|
| Factory **Worker**, **Manager**, **Admin** | make serial numbers of a Work Order (`POST`), read everything |
| Any other user with a department (Sale, Purchase, Accounting) | **read** (`GET`) — Traceability is open to every department |
| A user without a department and not Admin | `403 FORBIDDEN` |

## Number format

`<product code>-<yy>-<6 digits>`, e.g. `RF-2D-26-000001`: the code of the product, the last two digits of the year it was made, and a running number **per product and year**, starting at 1, never reused (a void number keeps its place). The lookup (`GET /serials/:sn`) ignores case.

## The serial number object

| Field | Type | Notes |
|---|---|---|
| `id`, `sn` | number, string | |
| `productId`, `productCode`, `productName` | | |
| `workOrderId`, `workOrderNumber`, `saleOrderNumber` | | the Work Order that made it and its sale order |
| `status` | `made \| in_stock \| delivered \| void` | **computed**, see below |
| `createdAt`, `createdBy` | ISO date-time, name | |
| `transferNumber` | string or `null` | the finished goods transfer that moved it into the warehouse |
| `deliveryNote` | `{ id, number, status }` or `null` | the delivery note that names it (draft or delivered) |
| `customerName` | string or `null` | the customer of that delivery note |
| `invoiceNumbers`, `lots` | string[] | the invoices of its delivery note and the lot numbers of the materials of its Work Order (what the search also reads) |
| `free` | boolean | `in_stock` and not on any delivery note: it can be picked for a new one |

### Status (computed, never stored)

| Status | Rule |
|---|---|
| `void` | the Work Order is **cancelled** (the number stays searchable so a printed label is still understood) |
| `delivered` | it is named on a **delivered** delivery note |
| `in_stock` | it was transferred: units are moved **in the order of their numbers**, so the first *N* numbers of a Work Order (N = quantity of its transferred transfers) are `in_stock` |
| `made` | none of the above (made, not yet in the warehouse) |

Reverting a delivery note or a transfer moves the units back by itself, because the status is read from them.

## Calls

| Method | Path | Notes |
|---|---|---|
| GET | `/serials` | list; params `q` (S/N, product, Work Order, sale order, **delivery note, invoice number, customer, lot number of a material the unit was built with** — so a lot can be traced forward to the customers who got it), `status` (`made, in_stock, delivered, void`), `product` (id), `workOrder` (id), `free` (any value = only units that can be picked), `dn` (with `free`: the units of this draft note stay in the list), `sort` (`sn, createdAt, status, productCode, workOrderNumber`, default `-sn`), `page`, `pageSize` (≤ 200). `meta = { page, pageSize, total, statusCounts }` |
| GET | `/serials/:sn` | one unit with its **timeline**; `404 SERIAL_NOT_FOUND` |
| GET | `/factory/work-orders/:id/serials` | the units of one Work Order; `meta = { total, qty, made (not void), left, canMake }` (`canMake` = status scheduled / in process / finished) |
| POST | `/factory/work-orders/:id/serials` | body `{ count }`; makes `count` numbers (one per unit) and answers them (`201`). `400 VALIDATION_ERROR` `count` → `INVALID` (not a whole number ≥ 1) or `TOO_MANY` (**the Work Order would have more numbers than its quantity**); `409 INVALID_STATUS` for a draft or cancelled Work Order; `403` outside Factory |

### Timeline of a unit — `GET /serials/:sn` → `timeline[]`

Events in time order (`at`, `by`); each has a `type`:

| `type` | When | Extra fields |
|---|---|---|
| `generated` | the button was pressed | `ref` (the Work Order) |
| `materials` | the Work Order was **started** (its materials were issued) | `materials: [{ code, name, uom, qtyPerUnit, lots: [{ lot, receiptNumber, receiptId, supplier }] }]` — at **Work Order level** (every unit of the Work Order shares them); `lots` are the lot numbers of the posted goods receipts of that material |
| `step` | one per finished production step | `step: { stepNo, processName, machine, startAt, qtyDone, qtyDefect }`, `by` = operator |
| `finished` | the Work Order was finished | `ref` |
| `transferred` | the unit's transfer was posted | `ref` (transfer), `warehouse` |
| `delivered` | the delivery note was confirmed | `ref` (delivery note), `customer`, `saleOrder` |
| `invoiced` | an invoice (not cancelled) was made from that delivery note | `ref` (invoice), `invoiceStatus` |
| `void` | the Work Order was cancelled | `ref` |

`ref` is `{ type, number, to }` (`to` = the page of the document).

## Delivery notes (change in [sale.md](sale.md))

A delivery line of a product that has units **in the warehouse with serial numbers** names its units:

* the line has `serialTracked` (boolean) and `serials: [sn]` (response); the body of `PUT /sale/deliveries/:id` accepts `lines[].serials`;
* each number must be a unit **of that product**, `in_stock`, **not on another delivery note** and not repeated, and there may not be more numbers than `deliverNow`: `400` `lines.<i>.serials` → `INVALID`, `NOT_AVAILABLE` or `TOO_MANY`;
* **`confirm` needs exactly `deliverNow` numbers** on every tracked line: `400` `lines.<i>.serials` → `SERIALS_REQUIRED`;
* a product with **no** unit in the warehouse (no S/N made, or none transferred) is delivered as before, with no numbers.

## Errors used

| `error` | Where | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | `count`, `lines.<i>.serials` | codes above |
| `SERIAL_NOT_FOUND` | `GET /serials/:sn` | `404` |
| `INVALID_STATUS` | make | `409`, draft or cancelled Work Order |
| `FORBIDDEN` | make / read | `403` |

## Backend checklist

- [ ] Table `serial_numbers(id, sn UNIQUE, work_order_id, product_id, created_at, created_by)`; a counter per product and year that is **never decreased** (use a sequence or a locked counter row; a transaction per `POST`)
- [ ] `POST` checks `count(non-void numbers of the Work Order) + count ≤ quantity` inside the transaction (two users pressing the button together cannot exceed it)
- [ ] No update and no delete of a serial number; status is derived (transfers, delivery notes, Work Order status), not a column
- [ ] Delivery line ↔ serial numbers table (`delivery_note_line_serials`); the checks above run on save **and** again on confirm in one transaction
- [ ] The timeline reads the Work Order log, steps, transfers, delivery notes and invoices; the materials come from the Work Order's issued materials and the lots of the posted goods receipts
