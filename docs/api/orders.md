# API — Production orders

Pages: `/orders`, `/orders/new`, `/orders/:id` · Frontend: `frontend/src/pages/orders`, `services/orders.service.js` · Mock: `services/mock/orders.js`
Conventions: [README.md](README.md)

## Who may call

| Call | Admin | Worker |
|---|---|---|
| `GET /orders`, `GET /orders/:id` | yes | yes |
| `POST /orders`, `PUT /orders/:id`, `POST /orders/:id/start` | yes | `403 FORBIDDEN` |
| `POST /orders/:id/progress` | yes | yes (not on a completed process) |

## Calls

| Method | Path | Notes |
|---|---|---|
| `GET` | `/orders` | query `q` (order number, customer name, QT number, notes), `status` (`New`, `In Progress`, `Completed`), `page`, `pageSize`. Rows have no `lines` and no `history` |
| `GET` | `/orders/:id` | the whole order (below) |
| `POST` | `/orders` | `201`. The number `ORD-yyyy-0001` is given by the server |
| `PUT` | `/orders/:id` | replaces the header, the lines and the processes. Only before the start |
| `POST` | `/orders/:id/start` | the Admin starts the production |
| `POST` | `/orders/:id/progress` | adds one progress entry to a process |

Body of `POST` / `PUT`:

```json
{
  "qtId": 1, "customerId": 3, "orderDate": "2026-10-02", "notes": "",
  "lines": [ { "productId": 5, "quantity": 10, "unitPrice": 45000,
               "processes": [ { "name": "Cutting", "instructions": "" }, { "name": "Welding", "instructions": "" } ] } ]
}
```

The order of `processes` is the sequence (1, 2, ...). `quantity` is a whole number above 0, `unitPrice` is 0 or more (the frontend fills it with the price of the product). Codes: `REQUIRED`, `INVALID`, `INVALID_DATE`.

Body of `progress`: `{ "processId": 12, "status": "Not Started" | "In Progress" | "Completed", "completedQuantity": 4, "workDate": "2026-10-03", "note": "" }`

## The order

`{ id, orderNumber, qtId, qtNumber, customerId, customerName, orderDate, notes, status, started, startedAt, invoice, lines, history, createdAt, updatedAt }`

* `status` is **computed**, never sent: `New` (not started) → `In Progress` (started) → `Completed` (every process of every line is `Completed`).
* `invoice` is `null` or `{ id, invoiceNumber, status }`.
* `lines[]`: `{ id, productId, productCode, productName, quantity, unitPrice, processes[] }`; `processes[]`: `{ id, sequence, name, instructions, status, completedQuantity }`. The required quantity of a process is the `quantity` of its line.
* `history[]`, newest first, one entry for **every** progress update (never changed): `{ id, lineId, processId, processName, status, completedQuantity, workDate, note, userId, userName, at }`.

## Rules

* **Start** needs at least one line and one process on every line (`409 ORDER_NOT_READY`); after it the products and processes cannot change (`409 ORDER_LOCKED` on `PUT`); a second start is `409 ALREADY_STARTED`.
* **Progress** only on a started order (`409 ORDER_NOT_STARTED`) that has no invoice (`409 ORDER_INVOICED`).
* `completedQuantity` is the **latest total**, not an amount to add: a whole number from 0 to the required quantity (`TOO_HIGH` above it).
* `Completed` only with the full quantity (`MUST_EQUAL_REQUIRED`), and the full quantity needs the status `Completed` (`MUST_BE_COMPLETED`); `Not Started` has quantity 0 (`MUST_BE_ZERO`).
* A **completed process** can be changed by an Admin only (`403 COMPLETED_LOCKED` for a Worker), and reopening it (a status other than `Completed`) needs a `note` (`REOPEN_NOTE`).
* `workDate` is required, a real date.

```text
ProductionOrder(id, order_number UNIQUE, qt_id, customer_id, order_date, notes, started_at NULL)
OrderLine(id, order_id, product_id, quantity, unit_price)
OrderProcess(id, line_id, sequence, name, instructions, status, completed_quantity)
ProgressEntry(id, process_id, status, completed_quantity, work_date, note, user_id, at)
```
