# API - Purchase: suppliers and purchase orders

Pages: `/purchase/orders` (one page: low stock, the PO form, the PO list and the PO detail) and `/master/suppliers` · Source: [Purchase Logic Draft 2](../Purchase%20Logic%20Draft2.md), [Version 2.0 Plan](../Version%202.0%20Plan.md) phase 4
Conventions (envelope, error codes, 401 handling): [README.md](README.md) · The five calls of a resource: [master-data.md](master-data.md) · Files: [files.md](files.md)

```text
Stock low -> Create PO (Draft) -> Print PDF -> Sent -> Received (lot per line) -> Stock +qty -> Payment
```

## Who may call

| Call | Admin | Sale Worker | Factory Worker |
|---|---|---|---|
| `GET /suppliers`, `GET /suppliers/:id` | yes | `403` | yes |
| `POST`, `PUT`, `DELETE /suppliers` | yes | `403` | `403` |
| every call of `/purchase-orders` | yes | `403` | yes |
| files of a PO (`ownerType` `PurchaseOrder`) | yes | `403` | yes |

The role check comes before the check that the record exists.

## Suppliers (master data)

`GET/POST/PUT/DELETE /suppliers[/:id]` with the five calls of [master-data.md](master-data.md). Query: `q` (code, name, contact), `active` (`true` / `false`), `page`, `pageSize`.

Body and answer: `{ id, code, name, contact, address, active, items }`

| Field | Rules |
|---|---|
| `code` | Required, unique (`409 DUPLICATE_VALUE`) |
| `name` | Required |
| `contact`, `address` | Optional text |
| `active` | Boolean, default `true`. An inactive supplier cannot be picked on a **new** PO; its old POs keep it. It is the only master record with `active` |
| `items[]` | `{ materialId, unitPrice }` on write; on read also `materialCode`, `materialName`, `unit`. A material once per supplier (`DUPLICATE`); `unitPrice` is whole yen, 0 or more (`INVALID`); the material exists (`INVALID`). `PUT` replaces the whole list |

`DELETE` is refused with `409 IN_USE` (`kind` `purchaseOrder`) when a PO uses the supplier; otherwise it is deleted with its items.

## Materials: the new `unit`

A material has `unit` (text up to 20 characters, default `pcs`, for example `kg`). It is in every view of a material and in the body of `POST` / `PUT /materials`. Deleting a material is also refused with `IN_USE` when a supplier item (`supplier`) or a PO line (`purchaseOrder`) uses it.

The low-stock part of the page uses `GET /materials?status=Low` and `status=Out` ([stock.md](stock.md)).

## Calls

| Method | Path | Notes |
|---|---|---|
| `GET` | `/purchase-orders` | Query `q` (PO number, supplier name), `status` (`Draft`, `Sent`, `Received`), `supplierId`, `paid` (`true` / `false`), `page`, `pageSize`. Newest first. Rows have no `lines` |
| `GET` | `/purchase-orders/:id` | The whole PO with lines and payment |
| `POST` | `/purchase-orders` | `201`. Status `Draft` |
| `PUT` | `/purchase-orders/:id` | Draft only. Replaces the supplier, dates, department, notes and lines |
| `DELETE` | `/purchase-orders/:id` | `200`, `data: null`. Draft only; its files go with it |
| `POST` | `/purchase-orders/:id/status` | Moves the status one step forward (below) |
| `POST` | `/purchase-orders/:id/payment` | Records the payment (below) |

Body of `POST` / `PUT`:

```json
{
  "supplierId": 2, "requiredDate": "2026-10-20", "department": "Factory", "notes": "",
  "lines": [ { "materialId": 7, "quantity": 120.5, "unitPrice": 380 } ]
}
```

| Field | Rules |
|---|---|
| `supplierId` | Required, an existing supplier. `SUPPLIER_INACTIVE` when it is inactive (a PO may keep its own inactive supplier on `PUT`) |
| `requiredDate` | Required, a real date (`REQUIRED`, `INVALID_DATE`) |
| `department` | `Sales`, `Factory`, `Accounting` or `Administration`; when missing it is the department of the user |
| `notes` | Optional text |
| `lines[]` | At least one (`REQUIRED` on `lines`). `materialId` must be sold by the supplier (`NOT_SOLD_BY_SUPPLIER`) and appear once (`DUPLICATE`). `quantity` is more than 0 with up to 3 decimals. `unitPrice` is whole yen, 0 or more; when it is left out, it starts from the price of the supplier's item. The unit is copied from the material |

`amount` of a line = `quantity` x `unitPrice` rounded to a whole yen; `total` = the sum of the amounts (both computed by the server).

## The purchase order

`{ id, poNumber, supplierId, supplierName, department, requiredDate, notes, status, total, paid, payment, receivedAt, createdBy, createdByName, createdAt, updatedAt, lines }`

* `poNumber` is `PO-yyyy-0001`, unique, given by the server.
* `status`: `Draft`, `Sent`, `Received`.
* `paid` is `true` when a payment exists; `payment` is `null` or `{ date, amount, method, referenceNo, note }`.
* `lines[]`: `{ id, materialId, materialCode, materialName, unit, quantity, unitPrice, amount, lotNumber }`. `lotNumber` is `null` until the PO is received.
* The PDF of the PO is printed by the frontend from this data (supplier, required date, department, lines, total, blank spaces for prepared by, approved by, received by). It can be printed at any status.

## Status: `POST /purchase-orders/:id/status`

The user moves it by hand, one step forward, never back.

| Body | From | Effect |
|---|---|---|
| `{ "status": "Sent" }` | `Draft` | The PO becomes `Sent`. Lines are locked |
| `{ "status": "Received", "lots": [ { "lineId": 31, "lotNumber": "LOT-20261020" } ] }` | `Sent` | The PO becomes `Received` and `receivedAt` is set. **Every line needs a lot number** (`REQUIRED` on `lots.n.lotNumber`). Each line is added to its lot (a new lot number opens the lot) as a stock change `Add`, note `Received PO-...`, linked to the PO (`purchaseOrderId`) |

* **Once only:** `Received` on a PO that is `Received` already answers `200` with the PO and adds nothing.
* Any other step (`Draft` to `Received`, back, `Sent` again) answers `409 INVALID_STATUS_CHANGE`.
* The frontend suggests `LOT-yyyymmdd` for the lot number.

## Payment: `POST /purchase-orders/:id/payment`

Body `{ "paymentDate": "2026-10-25", "amount": 45790, "method": "Bank transfer", "referenceNo": "TT-1020", "note": "" }`

| Field | Rules |
|---|---|
| `paymentDate` | Required, a real date |
| `amount` | Whole yen, **equal to the total** of the PO (`MUST_EQUAL_TOTAL`) |
| `method` | Required: `Cash`, `Bank transfer`, `Cheque`, `Credit card`, `Other` |
| `referenceNo`, `note` | Optional |

`200` with the PO (`paid: true`). One payment per PO. The payment is kept on the PO and does not go through Accounting.

## Stock history

Entries of [stock.md](stock.md) (`GET /stock-changes`, `GET /materials/:id/stock-changes`) now also carry `purchaseOrderId` and `purchaseOrderNumber` (`null` when the change is not from a PO), so the Movements page can link to the PO. The search `q` of `/stock-changes` also matches the PO number.

## Errors

| HTTP | `error` | When |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | `errors` = `[{ "path": ["lines", "0", "materialId"], "code": "NOT_SOLD_BY_SUPPLIER" }]`. Codes: `REQUIRED`, `INVALID`, `INVALID_DATE`, `DUPLICATE`, `SUPPLIER_INACTIVE`, `NOT_SOLD_BY_SUPPLIER`, `MUST_EQUAL_TOTAL` |
| 403 | `FORBIDDEN` | A Sale Worker, or a Factory Worker writing a supplier |
| 404 | `NOT_FOUND` | No such supplier or PO |
| 409 | `DUPLICATE_VALUE` | Supplier `code` used already |
| 409 | `IN_USE` | Delete of a supplier that has a PO, or a material used by a supplier or a PO |
| 409 | `PO_LOCKED` | `PUT` or `DELETE` of a PO that is not `Draft` |
| 409 | `INVALID_STATUS_CHANGE` | Anything other than the next step |
| 409 | `PO_NOT_RECEIVED` | Payment before `Received` |
| 409 | `ALREADY_PAID` | A second payment |

## Data needed

```text
Supplier(id, code UNIQUE, name, contact, address, active)       SupplierMaterial(supplier_id, material_id, unit_price)   UNIQUE(supplier_id, material_id)
PurchaseOrder(id, po_number UNIQUE, supplier_id, department, required_date, notes, status, total, received_at NULL, created_by)
PurchaseOrderLine(id, po_id, material_id, quantity, unit, unit_price, amount, lot_number NULL)
PurchasePayment(id, po_id UNIQUE, payment_date, amount, method, reference_no, note)
Material.unit        StockChange.purchase_order_id NULL
```
