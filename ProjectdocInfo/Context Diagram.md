# Context Diagram

One file with both versions: **Part 1** is the system as built on branch `mini-erp`; **Part 2** is Version 2.0 (planned): Purchase ([Purchase Logic Draft2](../docs/Purchase%20Logic%20Draft2.md)), QT Upgrade 2.0 ([doc](../docs/QT%20Upgrade%202.0.md)) and User Version 2.0 ([doc](../docs/User%20Version%202.0.md)).

## Part 1: Current version (as built)

The Mini ERP as one system, with the people and the outside things it deals with. (Asked as "Contact Diagram"; read as the context diagram.)

### Level 0: system context

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

### Level 1: inside the system

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

### External entities

| Entity | Gives the system | Gets from the system |
|---|---|---|
| Admin | master data, QT references, orders, stock changes, invoices, payments | dashboard, all lists, invoice and receipt documents |
| Worker | progress entries | orders, stock, products (read only) |
| Sales (outside) | the quotation, made outside the system | nothing directly |
| Customer (outside) | payment (to the Admin) | invoice and receipt, handed over by the Admin |

### Not in this system

Sales orders, delivery, purchase orders, serial numbers and tax. They are in the big system on branch `jay`.

---

## Part 2: Version 2.0 (planned)

The Mini ERP with Purchase added, the two Worker departments, and printed documents. The current version is in [Part 1](#part-1-current-version-as-built).

### Level 0: system context

```mermaid
flowchart LR
    Admin([Admin])
    Sale([Sale Worker])
    Fac([Factory Worker])
    Cust([Customer])
    Sup([Supplier])

    ERP[["Mini ERP 2.0"]]

    Admin -- "master data, invoices,<br/>payments, all actions" --> ERP
    ERP -- "dashboard, all lists,<br/>invoice, receipt" --> Admin

    Sale -- "QT, customer PO,<br/>orders before start" --> ERP
    ERP -- "QT form PDF" --> Sale

    Fac -- "progress, evidence, stock changes,<br/>PO, PO status, PO payment" --> ERP
    ERP -- "orders, stock, PO PDF" --> Fac

    Sale -. "sends QT form, receives customer PO" .- Cust
    Fac -. "sends PO PDF, receives goods" .- Sup
    Admin -. "invoice and receipt, payment" .- Cust
    Fac -. "pays the supplier" .-> Sup
```

### Level 1: inside the system

```mermaid
flowchart LR
    subgraph Client["Frontend"]
        UI[Pages: Dashboard, QT, Orders, Purchase,<br/>Stock, Invoices, Receipts, Master]
        PDF[PDF print: QT form, PO]
        Mock[(Mock API)]
    end
    subgraph Server["Backend"]
        API[REST API /api<br/>auth, master, suppliers, stock, qt,<br/>orders, purchase, files, invoices,<br/>receipts, dashboard]
        FS[(File storage<br/>attachments)]
        DB[(MySQL)]
    end

    UI --> PDF
    UI -- "mock mode" --> Mock
    UI -- "JSON + Bearer token" --> API
    API --> DB
    API --> FS
```

### External entities

| Entity | Gives the system | Gets from the system |
|---|---|---|
| Admin | master data, invoices, payments, any action | all pages, invoice and receipt |
| Sale Worker | QT, customer PO file, order edits | QT form PDF, order and stock views |
| Factory Worker | progress, evidence files, stock changes, PO and its status and payment | orders, stock, PO PDF |
| Customer (outside) | customer PO, payment | QT form, invoice, receipt (handed over by users) |
| Supplier (outside) | goods, quotation | PO PDF (handed over by the user) |

### Data stores that are new

| Store | Content |
|---|---|
| Purchase data | suppliers, supplier items and prices, POs, PO lines, PO payments |
| Attachments | PO files, quotations, production evidence, other documents |

### Not in this system

Sales orders, delivery, supplier invoices in Accounting, serial numbers and tax.
