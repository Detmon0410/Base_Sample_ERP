# User Flow

The system as built on branch `mini-erp` (Version 2.0): the three changes ([Purchase Logic Draft2](../docs/Purchase%20Logic%20Draft2.md), [QT Upgrade 2.0](../docs/QT%20Upgrade%202.0.md), [User Version 2.0](../docs/User%20Version%202.0.md)) are in. This replaces the older single-version description.

## Sale Worker

```mermaid
flowchart TD
    D[Dashboard: order tiles] --> Q[Sales work list]
    Q --> Q1[One page for the job:<br/>customer + lines]
    Q1 --> Q2[Print QT form PDF]
    Q2 --> Q3[Upload customer PO]
    Q3 --> Q4[Confirm QT]
    Q4 --> O[Same page: the production order]
    O --> O1[Add the processes<br/>before the start,<br/>see the progress after it]
    D --> V[View: orders, stock, products, customers]
```

## Factory Worker

```mermaid
flowchart TD
    D[Today: the work of the day] --> L[Production orders]
    L --> O2[Open the order: start production<br/>409 STOCK_SHORT if material short]
    D --> O3[Record progress on the card]
    O3 --> O4[Open the order: upload evidence,<br/>images and documents]
    D --> R[Purchase orders to receive]
    D --> S[Stock]
    S --> S1[Add / Deduct / Adjust a lot]
    D --> P[Purchase]
    P --> P1[See low stock]
    P1 --> P2[Create PO]
    P2 --> P3[Print PDF]
    P3 --> P4[Sent -> Received]
    P4 --> P5[Record payment]
```

## Admin

```mermaid
flowchart TD
    D[Dashboard: all tiles + chart] --> M[Master data:<br/>customers, products, suppliers, users]
    D --> Sale[QT -> Confirm -> Factory Order]
    D --> Fac[Start production, progress, reopen]
    D --> Stk[Stock changes]
    D --> Pur[Purchase: PO, status, payment]
    D --> Acc[Accounting page:<br/>invoice -> payment -> receipt]
```

The Admin can do everything the two Workers can.

## Who can do what

| Area | Admin | Sale Worker | Factory Worker |
|---|---|---|---|
| QT: create, print, upload PO, confirm | yes | yes | no access |
| Production orders: create / edit before start | yes | yes | no |
| Start production, record progress | yes | no | yes |
| Evidence upload (production order) | yes | no | yes |
| Stock: view | yes | yes | yes |
| Stock changes by hand | yes | no | yes |
| Purchase: PO, status, print, payment | yes | no | yes |
| Suppliers | yes | no | view only |
| Customers | yes | view only | no |
| Products | yes | view only | view only |
| Invoices, receipts, users | yes | no | no |


## Print and upload (any page with files)

```mermaid
flowchart LR
    A[Open QT / PO / order] --> B{Action}
    B -- Print --> C[PDF with name and signature spaces]
    B -- Upload --> D[Choose file: PDF, PNG or JPG, up to 10 MB]
    D --> E[Stored with kind, name, who, when]
```
