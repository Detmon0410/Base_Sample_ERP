# Flow Chart

The system as built on branch `mini-erp` (Version 2.0): the three changes ([Purchase Logic Draft2](../docs/Purchase%20Logic%20Draft2.md), [QT Upgrade 2.0](../docs/QT%20Upgrade%202.0.md), [User Version 2.0](../docs/User%20Version%202.0.md)) are in. This replaces the older single-version description.

## Main flow

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

## Purchase flow

```mermaid
flowchart TD
    S1[Check the low stock<br/>on Today or the Purchase page] --> S2{Item low?}
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

## PO status

```mermaid
stateDiagram-v2
    [*] --> Draft: saved
    Draft --> Sent: user
    Sent --> Received: user, stock added once
    Received --> [*]: payment recorded
```

Lines can be edited only in `Draft`. A `Draft` PO can be deleted.

## QT status

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Confirmed: Confirm QT, Factory Order created once
    Confirmed --> [*]: locked, cannot be deleted
```

## Order status

```mermaid
stateDiagram-v2
    [*] --> Draft: made by Confirm QT
    Draft --> InProgress: first process started
    InProgress --> Completed: every process Completed
    Completed --> InProgress: a process reopened (Admin, note required)
    Completed --> [*]: invoiced
```

The status of an order is computed from its processes, not set by hand. `Draft` also covers an order that was started but has no progress yet (the page says "Production started").

## Process status

```mermaid
stateDiagram-v2
    [*] --> NotStarted
    NotStarted --> InProgress
    InProgress --> Completed
    Completed --> InProgress: Admin only, note required
```

## Invoice status

```mermaid
stateDiagram-v2
    [*] --> Unpaid: issued
    Unpaid --> Paid: full payment, receipt issued
```

## Stock changes

```mermaid
flowchart LR
    S1[Admin or Factory Worker: Add / Deduct / Adjust a lot] --> S3[(MaterialLot)]
    S2[Start production: BOM deducted, oldest lot first] --> S3
    S6[PO received: Add to the lot typed for each line, once] --> S3
    S3 --> S4[(StockChange history)]
    S3 --> S5{Total vs min level}
    S5 --> Normal
    S5 --> Low
    S5 --> Out
```

## Confirm QT: checks

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
