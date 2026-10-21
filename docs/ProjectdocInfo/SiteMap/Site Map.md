# Site Map

## Overview

```mermaid
flowchart TD
    %% layout: tree
    %% no-stack: Main
    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;
    classDef menu fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;
    classDef page fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;

    Root([App]):::startEnd

    Root --> Login["/login<br/>Sign in"]:::page
    Root --> Main[Main layout]:::menu
    Root --> Sys["/403, *<br/>Forbidden, Not found"]:::page

    Main --> Dash[Menu: Dashboard]:::menu
    Main --> Sales[Menu: Sales]:::menu
    Main --> Pur[Menu: Purchase]:::menu
    Main --> Acc[Menu: Accounting]:::menu
    Main --> Stk[Menu: Stock]:::menu
    Main --> Mst[Menu: Master data]:::menu
```

## Pages of each menu

```mermaid
flowchart TD
    %% layout: tree
    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;
    classDef menu fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;
    classDef page fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;

    Main([Main layout]):::startEnd

    Main --> Dash[Menu: Dashboard]:::menu
    Main --> Sales[Menu: Sales]:::menu
    Main --> Pur[Menu: Purchase]:::menu
    Main --> Acc[Menu: Accounting]:::menu
    Main --> Stk[Menu: Stock]:::menu
    Main --> Mst[Menu: Master data]:::menu

    Dash --> D1["/<br/>Dashboard"]:::page

    Sales --> QT["/sale/quotations<br/>Sales work list"]:::page
    QT --> QT1["/new, /:id<br/>One page for a job"]:::page
    Sales --> PO["/sale/orders<br/>Production orders"]:::page
    PO --> PO1["/:id<br/>Production order"]:::page

    Pur --> PUR["/purchase/orders<br/>Purchase orders"]:::page
    PUR --> PUR1["/new, /:id<br/>Purchase order"]:::page

    Acc --> ACC["/accounting<br/>Work list"]:::page
    ACC --> INV["/accounting/invoices/:id<br/>Invoice document"]:::page
    ACC --> REC["/accounting/receipts/:id<br/>Receipt document"]:::page

    Stk --> MAT["/stock/materials<br/>Materials"]:::page
    Stk --> MOV["/stock/movements<br/>Movements"]:::page

    Mst --> CUS["/master/customers<br/>Customers"]:::page
    Mst --> PRD["/master/products<br/>Products"]:::page
    Mst --> SUP["/master/suppliers<br/>Suppliers"]:::page
    Mst --> USR["/master/users<br/>Users"]:::page
```

## Page table

| Menu | Page | Path | Admin | Sale Worker | Factory Worker |
|---|---|---|---|---|---|
| Dashboard | Dashboard | `/` | all tiles + chart | orders | orders |
| Sales | Sales work list and one page for a job | `/sale/quotations` | yes | yes | no |
| Sales | Production orders | `/sale/orders` | yes | view only | view + processes + start + progress |
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

## What is on each page

| Page | Content |
|---|---|
| Sign in | email and password |
| Dashboard | order tiles (Draft, In progress, Completed); for the Admin also the invoice tiles and a chart of orders by status |
| Sales work list | one row per job with its step (Draft, Confirmed, In production, Done) |
| QT page (one page for a job) | the steps of the job, customer, lines and total, Print button, customer PO upload (number, date, file), Confirm button; after Confirm a link to the production order (the factory adds the processes there) |
| Production orders | list of orders with their status |
| Production order | processes (Factory, Admin: before the start; Sale: read only), start, progress, the customer PO file, QT link, evidence upload (images and documents) |
| Purchase orders | stock with low flags, the PO form, the PO list (see below) |
| Accounting | tabs To invoice / Waiting for payment / Paid; Issue invoice and Record payment in small dialogs; Open receipt |
| Invoice, receipt | the document, ready to print |
| Materials | materials with lots, total and stock status; Add / Deduct / Adjust a lot |
| Movements | the history of every stock change |
| Customers, Products | list, search, add / edit / delete (products with their BOM) |
| Suppliers | suppliers with their items and prices |
| Users | list, add / edit / delete; a Worker must choose the department `Sales` or `Factory` |
| Forbidden, Not found | message and a way back |

Menus: each entry shows only for the roles and departments that may use it; a menu with one visible entry is shown as that entry alone. The language (English / Japanese) can be switched on every page.

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
