# Flow Chart

The business flow of the Mini ERP, from master data to the receipt. Source: [README.md](../README.md) (Workflow) and [docs/api](../docs/api/README.md).

## Main flow

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

## Order status

```mermaid
stateDiagram-v2
    [*] --> New
    New --> InProgress: first process started
    InProgress --> Completed: every process Completed
    Completed --> InProgress: a process reopened (Admin, note required)
    Completed --> [*]: invoiced
```

The status of an order is computed from its processes, not set by hand.

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

## Stock change

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
