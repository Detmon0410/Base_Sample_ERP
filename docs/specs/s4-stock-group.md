# S4 - The Stock group: overview, materials, movements

Status: **ACCEPTED by the user** (the proposals Q1-Q3 too). S4-A (the menu and the routes) is done; S4-B to S4-E are next.
Base: S1, S3 and the requirements ([simplified_factory_system_requirements.md](../../BaseRequirement_md/simplified_factory_system_requirements.md), 4.3 and 5.4).
The old system's Stock (branch `jay`, [f8-stock.md](https://github.com/Detmon0410/Kanou_Sample_ERP/blob/jay/docs/specs/f8-stock.md)) was the example: an overview of the balances, a ledger of the movements, the status of a balance.

## 1. What the user asked for

| # | Request |
|---|---|
| 1 | Follow the old system for Stock, **but** "Materials and stock" lives in **Stock**, not in Master data, because its data changes all the time |
| 2 | A page with the **history of all movements** together |
| 3 | A page with an **overview of the stock of the whole system** |

## 2. The menu

```text
Dashboard · Orders ▾ (Quotations, Production orders) · Invoices and receipts · Stock ▾ (Overview, Materials and stock, Movements) · Master data ▾ (Customers, Products and BOM, Users)
```

| | Admin | Worker |
|---|---|---|
| Stock ▾ | Overview, Materials and stock, Movements | the same three, read only |
| Master data ▾ | Customers, Products and BOM, Users | Products and BOM only (a menu with one entry is shown as that entry) |

Texts (EN / JA): Stock / 在庫, Overview / 在庫一覧, Materials and stock / 材料・在庫, Movements / 入出庫履歴. The materials leave Master data; the rest of Master data stays as it is.

## 3. The pages

| Page | Route | What it is |
|---|---|---|
| **Stock overview** (new) | `/stock` | the stock of every material and every lot on one page, read only |
| **Materials and stock** (moved from `/stock`) | `/stock/materials`, `/stock/materials/new`, `/stock/materials/:id` | what exists today: the list of materials, a material with its lots, the form of a stock change (Admin), the history of that material, Delete |
| **Stock movements** (new) | `/stock/movements` | the ledger of **every** stock change of every material, newest first |

### 3.1 Overview (`/stock`)

* Tiles: how many materials, how many lots, the total quantity is not shown (different things cannot be added), how many materials are low (section 5, only if the minimum level is accepted).
* A table with **one row per material** (code, name, number of lots, total quantity, status) and under each row its lots (lot number, quantity), so the whole system is read without opening each material. Search by material code or name; the filter is the status (if accepted). 20 rows a page.
* A click on a row opens the material (`/stock/materials/:id`), where an Admin changes the stock.
* Both roles see it. It changes nothing.

### 3.2 Movements (`/stock/movements`)

* One row per stock change: date, material, lot, type (Add / Deduct / Adjust), change (+ or -), balance of the lot after it, production order, note, who and when.
* Search by material code or name, by production order number and by note. Filters: type, a date range (typed `YYYY-MM-DD`, the date of the change). Newest first, 20 rows a page, Previous / Next.
* A click on a row opens the material; the production order is a link.
* Read only, for both roles. Nothing here is edited or deleted.
* New call `GET /stock-changes` (the same entries as `GET /materials/:id/stock-changes`, for all materials, with `q`, `type`, `from`, `to`, `page`, `pageSize`).

### 3.3 Materials and stock

Unchanged in what it does; only the address (`/stock/materials...`) and the place in the menu change. The links that point to `/stock/:id` (the Dashboard, the order page, the tests) are updated; the old `/stock/:id` address opens the material too, so a saved link still works.

## 4. What is not taken from the old system (and why)

| Old Stock | Mini ERP |
|---|---|
| Warehouses (raw materials, finished goods) and a balance per warehouse | no warehouses: the requirements keep stock by **material and lot** only |
| Finished goods stock, delivery taking products out | no: 5.4 and 9 say the production does not add finished goods to the stock |
| Stock adjustments as a document with approval by a Manager | no: an Admin books an adjustment directly (with a note), there is no approval and no Manager |
| Movements made by the Work Order, the receipt and the delivery | no: every change is made by hand (5.4), so the ledger has only Add / Deduct / Adjust |

## 5. To decide (a proposal for each)

| # | Question | Proposal |
|---|---|---|
| Q1 | The old overview shows a **status** (normal / near shortage / shortage) from a reorder point. The requirements have no minimum level. Add it? | **Yes, as an option**: a material gets an optional **Minimum level**; the overview and the Dashboard say Normal / Low (total at or below the minimum) / Out (total 0); a material without a minimum shows no status. It is an addition to the requirements and needs one new field on the material form |
| Q2 | Overview: one row per material with its lots under it, or one row per lot? | one row per material with the lots under it (as in 3.1) |
| Q3 | Who sees the Stock group? | Admin and Worker (a Worker needs the material information for production, 3 of the requirements) |
| Q4 | Does the Dashboard list "Materials with the least stock" stay? | it stays; it links to the material, and shows the status when Q1 is accepted |

## 6. Order of work (each step ends with unit tests, the browser test and the docs)

| Step | Work | Result |
|---|---|---|
| S4-A | The menu: a Stock group (Overview, Materials and stock, Movements), the materials leave Master data; the routes `/stock/materials...`; the old `/stock/:id` redirects; the links, the tests and the texts follow | the menu of section 2 |
| S4-B | `GET /stock-changes` in the mock and the page `/stock/movements` (filters, paging, links) | the ledger of all movements |
| S4-C | The page `/stock` (the overview of section 3.1) | the overview of the whole system |
| S4-D | The minimum level and the status (only if Q1 is accepted): the field, the status function in one place, the overview, the Dashboard | Normal / Low / Out |
| S4-E | The acceptance case and the docs (`docs/api/master-data.md`, a new `stock.md`, the READMEs, the tracker) | the plan is closed |

## 7. Tests that will be added

* Mock: `GET /stock-changes` (all materials together, newest first, each filter, paging, a Worker may read), the status function (if Q1 is accepted).
* Pages: the movements page (filters and the click on a row), the overview (the lots under the material, the search), the menu of an Admin and of a Worker.
* Playwright: in the acceptance case, after the stock change of step 7, the overview shows the new quantity of the lot and the movements page shows the deduction with the production order.
