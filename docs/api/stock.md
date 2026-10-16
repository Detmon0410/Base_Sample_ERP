# API - Stock: materials, movements

Pages (the Stock group of the menu): `/stock/materials` (the materials, their lots and the stock changes), `/stock/movements` (every movement) · Frontend: `frontend/src/pages/stock`, `services/master.service.js` (`stockApi`) · Mock: `services/mock/stock.js`, `services/mock/stockStatus.js`
Conventions: [README.md](README.md) · The five calls of a material (`GET`, `POST`, `PUT`, `DELETE`), its fields and the delete rules: [master-data.md](master-data.md)

Who may call: everybody who is signed in reads everything on this page; a stock change by hand (and the start of a production order, which deducts stock) is for the Admin and the Factory Worker (`403 FORBIDDEN` for a Sale Worker).

## Stock changes of a material

The only automatic change is the **start of a production order**, which deducts the BOM of its lines, the oldest lot first, and is refused with `409 STOCK_SHORT` when a material is short ([orders.md](orders.md)). Otherwise an Admin changes it by hand, at any time; a Worker may read the history.

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

## The list of the materials: `GET /materials`

There is **no overview page and no `GET /stock/overview`** (removed 2026-10-12, at the request of the user); the address `/stock` opens `/stock/materials`. The list of the materials is `GET /materials` (query `q` for the code or the name, `status` = `Normal`, `Low` or `Out`, `page`, `pageSize` 20): every material comes with its `lots`, its `total` and its `stockStatus`.

## The minimum level and the stock status of a material

The requirements have no minimum level; it is an **optional addition**. Every view of a material (`GET /materials`, `GET /materials/:id`, the answer of a stock change, `leastStock` of the [Dashboard](dashboard.md)) carries `total` and `stockStatus`, computed by **one rule** on the server:

| `stockStatus` | When |
|---|---|
| `null` | the material has no `minLevel` (the system does not guess a status) |
| `Out` | it has a `minLevel` and the total of its lots is 0 |
| `Low` | the total is at or below the `minLevel` |
| `Normal` | the total is above the `minLevel` |

`400 VALIDATION_ERROR` with `INVALID` on `minLevel` when it is negative or not a number.

## The movements of every material: `GET /stock-changes`

The ledger of every stock change of every material together (the page `/stock/movements`); read only, for every signed-in user.

| Query | Meaning |
|---|---|
| `q` | contains, case-insensitive, in the material code or name, the lot number, the production order number or the note |
| `type` | `Add`, `Deduct` or `Adjust` |
| `from`, `to` | the **date of the change** (`changeDate`), `YYYY-MM-DD`, both ends included |
| `page`, `pageSize` | the frontend uses 20 |

`data` is a list of the entries below with `materialCode` and `materialName` added, **newest `changeDate` first** (then the last made first); `meta` is `{ page, pageSize, total }`. `400 VALIDATION_ERROR` with `INVALID` (a type that does not exist) or `INVALID_DATE` (a `from` or `to` that is not a real day). The changes of a deleted material are gone with it.

A history entry (never changed or deleted): `{ id, materialId, lotNumber, kind, change (+ or -), balance (of the lot after it), changeDate, note, initial (true for the first stock of a new material), orderId, orderNumber, userId, userName, at }`; both `GET /stock-changes` and `GET /materials/:id/stock-changes` also carry `materialCode` and `materialName`. Creating a material with lots writes one `Add` entry (note `Initial stock`) per lot.

## Data needed

```text
Material(id, code UNIQUE, name, min_level NULL)       MaterialLot(material_id, lot_number, quantity)   UNIQUE(material_id, lot_number)
StockChange(id, material_id, lot_number, kind, change, balance, change_date, note, initial, order_id NULL, user_id, at)
```

`initial` marks the first stock of a new material ("Initial stock"); a material with a stock change that is not initial cannot be deleted.
