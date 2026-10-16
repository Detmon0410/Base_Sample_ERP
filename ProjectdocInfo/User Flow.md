# User Flow

One file with both versions: **Part 1** is the system as built on branch `mini-erp`; **Part 2** is Version 2.0 (planned): Purchase ([Purchase Logic Draft2](../docs/Purchase%20Logic%20Draft2.md)), QT Upgrade 2.0 ([doc](../docs/QT%20Upgrade%202.0.md)) and User Version 2.0 ([doc](../docs/User%20Version%202.0.md)).

## Part 1: Current version (as built)

What each role does on screen. Roles: **Admin** and **Worker** (the only thing that decides access). Source: [frontend/src/config/navigation.js](../frontend/src/config/navigation.js) and [docs/api](../docs/api/README.md).

### Sign in (both roles)

```mermaid
flowchart TD
    A[Open the app] --> B{Token stored?}
    B -- No --> C[/login/]
    C --> D[Enter email and password]
    D --> E{Correct?}
    E -- No --> F[Error shown] --> D
    E -- Yes --> G[Dashboard]
    B -- Yes --> G
    G --> H[Any request answers 401] --> C
```

### Admin

```mermaid
flowchart TD
    D[Dashboard] --> M[Master data]
    M --> M1[Customers] & M2[Products + BOM] & M3[Users]
    D --> S[Stock]
    S --> S1[Materials + lots] --> S2[Add / Deduct / Adjust]
    S --> S3[Movements]
    D --> Q[QT references]
    Q --> Q1[Create QT, attach file]
    Q1 --> O[Production orders]
    O --> O1[New order from a QT:<br/>lines + processes]
    O1 --> O2[Start production]
    O2 --> O3[Record progress]
    O3 --> I[Invoices]
    I --> I1[Issue invoice for a Completed order]
    I1 --> I2[Record payment]
    I2 --> R[Receipts]
    R --> R1[View / print receipt]
```

### Worker

```mermaid
flowchart TD
    D[Dashboard: 3 order tiles] --> O[Production orders: view]
    O --> O1[Open an order]
    O1 --> O2[Record progress on a process<br/>not on a Completed one]
    D --> S[Stock: Materials and Movements<br/>read only]
    D --> P[Products: view only]
```

### Who can do what

| Area | Admin | Worker |
|---|---|---|
| Dashboard | orders tiles, invoice tiles, chart | order tiles only |
| QT references | full | no access (`403`) |
| Production orders | create, edit before start, start, progress | view, progress (not on a Completed process) |
| Completed process | change or reopen | locked |
| Stock | read and change | read only |
| Invoices, receipts | full | no access |
| Customers, users | full | no access |
| Products | full | read only |

---

## Part 2: Version 2.0 (planned)

What each role does on screen after the three changes. The current version is in [Part 1](#part-1-current-version-as-built). Roles: **Admin**, **Sale Worker** (`Worker` + `Sales`), **Factory Worker** (`Worker` + `Factory`). See [User Version 2.0](../docs/User%20Version%202.0.md).

### Sale Worker

```mermaid
flowchart TD
    D[Dashboard: order tiles] --> Q[QT references]
    Q --> Q1[New QT: customer + lines]
    Q1 --> Q2[Print QT form PDF]
    Q2 --> Q3[Upload customer PO]
    Q3 --> Q4[Confirm QT]
    Q4 --> O[Factory Order created]
    O --> O1[Edit the order before start:<br/>lines and processes]
    D --> V[View: orders, stock, products, customers]
```

### Factory Worker

```mermaid
flowchart TD
    D[Dashboard: order tiles] --> O[Production orders]
    O --> O1[Open an order]
    O1 --> O2[Start production<br/>409 STOCK_SHORT if material short]
    O2 --> O3[Record progress]
    O3 --> O4[Upload evidence: images, documents]
    D --> S[Stock]
    S --> S1[Add / Deduct / Adjust a lot]
    D --> P[Purchase]
    P --> P1[See low stock]
    P1 --> P2[Create PO]
    P2 --> P3[Print PDF]
    P3 --> P4[Sent -> Received]
    P4 --> P5[Record payment]
```

### Admin

```mermaid
flowchart TD
    D[Dashboard: all tiles + chart] --> M[Master data:<br/>customers, products, suppliers, users]
    D --> Sale[QT -> Confirm -> Factory Order]
    D --> Fac[Start production, progress, reopen]
    D --> Stk[Stock changes]
    D --> Pur[Purchase: PO, status, payment]
    D --> Acc[Invoice -> payment -> receipt]
```

The Admin can do everything the two Workers can.

### Who can do what

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

> The Purchase rights are not decided in the notes. This table gives them to the Factory Worker because that department handles materials. Confirm with the user.

### Print and upload (any page with files)

```mermaid
flowchart LR
    A[Open QT / PO / order] --> B{Action}
    B -- Print --> C[PDF with name and signature spaces]
    B -- Upload --> D[Choose file: PDF, PNG or JPG, up to 10 MB]
    D --> E[Stored with kind, name, who, when]
```
