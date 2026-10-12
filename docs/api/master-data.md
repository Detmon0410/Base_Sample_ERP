# API — Master data: customers, products, materials and stock, users

Pages: `/customers`, `/products`, `/stock/materials` (in the Stock group of the menu, S4), `/users` · Frontend: `frontend/src/pages/master`, `pages/stock`, `pages/users`, `services/master.service.js` · Mock: `services/mock/master.js`, `services/mock/stock.js`
Conventions: [README.md](README.md) · Data: [the specification, section 4](../specs/s1-mini-erp-workflow.md)

## The five calls of every resource

`{resource}` is `customers`, `products`, `materials` or `users`. Master data has **no status** (no active / inactive): a record that is not used is deleted, and a record that is used is **kept** by refusing the delete ([plan S3](../specs/s3-dashboard-crud-pdf.md), section 5).

| Method | Path | Body | Result |
|---|---|---|---|
| `GET` | `/{resource}` | – (query: `q`, `page`, `pageSize`) | `data`: records, newest first; `meta`: `{ page, pageSize, total }` |
| `GET` | `/{resource}/:id` | – | the record |
| `POST` | `/{resource}` | the fields | `201`, the record |
| `PUT` | `/{resource}/:id` | the fields | the record |
| `DELETE` | `/{resource}/:id` | – | `200`, `data: null`; or `409 IN_USE` (below) |

Query: `q` searches the fields named below (case-insensitive, contains), `pageSize` is 20 in the frontend.

## Delete and `409 IN_USE`

`DELETE` is for the Admin. A record that is still used is not deleted; the answer is

```json
{ "success": false, "error": "IN_USE", "message": "...", "errors": [ { "kind": "order", "count": 2, "items": ["ORD-2026-0001", "ORD-2026-0002"] } ] }
```

`errors` is a list of the places where the record is used: `kind`, how many (`count`) and the first five names (`items`; the frontend adds "..." when `count` is larger). The frontend shows them under the title of the record.

| Record | Refused when (`kind`) | When it is deleted, it also removes |
|---|---|---|
| customer | a QT reference (`qt`) or a production order (`order`) uses it. An invoice keeps its own copy of the name and address | – |
| product | a line of a production order uses it (`order`) | its BOM |
| material | the BOM of a product uses it (`product`), or it has a stock change after its first stock (`stockChange`) | its lots and the first stock ("Initial stock") |
| user | it is the user who is signed in (`self`), the last Admin (`lastAdmin`), or it recorded a progress update (`progress`) or a stock change (`stock`) | – |

A QT reference is deleted the same way (`DELETE /qt/:id`, refused with `order` when a production order uses it; its file goes with it).

## Who may call

| Resource | Read | Write |
|---|---|---|
| customers, users | Admin | Admin |
| products, materials (and their stock history) | Admin, Worker | Admin |

Others answer `403 FORBIDDEN`.

## Fields and rules

| Resource | Fields | Searched by | Rules |
|---|---|---|---|
| customers | `name` (required), `address`, `email`, `telephone` | name, email, telephone | `email`, when given, is an email |
| products | `code` (required, unique), `name` (required), `price` (0 or more, whole yen), `bom`: `[{ materialId, quantity }]` | code, name | each `materialId` exists, `quantity` is more than 0, a material appears once in the BOM. The BOM is for reference: it never moves stock |
| materials | `code` (required, unique), `name` (required), `lots`: `[{ lotNumber, quantity }]` (up to 3 decimals) | code, name | a lot number is unique inside the material (case-insensitive). `lots` is read on **create** only; afterwards a lot changes only through stock changes (below), and `PUT` ignores `lots` |
| users | `name`, `department`, `email` (unique, lower-cased), `role`, `password` | name, email, department | `department` is one of the four, `role` is `Admin` or `Worker`. `password` is required on create and at least 6 characters; on `PUT` an empty password keeps the current one. The password is never returned; the response also has `createdAt`, `lastLoginAt` |

Errors

| HTTP | `error` | When |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | `errors` = `[{ "path": ["bom", "0", "quantity"], "code": "INVALID" }]`. Codes: `REQUIRED`, `INVALID`, `DUPLICATE`, `TOO_SHORT` |
| 409 | `DUPLICATE_VALUE` | A unique value (`code`, `email`) is used already; `errors` names the field with `DUPLICATE` |
| 409 | `IN_USE` | `DELETE` of a record that is still used (above) |
| 404 | `NOT_FOUND` | No such record |
| 403 | `FORBIDDEN` | The role may not do this |

Changing the password of a user ends their sessions ([auth.md](auth.md)). A user account cannot be disabled in this version.

## Stock changes of a material

The production never changes stock by itself. An Admin changes it by hand, at any time; a Worker may read the history.

| Method | Path | Body | Result |
|---|---|---|---|
| `GET` | `/materials/:id/stock-changes` | – | the history, newest first |
| `POST` | `/materials/:id/stock-changes` | below | `201`, the material with its new lots |

Body: `{ "kind": "Add" | "Deduct" | "Adjust", "lotNumber", "quantity", "changeDate": "YYYY-MM-DD", "note", "orderId"? }`

| Kind | `quantity` | Lot | Note |
|---|---|---|---|
| `Add` | more than 0 | an existing lot, or a **new lot number** (the lot is opened) | optional |
| `Deduct` | more than 0 (the change is minus) | must exist; `orderId` links a production order (optional) | optional |
| `Adjust` | a plus or a minus number, not 0 (after a count) | must exist | **required** |

Quantities have up to 3 decimals. A change that would make the lot negative is refused: `409 STOCK_NEGATIVE`, `errors: [{ path: ["quantity"], code: "STOCK_NEGATIVE" }]`, and the lot stays as it was. Other codes: `LOT_NOT_FOUND` (Deduct or Adjust on a lot that does not exist), `INVALID_DATE`, `REQUIRED`, `INVALID`.

### The movements of every material: `GET /stock-changes`

The ledger of every stock change of every material together (the page `/stock/movements`); read only, for an Admin and a Worker.

| Query | Meaning |
|---|---|
| `q` | contains, case-insensitive, in the material code or name, the lot number, the production order number or the note |
| `type` | `Add`, `Deduct` or `Adjust` |
| `from`, `to` | the **date of the change** (`changeDate`), `YYYY-MM-DD`, both ends included |
| `page`, `pageSize` | the frontend uses 20 |

`data` is a list of the entries below with `materialCode` and `materialName` added, **newest `changeDate` first** (then the last made first); `meta` is `{ page, pageSize, total }`. `400 VALIDATION_ERROR` with `INVALID` (a type that does not exist) or `INVALID_DATE` (a `from` or `to` that is not a real day). The changes of a deleted material are gone with it.

A history entry (never changed or deleted): `{ id, materialId, lotNumber, kind, change (+ or -), balance (of the lot after it), changeDate, note, orderId, orderNumber, userId, userName, at }`. Creating a material with lots writes one `Add` entry (note `Initial stock`) per lot.

## Data needed

```text
Customer(id, name, address, email, telephone)
Product(id, code UNIQUE, name, price)         ProductBom(product_id, material_id, quantity)
Material(id, code UNIQUE, name)               MaterialLot(material_id, lot_number, quantity)   UNIQUE(material_id, lot_number)
StockChange(id, material_id, lot_number, kind, change, balance, change_date, note, order_id NULL, user_id, at)
```
