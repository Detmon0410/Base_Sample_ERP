# API — Production orders

Pages: `/sale/orders` and `/sale/orders/:id` (`/sale/orders/new` is gone: an order is made by [Confirm QT](qt.md#confirm-qt-post-qtidconfirm)) · Frontend: `frontend/src/pages/orders`, `services/orders.service.js` · Mock: `services/mock/orders.js`
Conventions: [README.md](README.md)

## Who may call

| Call | Admin | Sale Worker | Factory Worker |
|---|---|---|---|
| `GET /orders`, `GET /orders/:id` | yes | yes | yes |
| `PUT /orders/:id` (before the start) | yes | yes | `403 FORBIDDEN` |
| `POST /orders/:id/start` | yes | `403 FORBIDDEN` | yes |
| `POST /orders/:id/progress` | yes | `403 FORBIDDEN` | yes (not on a completed process) |

An order is **made by Confirm QT** ([qt.md](qt.md)), so there is no `POST /orders`. A Sale Worker (or the Admin) prepares the order (lines and processes); a Factory Worker (or the Admin) starts it and records the progress. See [auth.md](auth.md#access-by-role-and-department).

## Calls

| Method | Path | Notes |
|---|---|---|
| `GET` | `/orders` | query `q` (order number, customer name, QT number, notes), `status` (`Draft`, `In Progress`, `Completed`), `page`, `pageSize`. Rows have no `lines` and no `history` |
| `GET` | `/orders/:id` | the whole order (below) |
| `PUT` | `/orders/:id` | replaces the order date, the notes, the lines and the processes. Only before the start. The QT and the customer of an order never change (they are ignored if sent) |
| `POST` | `/orders/:id/start` | the Admin or a Factory Worker starts the production |
| `POST` | `/orders/:id/progress` | adds one progress entry to a process |

The evidence files of an order (images, documents) are uploaded and read through [files.md](files.md) (`ownerType` `ProductionOrder`): everybody who can read the order reads them; the Admin and the Factory Worker upload and delete.

Body of `PUT`:

```json
{
  "orderDate": "2026-10-02", "notes": "",
  "lines": [ { "productId": 5, "quantity": 10, "unitPrice": 45000,
               "processes": [ { "name": "Cutting", "instructions": "" }, { "name": "Welding", "instructions": "" } ] } ]
}
```

The order of `processes` is the sequence (1, 2, ...). `quantity` is a whole number above 0, `unitPrice` is 0 or more (the frontend fills it with the price of the product). Codes: `REQUIRED`, `INVALID`, `INVALID_DATE`.

Body of `progress`: `{ "processId": 12, "status": "Not Started" | "In Progress" | "Completed", "completedQuantity": 4, "workDate": "2026-10-03", "note": "" }`

## The order

`{ id, orderNumber, qtId, qtNumber, customerPoNumber, customerPoDate, customerId, customerName, orderDate, notes, status, started, startedAt, invoice, lines, history, createdAt, updatedAt }`

* `orderNumber` is `ORD-yyyy-0001`, unique, given by the server when Confirm QT makes the order. `customerPoNumber` and `customerPoDate` come from the QT; the customer's PO file is one of the files of the order ([files.md](files.md), kind `PO_FILE`).
* `status` is **computed**, never sent: `Draft` until a process has started (an order that was started but has no progress yet is still `Draft`; the page shows "Production started" for it) → `In Progress` (at least one process has started) → `Completed` (every process of every line is `Completed`). Same words as section 6 of the requirements.
* `invoice` is `null` or `{ id, invoiceNumber, status, receiptNumber }` (`receiptNumber` is `null` until the payment); the order page links to the invoice and its receipt.
* `lines[]`: `{ id, productId, productCode, productName, quantity, unitPrice, processes[] }`; `processes[]`: `{ id, sequence, name, instructions, status, completedQuantity }`. The required quantity of a process is the `quantity` of its line.
* `history[]`, newest first, one entry for **every** progress update (never changed): `{ id, lineId, processId, processName, status, completedQuantity, workDate, note, userId, userName, at }`.

## Rules

* **Start** needs at least one line and one process on every line (`409 ORDER_NOT_READY`) **and enough stock**: it adds up the BOM of every line (BOM quantity x quantity of the line) and, if a material is short, answers `409 STOCK_SHORT` with `errors: [{ materialId, materialCode, materialName, need, have }]` and changes nothing; if the stock is enough, the order starts and every material is deducted from its lots, **the oldest lot first**, as `Deduct` movements (note `Production started`, tied to the order) ([stock.md](stock.md)); after it the products and processes cannot change (`409 ORDER_LOCKED` on `PUT`); a second start is `409 ALREADY_STARTED`.
* **Progress** only on a started order (`409 ORDER_NOT_STARTED`) that has no invoice (`409 ORDER_INVOICED`).
* `completedQuantity` is the **latest total**, not an amount to add: a whole number from 0 to the required quantity (`TOO_HIGH` above it).
* `Completed` only with the full quantity (`MUST_EQUAL_REQUIRED`), and the full quantity needs the status `Completed` (`MUST_BE_COMPLETED`); `Not Started` has quantity 0 (`MUST_BE_ZERO`).
* A **completed process** can be changed by an Admin only (`403 COMPLETED_LOCKED` for a Worker of any department), and reopening it (a status other than `Completed`) needs a `note` (`REOPEN_NOTE`).
* `workDate` is required, a real date.

```text
ProductionOrder(id, order_number UNIQUE, qt_id, customer_id, order_date, notes, started_at NULL)
OrderLine(id, order_id, product_id, quantity, unit_price)
OrderProcess(id, line_id, sequence, name, instructions, status, completed_quantity)
ProgressEntry(id, process_id, status, completed_quantity, work_date, note, user_id, at)
```
