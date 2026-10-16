# User Flow

What each role does on screen. Roles: **Admin** and **Worker** (the only thing that decides access). Source: [frontend/src/config/navigation.js](../frontend/src/config/navigation.js) and [docs/api](../docs/api/README.md).

## Sign in (both roles)

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

## Admin

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

## Worker

```mermaid
flowchart TD
    D[Dashboard: 3 order tiles] --> O[Production orders: view]
    O --> O1[Open an order]
    O1 --> O2[Record progress on a process<br/>not on a Completed one]
    D --> S[Stock: Materials and Movements<br/>read only]
    D --> P[Products: view only]
```

## Who can do what

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
