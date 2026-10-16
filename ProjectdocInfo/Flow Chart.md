# Flow Chart

One file with both versions: **Part 1** is the system as built on branch `mini-erp`; **Part 2** is Version 2.0 (planned): Purchase ([Purchase Logic Draft2](../docs/Purchase%20Logic%20Draft2.md)), QT Upgrade 2.0 ([doc](../docs/QT%20Upgrade%202.0.md)) and User Version 2.0 ([doc](../docs/User%20Version%202.0.md)).

## Part 1: Current version (as built)

The business flow of the Mini ERP, from master data to the receipt. Source: [README.md](../README.md) (Workflow) and [docs/api](../docs/api/README.md).

### Main flow

```mermaid
flowchart TD
    A([Start]) --> B[Admin sets up master data:<br/>customers, products + BOM, materials + lots, users]
    B --> C[Admin saves a QT reference:<br/>number, date, customer, optional file]
    C --> D[Admin creates a production order from the QT:<br/>lines with quantity and price,<br/>ordered processes per line]
    D --> E{Enough stock<br/>for the BOM?}
    E -- No --> F[409 STOCK_SHORT<br/>Admin adds stock by hand] --> E
    E -- Yes --> G[Admin starts production:<br/>BOM deducted, oldest lot first,<br/>products and processes locked]
    G --> H[Worker or Admin records progress<br/>of each process]
    H --> I{All processes<br/>Completed?}
    I -- No --> H
    I -- Yes --> J[Order status = Completed]
    J --> K[Admin issues the invoice<br/>one per order, a snapshot,<br/>progress locked]
    K --> L[Admin records one full payment]
    L --> M{Date and amount<br/>equal the total?}
    M -- No --> N[400 MUST_EQUAL_TOTAL] --> L
    M -- Yes --> O[Invoice = Paid<br/>one receipt issued]
    O --> P([End])
```

### Order status

```mermaid
stateDiagram-v2
    [*] --> New
    New --> InProgress: first process started
    InProgress --> Completed: every process Completed
    Completed --> InProgress: a process reopened (Admin, note required)
    Completed --> [*]: invoiced
```

The status of an order is computed from its processes, not set by hand.

### Process status

```mermaid
stateDiagram-v2
    [*] --> NotStarted
    NotStarted --> InProgress
    InProgress --> Completed
    Completed --> InProgress: Admin only, note required
```

### Invoice status

```mermaid
stateDiagram-v2
    [*] --> Unpaid: issued
    Unpaid --> Paid: full payment, receipt issued
```

### Stock change

```mermaid
flowchart LR
    S1[Admin: Add / Deduct / Adjust a lot] --> S3[(MaterialLot)]
    S2[Start production] --> S3
    S3 --> S4[(StockChange history)]
    S3 --> S5{Total vs min level}
    S5 --> Normal
    S5 --> Low
    S5 --> Out
```

---

## Part 2: Version 2.0 (planned)

Business flow after the three changes. The current flow is in [Part 1](#part-1-current-version-as-built).

### Main flow

```mermaid
flowchart TD
    A([Start]) --> B[Admin: master data<br/>customers, products + BOM,<br/>materials, suppliers + their items, users]
    B --> C[Sale: create QT with lines<br/>status Draft]
    C --> D[Print QT form as PDF<br/>send to customer]
    D --> E[Upload the customer PO<br/>PO No., date, file]
    E --> F[Confirm QT]
    F --> G[System creates a Draft Factory Order<br/>from the QT lines]
    G --> H{Enough stock<br/>for the BOM?}
    H -- No --> P1[Purchase flow below] --> H
    H -- Yes --> I[Factory: start production<br/>BOM deducted, oldest lot first]
    I --> J[Factory: record progress,<br/>upload evidence images / documents]
    J --> K{All processes<br/>Completed?}
    K -- No --> J
    K -- Yes --> L[Admin: issue invoice]
    L --> M[Admin: full payment -> Paid + receipt]
    M --> N([End])
```

### Purchase flow

```mermaid
flowchart TD
    S1[Check stock on the Purchase page] --> S2{Item low?}
    S2 -- No --> S1
    S2 -- Yes --> S3[Create PO:<br/>supplier, required date, department,<br/>items of that supplier, quantity,<br/>initial price from the system]
    S3 --> S4[Save: status Draft]
    S4 --> S5[Print PO as PDF<br/>name and signature spaces]
    S5 --> S6[User sets status Sent]
    S6 --> S7[User sets status Received]
    S7 --> S8[Stock + quantities, once only]
    S7 --> S9[Record payment<br/>date, amount, method, reference]
    S4 -.-> S10[(Upload PO file / quotation / other files)]
    S6 -.-> S10
    S7 -.-> S10
```

### PO status

```mermaid
stateDiagram-v2
    [*] --> Draft: saved
    Draft --> Sent: user
    Sent --> Received: user, stock added once
    Received --> [*]: payment recorded
```

Lines can be edited only in `Draft`. A `Draft` PO can be deleted.

### QT status

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Confirmed: Confirm QT, Factory Order created once
    Confirmed --> [*]: locked, cannot be deleted
```

### Order, process and invoice status

Unchanged: see [Part 1](#part-1-current-version-as-built).

### Confirm QT: checks

```mermaid
flowchart LR
    C1[Press Confirm] --> C2{Customer and<br/>at least one line?}
    C2 -- No --> C3[Validation error]
    C2 -- Yes --> C4{Already confirmed?}
    C4 -- Yes --> C5[Show the existing order]
    C4 -- No --> C6{Customer PO file?}
    C6 -- No --> C7[Warning, user may continue]
    C6 -- Yes --> C8
    C7 --> C8[Create Draft Factory Order,<br/>attach PO file, lock QT]
```
