# Context Diagram



## Level 0: system context

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

## Level 1: inside the system

```mermaid
flowchart LR
    subgraph Client["Frontend"]
        UI["Pages: Dashboard, Today, Sales (QT),<br/>Orders, Purchase, Accounting,<br/>Stock, Master"]
        PDF[PDF print: QT form, PO,<br/>invoice, receipt]
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

## External entities

| Entity | Gives the system | Gets from the system |
|---|---|---|
| Admin | master data, invoices, payments, any action | all pages, invoice and receipt |
| Sale Worker | QT, customer PO file, order edits | QT form PDF, order and stock views |
| Factory Worker | progress, evidence files, stock changes, PO and its status and payment | orders, stock, PO PDF |
| Customer (outside) | customer PO, payment | QT form, invoice, receipt (handed over by users) |
| Supplier (outside) | goods, quotation | PO PDF (handed over by the user) |

## Data stores added in Version 2.0

| Store | Content |
|---|---|
| Purchase data | suppliers, supplier items and prices, POs, PO lines, PO payments |
| Attachments | PO files, quotations, production evidence, other documents |

## Not in this system

Sales orders, delivery, supplier invoices in Accounting, serial numbers and tax.
