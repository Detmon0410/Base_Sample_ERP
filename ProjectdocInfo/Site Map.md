# Site Map

The system as built on branch `mini-erp` (Version 2.0): the three changes ([Purchase Logic Draft2](../docs/Purchase%20Logic%20Draft2.md), [QT Upgrade 2.0](../docs/QT%20Upgrade%202.0.md), [User Version 2.0](../docs/User%20Version%202.0.md)) are in. This replaces the older single-version description.

```mermaid
flowchart TD
    Root[App] --> Login["/login"]
    Root --> Main[Main layout]

    Main --> Dash["/ First page<br/>Dashboard (Admin, Sale)<br/>Today (Factory)"]

    Main --> Orders[Menu: Sales]
    Orders --> QT["/sale/quotations<br/>Sales work list: one row per job<br/>with its step<br/>Admin, Sale"]
    QT --> QT1["/new, /:id<br/>One page for a job: steps, QT lines,<br/>PO, Confirm, then the production order<br/>(processes, progress)"]
    Orders --> PO["/sale/orders<br/>Production orders<br/>all"]
    PO --> PO1["/:id<br/>Order: processes, start, progress,<br/>evidence upload"]

    Main --> Pur["Menu: Purchase"]
    Pur --> PUR["/purchase/orders<br/>One page: stock, PO form, PO list<br/>Admin, Factory"]
    PUR --> PUR1["/new, /:id<br/>PO: lines, status, Print PDF,<br/>payment, files"]

    Main --> Acc["/accounting<br/>One page: to invoice, waiting for payment, paid<br/>Admin"]
    Acc --> INV["/accounting/invoices/:id<br/>Invoice as a document"]
    Acc --> REC["/accounting/receipts/:id<br/>Receipt as a document"]

    Main --> Stk[Menu: Stock]
    Stk --> MAT["/stock/materials"]
    Stk --> MOV["/stock/movements"]

    Main --> Mst[Menu: Master data]
    Mst --> CUS["/master/customers"]
    Mst --> PRD["/master/products"]
    Mst --> SUP["/master/suppliers<br/>suppliers + their items and prices<br/>Admin"]
    Mst --> USR["/master/users<br/>(changed: Worker department rule)"]

    Root --> Sys["/403, * not found"]
```

## Page table

| Menu | Page | Path | Admin | Sale Worker | Factory Worker |
|---|---|---|---|---|---|
| Dashboard / Today | Dashboard (Admin, Sale), Today (Factory) | `/` | all | orders | work of today |
| Sales | Sales work list and one page for a job | `/sale/quotations` | yes | yes | no |
| Sales | Production orders | `/sale/orders` | yes | view + edit before start | view + start + progress |
| Purchase | Purchase orders | `/purchase/orders` | yes | no | yes |
| Accounting | Work list | `/accounting` | yes | no | no |
| Accounting | Invoice and receipt documents | `/accounting/invoices/:id`, `/accounting/receipts/:id` | yes | no | no |
| Stock | Materials | `/stock/materials` | yes | view | change |
| Stock | Movements | `/stock/movements` | yes | view | view |
| Master data | Customers | `/master/customers` | yes | view | no |
| Master data | Products | `/master/products` | yes | view | view |
| Master data | Suppliers | `/master/suppliers` | yes | no | view |
| Master data | Users | `/master/users` | yes | no | no |
| – | Sign in, Forbidden, Not found | `/login`, `/403`, `*` | any | any | any |

## What is on the pages that QT 2.0 and the roles changed

| Page | Change |
|---|---|
| QT page | the steps of the job (Draft, Confirmed, In production, Done), lines and total, Print button, customer PO upload (number, date, file), Confirm button; after Confirm the production order of the job on the same page: processes before the start, progress after it |
| Production order | shows the customer PO file, QT link, and an evidence upload area |
| Today (Factory) | orders to start, orders in production with a big "Record progress" button, purchase orders to receive, a strip for low stock |
| Accounting | tabs To invoice / Waiting for payment / Paid; Issue invoice and Record payment in small dialogs; Open receipt |
| Users | a Worker must choose `Sales` or `Factory` |
| Menus | each entry has `roles` and `departments`; a menu with one visible entry shows as that entry |

## The Purchase page (one page)

| Area | Content |
|---|---|
| Stock | material, remaining, low flag, "Create PO" |
| PO form | supplier, required date, department, item lines, quantity, price, total |
| PO list | PO No., supplier, required date, status buttons |
| PO detail | lines, Print PDF, payment, attachments |

## Redirects

- `/stock` opens `/stock/materials`; `/stock/:id` is redirected to the material page.
- `/sale/orders/new` opens `/sale/quotations`: an order is made by Confirm QT, never by hand.
- `/accounting/invoices`, `/accounting/invoices/new` and `/accounting/receipts` open `/accounting`; the invoice and the receipt keep `/:id` as documents.
- Old addresses of pages that moved (`/qt`, `/orders`, `/invoices`, ...) are redirected to their new place.
- A menu with one visible entry is shown as that entry alone.
