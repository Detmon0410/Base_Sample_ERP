# Site Map

Every page of the frontend, with the role that can open it. Source: [frontend/src/config/navigation.js](../frontend/src/config/navigation.js) and [frontend/src/routes/index.jsx](../frontend/src/routes/index.jsx). The menu is in the header.

```mermaid
flowchart TD
    Root[App] --> Login["/login<br/>Sign in"]
    Root --> Main[Main layout, signed in]

    Main --> Dash["/<br/>Dashboard<br/>Admin, Worker"]

    Main --> Orders[Menu: Orders]
    Orders --> QT["/sale/quotations<br/>QT references<br/>Admin"]
    QT --> QT1["/new, /:id<br/>QT form"]
    Orders --> PO["/sale/orders<br/>Production orders<br/>Admin, Worker"]
    PO --> PO1["/new<br/>New order, Admin"]
    PO --> PO2["/:id<br/>Order, progress"]

    Main --> Acc[Menu: Accounting]
    Acc --> INV["/accounting/invoices<br/>Invoices<br/>Admin"]
    INV --> INV1["/new, /:id<br/>Invoice, payment"]
    Acc --> REC["/accounting/receipts<br/>Receipts<br/>Admin"]
    REC --> REC1["/:id<br/>Receipt"]

    Main --> Stk[Menu: Stock]
    Stk --> MAT["/stock/materials<br/>Materials and lots<br/>Admin, Worker"]
    MAT --> MAT1["/new, /:id<br/>Material, stock changes"]
    Stk --> MOV["/stock/movements<br/>Movements<br/>Admin, Worker"]

    Main --> Mst[Menu: Master data]
    Mst --> CUS["/master/customers<br/>Customers<br/>Admin"]
    CUS --> CUS1["/new, /:id"]
    Mst --> PRD["/master/products<br/>Products + BOM<br/>Admin, Worker"]
    PRD --> PRD1["/new, /:id"]
    Mst --> USR["/master/users<br/>Users<br/>Admin"]
    USR --> USR1["/new, /:id"]

    Root --> Sys[System pages]
    Sys --> F403["/403<br/>Forbidden"]
    Sys --> F404["*<br/>Not found"]
```

## Page table

| Menu | Page | Path | Admin | Worker |
|---|---|---|---|---|
| Dashboard | Dashboard | `/` | yes | yes (order tiles only) |
| Orders | QT references | `/sale/quotations` | yes | no |
| Orders | Production orders | `/sale/orders` | yes | yes (view, progress) |
| Accounting | Invoices | `/accounting/invoices` | yes | no |
| Accounting | Receipts | `/accounting/receipts` | yes | no |
| Stock | Materials | `/stock/materials` | yes | read only |
| Stock | Movements | `/stock/movements` | yes | read only |
| Master data | Customers | `/master/customers` | yes | no |
| Master data | Products | `/master/products` | yes | read only |
| Master data | Users | `/master/users` | yes | no |
| – | Sign in | `/login` | guests | guests |
| – | Forbidden / Not found | `/403`, `*` | any | any |

## Redirects

- `/stock` opens `/stock/materials`; `/stock/:id` is redirected to the material page.
- Old addresses of moved pages are redirected to their new place (`MovedRedirect`).
- A menu with one visible entry is shown as that entry alone (for example a Worker sees "Production orders" without the Orders menu).
