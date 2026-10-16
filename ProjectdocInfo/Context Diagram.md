# Context Diagram

The Mini ERP as one system, with the people and the outside things it deals with. (Asked as "Contact Diagram"; read as the context diagram.)

## Level 0: system context

```mermaid
flowchart LR
    Admin([Admin])
    Worker([Worker])
    Sales([Sales<br/>outside the system])
    Customer([Customer])

    ERP[["Mini ERP<br/>Refrigerator Factory"]]

    Admin -- "master data, QT references,<br/>production orders, stock changes,<br/>invoices, payments" --> ERP
    ERP -- "dashboard, orders, stock,<br/>invoices, receipts" --> Admin

    Worker -- "progress of processes" --> ERP
    ERP -- "orders, stock, products (read)" --> Worker

    Sales -. "quotation (made outside,<br/>number + file given to Admin)" .-> Admin
    ERP -. "invoice and receipt<br/>(printed / handed over)" .-> Customer
    Customer -. "payment" .-> Admin
```

## Level 1: inside the system

```mermaid
flowchart LR
    subgraph Client["Frontend (React, Vite)"]
        UI[Pages: Dashboard, QT, Orders,<br/>Stock, Invoices, Receipts, Master]
        Mock[(Mock API<br/>browser storage)]
    end
    subgraph Server["Backend (Express + Prisma)"]
        API[REST API /api<br/>auth, master, stock, qt, orders,<br/>invoices, receipts, dashboard]
        DB[(MySQL)]
    end

    UI -- "VITE_USE_MOCK=true" --> Mock
    UI -- "JSON + Bearer token" --> API
    API --> DB
```

## External entities

| Entity | Gives the system | Gets from the system |
|---|---|---|
| Admin | master data, QT references, orders, stock changes, invoices, payments | dashboard, all lists, invoice and receipt documents |
| Worker | progress entries | orders, stock, products (read only) |
| Sales (outside) | the quotation, made outside the system | nothing directly |
| Customer (outside) | payment (to the Admin) | invoice and receipt, handed over by the Admin |

## Not in this system

Sales orders, delivery, purchase orders, serial numbers and tax. They are in the big system on branch `jay`.
