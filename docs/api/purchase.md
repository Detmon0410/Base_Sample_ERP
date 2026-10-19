# API - Suppliers and purchase orders

Pages: `/purchase/orders` (the stock that is low and the list), `/purchase/orders/new`, `/purchase/orders/:id`, `/purchase/orders/:id/edit`; `/master/suppliers` (the list, `/new`, `/:id`) · Frontend: `frontend/src/pages/purchase`, `pages/suppliers`, `services/purchase.service.js`, `services/suppliers.service.js` · Mock: `services/mock/suppliers.js`, `purchase.js`
Conventions: [README.md](README.md)

```text
Stock low -> Create PO (Draft) -> Print the PO -> Sent -> Received -> Stock + quantities (once) -> Payment recorded
```

The whole flow is on one page for the user: the stock that is low, the form and the list of the purchase orders (PO). The user moves the status by hand; there is no approval step and no separate goods-receipt document.

## Who may call

| Call | Admin | Factory Worker | Sale Worker |
|---|---|---|---|
| Suppliers: read | yes | yes | `403` |
| Suppliers: make, change, delete | yes | `403` | `403` |
| Purchase orders: everything below | yes | yes | `403` |

See [auth.md](auth.md#access-by-role-and-department). The check of the role comes before the check that a record exists.

---

# Suppliers

The calls are the five of every master resource ([master-data.md](master-data.md)): `GET /suppliers`, `GET /suppliers/:id`, `POST /suppliers`, `PUT /suppliers/:id`, `DELETE /suppliers/:id`.

`{ id, code, name, contact, address, active, items, createdAt, updatedAt }`; `items[]`: `{ materialId, unitPrice, materialCode, materialName, unit }` (the last three are read only).

| Field | Rules |
|---|---|
| `code` | Required, unique (`409 DUPLICATE_VALUE`) |
| `name` | Required |
| `contact`, `address` | Optional text |
| `active` | `true` or `false`, **`true` when not sent**. **Only suppliers have `active`** (the other master records have no status). An inactive supplier cannot be chosen on a new or changed PO; it stays on the POs it has, and can be made active again |
| `items[]` | The materials the supplier sells, with the **initial price** a PO line starts from. `materialId` exists, `unitPrice` is a whole number of yen (0 or more), a material appears once (`DUPLICATE` on `items`) |

The list: `GET /suppliers?q=&active=true|false&materialId=&page=&pageSize=` (`q` searches code, name and contact; `materialId` keeps the suppliers that sell it). A list row has `itemCount` and no `items`.

**Delete:** refused with `409 IN_USE` when a PO uses the supplier (`errors`: `[{ "kind": "purchaseOrder", "count": 1, "items": ["PO-2026-0001"] }]`, see [master-data.md](master-data.md#delete-and-409-in_use)); otherwise the supplier and its items are deleted. A **material** that a supplier sells (`kind` `supplier`) or that a PO line uses (`purchaseOrder`) cannot be deleted either.

```text
Supplier(id, code UNIQUE, name, contact, address, active)
SupplierMaterial(supplier_id, material_id, unit_price)       UNIQUE (supplier_id, material_id)
```

A **material** also gets `unit` (text, `pcs` when not sent: for example `kg`, `m`), shown on a PO line ([master-data.md](master-data.md)).

---

# Purchase orders

## Calls

| Method | Path | Notes |
|---|---|---|
| `GET` | `/purchase-orders` | query `q` (PO No., supplier name, notes), `status` (`Draft`, `Sent`, `Received`), `supplierId`, `paid` (`true`/`false`), `page`, `pageSize`. Newest first; rows have no `lines` |
| `GET` | `/purchase-orders/:id` | the whole PO (below) |
| `POST` | `/purchase-orders` | `201`. The number `PO-yyyy-0001` is given by the server; status `Draft` |
| `PUT` | `/purchase-orders/:id` | replaces the header and the lines. **Draft only** (`409 PO_LOCKED`) |
| `DELETE` | `/purchase-orders/:id` | `200`, `data: null`. **Draft only** (`409 PO_LOCKED`). Its files go with it |
| `POST` | `/purchase-orders/:id/status` | moves the status one step forward; `Received` adds the stock |
| `POST` | `/purchase-orders/:id/payment` | the one payment of a received PO |

Body of `POST` / `PUT`:

```json
{
  "supplierId": 3, "requiredDate": "2026-11-01", "department": "Factory", "notes": "",
  "lines": [ { "materialId": 5, "quantity": 100, "unitPrice": 520 } ]
}
```

| Field | Rules |
|---|---|
| `supplierId` | Required; an existing **active** supplier (`REQUIRED`; `SUPPLIER_INACTIVE` when it is not active) |
| `requiredDate` | Required, a real date `YYYY-MM-DD` (`INVALID_DATE`) |
| `department` | Required, one of `Sales`, `Factory`, `Accounting`, `Administration` (`INVALID` otherwise). A plain label on the PO: it gives no access and starts no approval. The frontend starts it from the department of the user |
| `notes` | Optional text |
| `lines[]` | At least one (`REQUIRED` on `lines`). `materialId` is a material **of this supplier** (`NOT_SOLD_BY_SUPPLIER` otherwise), `quantity` is above 0 with up to 3 decimals (`INVALID`), `unitPrice` is a whole number of yen, 0 or more (`INVALID`; the frontend starts it from the price of the supplier and the user may change it), a material appears once (`DUPLICATE` on `lines`) |

Body of the status call: `{ "status": "Sent" }`, or `{ "status": "Received", "lots": [ { "lineId": 12, "lotNumber": "L-2610-A" } ] }` (a lot number for **every** line: `REQUIRED` on `lots.n.lotNumber`).

Body of the payment: `{ "paymentDate": "2026-11-05", "amount": 52000, "method": "Bank transfer", "referenceNo": "TT-77", "note": "" }`.

## The purchase order

`{ id, poNumber, supplierId, supplierName, supplierAddress, department, requiredDate, notes, status, lines, total, paid, payment, receivedAt, createdBy, createdByName, createdAt, updatedAt }`

* `lines[]`: `{ id, materialId, materialCode, materialName, unit, quantity, unitPrice, amount, lotNumber }`; `amount` = `quantity` x `unitPrice` rounded to a whole yen, `lotNumber` is `null` until the PO is received; `total` is the sum of the amounts (computed by the server).
* `status`: `Draft` -> `Sent` -> `Received`, **one step forward at a time, by hand**. There is no way back.
* `payment` is `null` or `{ paymentDate, amount, method, referenceNo, note }`; `paid` is `true` when there is a payment.
* The printed form of the PO (number, supplier and address, required date, department, the lines with the total, the notes, blank spaces for prepared by, approved by, received by) is made by the frontend from this data, at any status. The files of a PO are in [files.md](files.md) (`ownerType` `PurchaseOrder`, kinds `PO_FILE`, `QUOTATION`, `OTHER`).

## Rules

| Rule | Detail |
|---|---|
| Change and delete | Only in `Draft` (`409 PO_LOCKED`) |
| Status | Only the next step (`409 INVALID_STATUS_CHANGE`): Draft to Sent, Sent to Received |
| Received | Every line is added to the stock, **once**. The line goes to the lot typed for it (`lots`); a lot number that exists (any case) gets the quantity added, a new one makes a new lot. Each line writes a stock change `Add` with the note `Received PO-...`, the date of today and `purchaseOrderId` ([stock.md](stock.md)). Nothing is added when a lot number is missing (the whole call is refused) |
| Once only | A second `Received` answers `409 INVALID_STATUS_CHANGE` and adds nothing |
| Payment | Only for a `Received` PO (`409 PO_NOT_RECEIVED`), **once** (`409 ALREADY_PAID`). `paymentDate` required and real; `amount` equal to the total (`MUST_EQUAL_TOTAL`); `method` one of `Cash`, `Bank transfer`, `Cheque`, `Credit card`, `Other` (`REQUIRED` otherwise); `referenceNo` and `note` optional. The payment is kept on the PO; there is no invoice or receipt for it. The Accounting page ([invoices.md](invoices.md)) only lists the received POs (`status=Received&paid=false` to pay, `paid=true` paid) and links to the PO |
| Low stock | The page uses `GET /materials` (the materials with `stockStatus` `Low` or `Out`, [stock.md](stock.md)); there is no endpoint of its own |

## Errors

| HTTP | `error` | When |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | `errors` = `[{ "path": ["lines", "0", "materialId"], "code": "NOT_SOLD_BY_SUPPLIER" }]`. Codes: `REQUIRED`, `INVALID`, `INVALID_DATE`, `DUPLICATE`, `SUPPLIER_INACTIVE`, `NOT_SOLD_BY_SUPPLIER`, `MUST_EQUAL_TOTAL` |
| 403 | `FORBIDDEN` | A Sale Worker, or a Factory Worker who changes a supplier |
| 404 | `NOT_FOUND` | No such record |
| 409 | `PO_LOCKED` | Change or delete of a PO that is not `Draft` |
| 409 | `INVALID_STATUS_CHANGE` | A status that is not the next step |
| 409 | `PO_NOT_RECEIVED` | Payment before `Received` |
| 409 | `ALREADY_PAID` | A second payment |
| 409 | `IN_USE` | Delete of a supplier or a material that is used (above) |

## Data needed

```text
PurchaseOrder(id, po_number UNIQUE, supplier_id, department, required_date, notes, status 'Draft'|'Sent'|'Received',
              received_at NULL, created_by -> User.id, created_at, updated_at)
PurchaseOrderLine(id, po_id, material_id, quantity, unit_price, lot_number NULL)       UNIQUE (po_id, material_id)
PurchasePayment(po_id UNIQUE, payment_date, amount, method, reference_no, note)
StockChange.purchase_order_id NULL                                                    (set when a PO is received)
```
