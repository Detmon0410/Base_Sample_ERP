# API — Master data: customers, products, materials, users

Pages: `/master/customers`, `/master/products`, `/master/users`, and the materials (`/stock/materials`, in the Stock group of the menu, see [stock.md](stock.md)) · Frontend: `frontend/src/pages/master`, `pages/stock`, `pages/users`, `services/master.service.js` · Mock: `services/mock/master.js`, `services/mock/stock.js`
Conventions: [README.md](README.md)

## The five calls of every resource

`{resource}` is `customers`, `products`, `materials` or `users`. Master data has **no status** (no active / inactive): a record that is not used is deleted, and a record that is used is **kept** by refusing the delete.

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
| materials | `code` (required, unique), `name` (required), `minLevel` (optional, 0 or more, up to 3 decimals; `""` or `null` means none), `lots`: `[{ lotNumber, quantity }]` (up to 3 decimals) | code, name | a lot number is unique inside the material (case-insensitive). `lots` is read on **create** only; afterwards a lot changes only through stock changes (below), and `PUT` ignores `lots` |
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

## Stock changes, the movements and the stock status

They are in their own document: [stock.md](stock.md). A material has an optional `minLevel` here (a field), and its views carry `total` and `stockStatus` ([stock.md](stock.md#the-minimum-level-and-the-stock-status-of-a-material)).

## Data needed

```text
Customer(id, name, address, email, telephone)
Product(id, code UNIQUE, name, price)         ProductBom(product_id, material_id, quantity)
Material(id, code UNIQUE, name, min_level NULL)  MaterialLot(material_id, lot_number, quantity)   UNIQUE(material_id, lot_number)   (stock changes: stock.md)
```
