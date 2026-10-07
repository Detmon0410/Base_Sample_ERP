# API — Sale (S1–S8)

Frontend: [specs/f6-sale.md](../specs/f6-sale.md) · mock: `frontend/src/services/mock/sale.js` · services: `frontend/src/services/sale.service.js`.
Envelope, auth, paging and error format: see [README.md](README.md). **Every status change is an explicit action called by a person; the server never moves a status by itself** (spec 2.1, manual first).

## Access

| Who | Can |
|---|---|
| Sale **Worker** | everything on drafts (create, edit, delete), `send`, `accept`, `reject`, `expire`, `request-confirm`, `send-to-factory`, `mark-ready`, create a delivery note, `confirm` a delivery, `cancel` a **draft or confirmed** order |
| Sale **Manager** and **Admin** | all of the above, plus `approve` / `reject-confirm`, `close`, `cancel` an order **in production or ready to deliver** (reason required), `revert` |
| Anyone else | `403 FORBIDDEN` on every `/sale/*` call (the menu is hidden too) |

Master data **reads** (`GET /master/customers`, `/products`, `/employees`, `/warehouses`, `/uom`, `/materials`, `/bom-lines`, price lists …) are open to **every signed-in user** because the pick-lists of documents use them; **writes stay Admin only** (a change from the first master data doc, which said Admin for everything).

## Numbers and totals

- Document numbers are created by the server on first save: `QT-2026-0001`, `SO-2026-0001`, `DN-2026-0001` (prefix, year of the document date, 4 digits, running per type and year). The Customer PO keeps the customer's own number.
- Money is whole yen. Line `amount = qty × unitPrice`. `totals = { subtotal, tax, total, taxRate }` with `tax = floor(subtotal × 0.10)` (spec Q3). The client shows the same numbers while typing; the server's are the truth.
- A **line**: `{ productId, qty (integer ≥ 1), unitPrice (integer ≥ 0), priceEdited (bool) }`. A product appears once per document. The response adds `productCode, productName, uom, amount` (and `delivered` on sale orders).
- Default price for a line (used by the UI through `GET /sale/price-lookup`): the **active price list row** of the product + customer whose period contains the document date, else the product's `sellingPrice`. `priceEdited: true` marks a price typed by hand; the UI never overwrites it when the customer changes.

## Common document fields in a response

`id, number, date, customerId, customerCode, customerName, salesPersonId, salesPersonName, remarks, status, lines[], totals, history[], links[]`

- `history`: newest first, `{ id, action, status, actor, at, note }`. `status` is set only when the entry changed the status (`created` = draft). Actions: `created, send, accept, reject, expire, request-confirm, approve, reject-confirm, send-to-factory, mark-ready, delivered, confirm, close, cancel, revert`.
- `links`: related documents `{ id, type, number, status?, to? }` with `type` = `quotation | order | customerPo | delivery | workOrder | invoice`. A `workOrder` / `invoice` link has `number: null` until those modules exist.

## Helpers

| Method | Path | Notes |
|---|---|---|
| GET | `/sale/price-lookup?customerId=&productIds=1,2&date=YYYY-MM-DD` | `{ "1": 66000, "2": 41000 }` default unit prices |
| POST | `/sale/availability` | body `{ lines: [{ productId, qty }] }` → `{ canProduce, checkedAt, materials[], shortages[], noBom[] }` |

> **Stock:** `POST /sale/deliveries/:id/confirm` books the delivered products out of the delivery note's warehouse and can answer `409 NOT_ENOUGH_STOCK`; `revert` books them back. The `onHand` used below is the stock balance ([stock.md](stock.md)).

**Availability** (aditional_req §1): for every line explode the BOM (`qty per unit × line qty`), **sum per material over all lines**, compare with the material's `onHand` (raw material warehouse). `materials[]`: `{ materialId, materialCode, materialName, uom, required, available, missing }` (`missing` = 0 when enough); `shortages` = the rows with `missing > 0`; `noBom` = products without a BOM (cannot be checked). `canProduce = shortages empty and noBom empty`. Stock already needed by other orders is **not** subtracted (Q7) and the result **never blocks** anything (Q8).

## List responses (all four lists)

`{ success, data: [...], meta }` with `meta = { page, pageSize, total, statusCounts?, sums? }`.

- `pageSize`: the UI offers 10, 20, 50 and 100 (the "Show" box under a list, `size` in its URL); the server caps it at 100.
- `total`: number of records the filters match, **all pages**. The table's last row shows it ("Total 12 items").
- `statusCounts`: `{ [status]: n }` for the status stepper above the quotation and sale order lists. Counted with every filter **except** `status` (search, customer, dates still apply), so the stepper shows where the documents are while one step is selected.
- `sums`: `{ total }` = the sum of `totals.total` of **all** records the filters match (not only this page), only for quotations and sale orders. The table's last row shows it under the Total column.
- Dates in filters and bodies are ISO `YYYY-MM-DD` (the date picker works with the same string).

## Quotations — `/sale/quotations`

| Method | Path | Notes |
|---|---|---|
| GET | `/sale/quotations` | list; params `q` (number, customer code / name, **code or name of a product on the lines**), `status`, `customer` (id), `from`, `to` (document date), `sort` (`number, date, customerCode, validUntil, status, total`; default `-date`), `page`, `pageSize` |
| GET | `/sale/quotations/:id` | one |
| POST | `/sale/quotations` | create a draft: `{ customerId, date, validUntil, salesPersonId?, remarks, lines[] }` |
| PUT | `/sale/quotations/:id` | change a **draft** only (`409 INVALID_STATUS` otherwise) |
| DELETE | `/sale/quotations/:id` | delete a **draft** only |
| POST | `/sale/quotations/:id/:action` | `send` (draft → sent), `accept` (sent → accepted), `reject` (sent → rejected, **`note` required**), `expire` (sent → expired), `revert` (Manager, `note` required). Body `{ note? }` |
| POST | `/sale/quotations/:id/duplicate` | any status, Sale Worker / Manager / Admin; makes a **new draft** with the next number, today as the date, `validUntil` = today + 30 days, the same customer, sales person, remarks and lines (prices and `priceEdited` as they are); the history of the new one starts with `created` and the note `Copied from <number>`. Answers `201` with the new quotation |
| POST | `/sale/quotations/:id/create-order` | accepted only; creates a **draft sale order** with the customer, lines and prices of the quotation (and the customer PO that references this quotation); `409 ALREADY_LINKED` if a non-cancelled order already exists |

Extra response field `pastValidUntil` (true when status is `sent` and `validUntil` is before today): the UI shows a warning; **nothing expires by itself** (Q16).
Validation: customer and dates required, `validUntil >= date` (`DATE_ORDER` on `validUntil`), ≥ 1 line, product active and unique, qty / price as above.

## Customer POs — `/sale/customer-pos`

A record of a document that came from the customer; **no status**. Fields: `poNumber` (customer's own, unique per customer, case-insensitive → `400 VALIDATION_ERROR` `PO_NUMBER_EXISTS` on `poNumber`), `poDate`, `customerId`, `quotationId?` (must be a quotation of the same customer), `note`, `attachment?` (`{ name, size, url }`; `url` is where the file can be opened).
Response adds `inUse` (a non-cancelled sale order references it), `quotationNumber`, `orderNumber` (in the list). Once `inUse`, `PUT` and `DELETE` return `409 IN_USE` (Q5). List params: `q` (PO number, customer), `customer`, `from`, `to` (PO date), `sort` (`poNumber, date, customerCode`).
**Attachment upload:** the mock keeps the name, the size and a browser link (`blob:` / `data:`) to the file, so the Open button and the image preview work in the demo; the link is lost on reload. The real API takes the file as `multipart/form-data` on `POST /sale/customer-pos/:id/attachment` (PDF, PNG or JPG, ≤ 10 MB), serves it back with `GET` (the `url` of the attachment points here, so the browser can open the PDF or image in a new tab), and removes it with `DELETE`; the JSON `attachment` object in the form only mirrors the stored file.

## Sale orders — `/sale/orders`

Create / read / update / delete work like quotations (`PUT` and `DELETE` on **drafts** only; `GET` list sort `number, date, customerCode, deliveryDate, status, total`; search also matches the product code / name of the lines and the quotation and customer PO numbers). Body: `{ customerId, date, deliveryDate?, salesPersonId?, quotationId?, customerPoId?, remarks, lines[] }`; the quotation and the PO must belong to the same customer; `deliveryDate >= date`.
Response adds `approval` (`null` | `"requested"`), `quotationNumber`, `customerPoNumber`, and per line `delivered` (sum of **confirmed** delivery note lines).

Statuses: `draft → confirmed → in_production → ready_to_deliver → delivered → closed`, and `cancelled`.

| Action (`POST /sale/orders/:id/:action`) | From → to | Who | Note |
|---|---|---|---|
| `request-confirm` | draft (`approval` set to `requested`; status stays `draft`) | Worker+ | optional; `409` if already requested. The order is **not editable** while `approval = requested` (UI rule; the server may enforce it too) |
| `approve` | draft → confirmed (clears `approval`) | **Manager / Admin** | optional. A Manager may confirm a draft that was never requested |
| `reject-confirm` | draft, `approval` back to `null` | **Manager / Admin** | **required** (kept in the history) |
| `send-to-factory` | confirmed → in_production | Worker+ | optional |
| `mark-ready` | in_production → ready_to_deliver | Worker+ | optional |
| `close` | delivered → closed | **Manager / Admin** | optional |
| `cancel` | draft / confirmed → cancelled | Worker+ | optional |
| `cancel` | in_production / ready_to_deliver → cancelled | **Manager / Admin** | **required** (Q6) |
| `revert` | back to the status before the latest status change | **Manager / Admin** | **required**; `409` if there is nothing to go back to, or (from `delivered`) while a confirmed delivery note exists — revert the notes first |

Wrong status → `409 INVALID_STATUS`; not allowed for the role → `403 FORBIDDEN`; missing required note → `400 VALIDATION_ERROR` `path ["note"], message "REQUIRED"`.

| Method | Path | Notes |
|---|---|---|
| POST | `/sale/orders/:id/delivery-notes` | order must be `ready_to_deliver`; creates a **draft delivery note** whose lines are the quantities **not yet on any delivery note** (confirmed or draft); `409 NOTHING_TO_DELIVER` when nothing is left |

The order becomes **delivered** when the **last** delivery note that completes every line is confirmed (see below) — that is the one status change that follows another person's click; it is written to the order's history by the same user.

## Delivery notes — `/sale/deliveries`

Created only from a sale order (no `POST /sale/deliveries`). Statuses `draft → delivered`. List params like the others (search: number, order number, customer). Response: `number, date, saleOrderId, saleOrderNumber, customerId, customerCode, customerName, warehouseId, warehouseName, status, lines[], history[], links[]`, each line `{ productId, productCode, productName, ordered, deliveredBefore, remaining, deliverNow }` (`remaining` = ordered − confirmed before − on other draft notes).

| Method | Path | Notes |
|---|---|---|
| GET | `/sale/deliveries`, `/sale/deliveries/:id` | |
| PUT | `/sale/deliveries/:id` | draft only: `{ date, warehouseId (a finished goods warehouse), lines: [{ productId, deliverNow }] }`; `0 ≤ deliverNow ≤ remaining` else `400` with `path ["lines", i, "deliverNow"]` |
| DELETE | `/sale/deliveries/:id` | draft only |
| POST | `/sale/deliveries/:id/confirm` | draft → delivered; at least one `deliverNow > 0`; moves stock out later (Stock module); sets the order to **delivered** when every order line is fully delivered |
| POST | `/sale/deliveries/:id/revert` | Manager / Admin, note required; delivered → draft, and the order goes back from `delivered` to `ready_to_deliver` (`409` if the order is already `closed`) |

## Errors used (besides the common ones)

`INVALID_STATUS` (409) · `ALREADY_LINKED` (409) · `NOTHING_TO_DELIVER` (409) · `IN_USE` (409, customer PO) · `FORBIDDEN` (403) · field codes in `VALIDATION_ERROR`: `REQUIRED`, `INVALID`, `DATE_ORDER`, `DUPLICATE` (a product twice on a document), `PO_NUMBER_EXISTS`.

## Data model sketch (Prisma)

```prisma
model Quotation {
  id            Int      @id @default(autoincrement())
  number        String   @unique @db.VarChar(20)
  date          DateTime @db.Date
  customerId    Int
  salesPersonId Int?
  validUntil    DateTime @db.Date
  remarks       String   @default("") @db.VarChar(500)
  status        String   @db.VarChar(20)          // draft | sent | accepted | rejected | expired
  lines         QuotationLine[]
  history       DocumentHistory[]
  customer      Customer @relation(fields: [customerId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model SaleOrder {
  id            Int      @id @default(autoincrement())
  number        String   @unique @db.VarChar(20)
  date          DateTime @db.Date
  customerId    Int
  quotationId   Int?
  customerPoId  Int?
  salesPersonId Int?
  deliveryDate  DateTime? @db.Date
  remarks       String   @default("") @db.VarChar(500)
  status        String   @db.VarChar(20)          // draft | confirmed | in_production | ready_to_deliver | delivered | closed | cancelled
  approval      String?  @db.VarChar(10)          // null | requested (only while draft)
  lines         SaleOrderLine[]
  deliveryNotes DeliveryNote[]
  history       DocumentHistory[]
}

model CustomerPo {
  id           Int      @id @default(autoincrement())
  poNumber     String   @db.VarChar(50)
  poDate       DateTime @db.Date
  customerId   Int
  quotationId  Int?
  note         String   @default("") @db.VarChar(500)
  attachmentName String? @db.VarChar(255)
  attachmentSize Int?
  attachmentPath String?
  @@unique([customerId, poNumber])
}

model DeliveryNote {
  id          Int      @id @default(autoincrement())
  number      String   @unique @db.VarChar(20)
  date        DateTime @db.Date
  saleOrderId Int
  warehouseId Int
  status      String   @db.VarChar(20)            // draft | delivered
  lines       DeliveryNoteLine[]
  history     DocumentHistory[]
}

// one table for the status history of every document type
model DocumentHistory {
  id         Int      @id @default(autoincrement())
  docType    String   @db.VarChar(20)             // quotation | order | delivery | customerPo
  docId      Int
  action     String   @db.VarChar(30)
  status     String?  @db.VarChar(20)             // the new status, when the entry changed it
  actorId    Int
  note       String?  @db.VarChar(500)
  createdAt  DateTime @default(now())
  @@index([docType, docId])
}

// *Line models: id, <doc>Id, productId, qty Int, unitPrice Int (delivery note line: productId, deliverNow Int)
```

## Printing

The paper version (A4 quotation, sale order, delivery note: company header, customer, lines, totals, remarks; the delivery note has no prices and two signature lines) is drawn by the UI from the document and printed with the browser: the Print icon of the sheet opens the browser print dialog straight away (Print / Save as PDF), with no page in between. **No endpoint is needed.** Company details (name, address, phone, e-mail) are placeholders in `frontend/src/config/company.js`; later a company setting of the backend should supply them (and the qualified invoice number `T` + 13 digits). Server-side PDF generation can replace this later without changing the UI contract.

## Backend checklist

- [ ] Sale-department middleware (Worker / Manager / Admin) on `/sale/*`; the rules in the access table, including the role checks per action
- [ ] Numbering per type and year in a transaction
- [ ] One generic action endpoint per document type that checks `from` status, the role, the required note, and writes `DocumentHistory` in the same transaction
- [ ] Availability service (BOM explosion × stock on hand) shared with Purchase later
- [ ] Price lookup service shared with the line forms
- [ ] Master data `GET` open to every signed-in user, writes Admin only
- [ ] File upload for the customer PO attachment (the `attachment.url` is what the UI opens in a new tab)
- [ ] `POST /sale/quotations/:id/duplicate` (copy as a new draft, see Quotations)
- [ ] `meta.statusCounts`, `meta.sums` and `pageSize` up to 100 on the four lists (see List responses)
- [ ] Turn off `VITE_USE_MOCK` and re-run the test list in the spec
