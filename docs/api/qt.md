# API - QT references (QT 2.0)

Page: `/sale/quotations` (the list, `/new`, `/:id`) · Frontend: `frontend/src/pages/qt`, `services/qt.service.js` · Mock: `services/mock/qt.js`, `qtConfirm.js`
Conventions: [README.md](README.md) · The five calls of a resource: [master-data.md](master-data.md) · Admin and Sale Worker (a Factory Worker: `403 FORBIDDEN`)

A QT is the quotation made in the system: the customer, the lines (product, quantity, unit price), the customer's PO, a printed form, and **Confirm QT**, which makes the production order. The files of a QT (the customer's PO, the quotation) are attachments: [files.md](files.md).

```text
Create QT (Draft) -> Print the QT form -> Upload the customer PO -> Confirm QT -> a production order (Draft) is made
```

## Calls

| Method | Path | Notes |
|---|---|---|
| `GET` | `/qt` | query `q` (QT number, notes, customer PO number, customer name), `status` (`Draft`, `Confirmed`), `step` (`Draft`, `Confirmed`, `InProduction`, `Done`), `page`, `pageSize`. Rows have no `lines` |
| `GET` | `/qt/:id` | the whole QT (below) |
| `POST` | `/qt` | `201`, the QT. Status `Draft` |
| `PUT` | `/qt/:id` | the QT. A confirmed QT keeps its customer and its lines (`409 QT_LOCKED`); the rest may change |
| `POST` | `/qt/:id/confirm` | Confirm QT (below) |
| `DELETE` | `/qt/:id` | `200`, `data: null`. Only a `Draft`: a confirmed QT answers `409 IN_USE` (its order uses it; `errors`: see [master-data.md](master-data.md#delete-and-409-in_use)). The files go with the QT |

Body of `POST` / `PUT`:

```json
{
  "qtNumber": "QT-001", "qtDate": "2026-10-01", "customerId": 3, "notes": "",
  "customerPoNumber": "PO-77", "customerPoDate": "2026-10-03",
  "lines": [ { "productId": 5, "quantity": 10, "unitPrice": 45000 }, { "productId": 6, "quantity": 4, "unitPrice": 9000 } ]
}
```

| Field | Rules |
|---|---|
| `qtNumber` | Required, unique (typed by the user) |
| `qtDate` | Required, a real date `YYYY-MM-DD` |
| `customerId` | Required, an existing customer |
| `notes` | Optional text |
| `customerPoNumber`, `customerPoDate` | Optional (typed by the user); the date, when given, is a real date. The user is **warned**, not stopped, at Confirm when the PO file is missing |
| `lines[]` | A QT may have no line while it is a `Draft`; Confirm needs at least one. `productId` exists, `quantity` is a whole number above 0, `unitPrice` is 0 or more (the frontend starts it from the price of the product). A product appears once (`DUPLICATE` on `lines`) |

Errors: `400 VALIDATION_ERROR` with codes `REQUIRED`, `INVALID`, `INVALID_DATE`, `DUPLICATE`; `409 DUPLICATE_VALUE` for a used `qtNumber`; `409 QT_LOCKED`.

## The QT

`{ id, qtNumber, qtDate, customerId, customerName, customerAddress, notes, customerPoNumber, customerPoDate, status, lines, total, productionOrderId, productionOrderNumber, step, createdAt, updatedAt }`

* `status`: `Draft` or `Confirmed`. Nothing else (no `Sent`, `Rejected`, `Expired`). The user moves it by hand with Confirm; there is no approval step.
* `lines[]`: `{ productId, productCode, productName, quantity, unitPrice, amount }`; `amount` = `quantity` x `unitPrice`; `total` = the sum of the amounts (both computed by the server).
* `step` is computed: `Draft` (not confirmed), `Confirmed` (the order has not started), `InProduction` (started, not every process completed), `Done` (every process completed). The Sales page shows it as the steps of the job.
* `productionOrderId` and `productionOrderNumber` are `null` until the QT is confirmed, then the order made from it. One order per QT.
* There is no `file` field any more: the files are in [files.md](files.md) (`ownerType` `QtReference`; kinds `PO_FILE`, `QUOTATION`, `OTHER`).
* The QT form is printed by the frontend from this data (QT number, date, customer and address, the lines and the total, the notes, blank spaces for prepared by, approved by and customer). It can be printed at any status.

## Confirm QT: `POST /qt/:id/confirm`

No body. `200` with:

```json
{ "qt": { "...": "the QT, now Confirmed" }, "order": { "...": "the production order, as GET /orders/:id" }, "alreadyConfirmed": false, "warnings": [] }
```

| Rule | Detail |
|---|---|
| Needs | At least one line (`400 VALIDATION_ERROR`, `REQUIRED` on `lines`). The customer is always there |
| Result | The QT becomes `Confirmed` and **one** production order is made: status `Draft`, the customer, the order date = today, and the lines of the QT with their quantities and **unit prices**. The processes are empty; a Sale Worker or an Admin adds them before the start ([orders.md](orders.md)) |
| Once only | Pressing it again changes nothing and answers the existing order with `alreadyConfirmed: true` |
| PO file | When the QT has a customer PO file (`PO_FILE`), the order gets a copy of it (kind `PO_FILE`, owner the order), so a Factory Worker, who cannot read the QT, can read the PO. A PO file added to or taken from the QT later follows to the order. No PO file: `warnings: ["NO_PO_FILE"]`; the QT is confirmed all the same |
| Locked | After Confirm the customer and the lines cannot change (`409 QT_LOCKED`) and the QT cannot be deleted |
| Undo | There is none. Cancelling the order does not reopen the QT; a new QT is made if the sale changes |

## Data needed

```text
QtReference(id, qt_number UNIQUE, qt_date, customer_id, notes, customer_po_number, customer_po_date,
            status 'Draft'|'Confirmed', production_order_id UNIQUE NULL)
QtLine(id, qt_id, product_id, quantity, unit_price)        UNIQUE (qt_id, product_id)
```
