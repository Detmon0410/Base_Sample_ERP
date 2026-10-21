# User Flow

How each user works through the system, by role. The order of the work is in [Flow Chart](../FlowChart/Flow%20Chart.md); the pages are in [Site Map](../SiteMap/Site%20Map.md).

## Roles

| Role | Department | Who | First page |
|---|---|---|---|
| Admin | any (only a label) | Owner / office: does everything | Dashboard: order tiles, invoice tiles, chart |
| Worker | Sales | Sale Worker: quotations (a production order is only read) | Dashboard: order tiles |
| Worker | Factory | Factory Worker: the processes, production, stock, purchase | Dashboard: order tiles |

A Worker must have the department `Sales` or `Factory`; the department decides what the Worker can do. There is no sign-up and no forgot-password: an Admin makes the accounts and sets the passwords.

## Everyone: sign in and move around

```mermaid
flowchart TD
    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;
    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;
    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;
    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;

    A([Open the app]):::startEnd --> B{Signed in?}:::decision
    B -- No --> C[Sign in page:<br/>email + password]:::action
    C --> D{Correct?}:::decision
    D -- No --> C1[Error: invalid credentials<br/>stay on the page]:::error
    C1 --> C
    D -- Yes --> E[First page by role]:::action
    B -- Yes --> E
    E --> F[Menu shows only what the role may use]:::action
    F --> G[Use the pages]:::action

    G --> H{Page not allowed<br/>for this role?}:::decision
    H -- No --> G
    H -- Yes --> I[403 Forbidden page]:::error
    I -- Back --> G
    G --> J[Switch language EN / JA]:::action
    G --> K[Log out]:::action
    G --> L{Session expired<br/>or password changed?}:::decision
    K --> Exit([Sign in page:<br/>email + password]):::startEnd
    L -- Yes --> Exit
```

- The menu hides what the user may not use; the backend checks the same rules on every call.
- A menu that has only one visible entry is shown as that entry alone.
- An unknown address opens the Not found page; old addresses of moved pages are redirected.

## Sale Worker

### Pages

```mermaid
flowchart LR
    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;
    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;
    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;
    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;

    M([Top menu]):::startEnd --> D[Dashboard: order tiles<br/>Draft / In progress / Completed]:::action
    D --> V1[View: production orders]:::action
    M --> Q[Sales work list:<br/>one row per job with its step]:::action
    M --> V2[View: stock and movements]:::action
    M --> V3[View: products and customers]:::action
```

### Make and confirm a QT

```mermaid
flowchart TD
    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;
    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;
    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;
    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;

    Q[Sales work list:<br/>one row per job with its step]:::action --> N[New job]:::action
    Q --> Q1[Open a job]:::action
    N --> Q1
    Q1 --> Q2[Choose customer<br/>add lines: product, quantity, price<br/>status Draft]:::action
    Q2 --> Q3[Print QT form PDF<br/>send to the customer]:::action
    Q2 --> Qd[Delete a Draft QT]:::action
    Q3 --> Q4[Upload customer PO:<br/>PO No., date, file]:::action
    Q4 --> Q5[Press Confirm QT]:::action
    Q5 --> Q6{Customer and<br/>at least one line?}:::decision
    Q6 -- No --> Q2
    Q6 -- Yes --> Q7{PO file attached?}:::decision
    Q7 -- No --> Q8{Warning: continue or go back}:::decision
    Q8 -- Back --> Q4
    Q7 -- Yes --> Q9([QT locked<br/>Draft production order created]):::startEnd
    Q8 -- Continue --> Q9
```

### After Confirm

```mermaid
flowchart TD
    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;
    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;
    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;
    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;

    Q9([QT locked<br/>Draft production order created]):::startEnd --> O[The QT page links to the production order]:::action
    O --> O1[Order page: read only for Sale<br/>Factory adds the processes]:::action
    O1 --> O2[Factory starts production]:::action
    O2 --> O3([Sale sees the progress, read only]):::startEnd
```

What the Sale Worker cannot do: add or change the processes of an order, start production, record progress, change stock, open Purchase, Accounting, Suppliers or Users. A confirmed QT is locked and cannot be deleted; an order cannot be made by hand, only by Confirm QT.

## Factory Worker

### Prepare and start an order

```mermaid
flowchart TD
    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;
    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;
    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;
    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;

    T[Dashboard: order tiles<br/>Draft / In progress / Completed]:::action --> A0[Orders list:<br/>filter by status]:::action
    A0 --> A00[Open a Draft order:<br/>add / edit the processes]:::action
    A00 --> B1[Start production on the order page]:::action
    B1 --> B2{Enough material<br/>for the BOM?}:::decision
    B2 -- Yes --> B4[BOM deducted, oldest lot first<br/>order In production]:::action
    B2 -- No --> B3[409 STOCK_SHORT:<br/>the card shows what is short]:::error
    B4 --> A2([Order In progress]):::startEnd
    B3 --> P1([Purchase page]):::startEnd
```

### Record progress

```mermaid
flowchart TD
    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;
    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;
    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;
    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;

    A2([Order In progress]):::startEnd --> C1[Order page: Record progress]:::action
    A2 --> C5[Open the order:<br/>upload evidence, images and documents]:::action
    C1 --> C2[Choose the process<br/>Not started / In progress / Completed]:::action
    C2 --> C3{All processes<br/>Completed?}:::decision
    C3 -- No --> C1
    C3 -- Yes --> C4([Order Completed<br/>goes to Admin for the invoice]):::startEnd
```

### Purchase and stock

```mermaid
flowchart TD
    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;
    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;
    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;
    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;

    T([Top menu]):::startEnd --> A3["Purchase: PO list,<br/>filter Sent: orders to receive"]:::action
    T --> A4["Purchase: the materials<br/>that are Low or Out"]:::action
    T --> S[Stock]:::action
    T --> V[View: products, suppliers, production orders]:::action
    A3 --> R1[Open the PO]:::action
    R1 --> R2[Set status Received:<br/>type the lot for each line]:::action
    R2 --> R3[Stock added once]:::action
    A4 --> P1[Purchase page]:::action
    S --> S1[Add / Deduct / Adjust a lot<br/>a reason is required for Adjust]:::action
    S --> S2[Movements: history]:::action
```

A Factory Worker cannot reopen a Completed process (Admin only), cannot change QT, customers, products or materials, and cannot open Accounting or Users. The first entry of the menu of a Factory Worker is labelled "Today"; it opens the same Dashboard.

## Purchase (Factory Worker and Admin)

```mermaid
flowchart TD
    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;
    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;
    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;
    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;

    P1[Purchase page: the materials<br/>that are Low or Out]:::action --> P2{Any material listed?}:::decision
    P2 -- No --> P1
    P2 -- Yes --> P3[Create PO from the item]:::action
    P3 --> P4[Fill the form:<br/>supplier, required date, department]:::action
    P4 --> P5[Add lines: items of that supplier,<br/>quantity, price from the system]:::action
    P5 --> P6[Save: status Draft]:::action
    P6 --> P8[Print PO as PDF<br/>name and signature spaces]:::action
    P6 --> P7[Edit lines or delete<br/>only while Draft]:::action
    P8 --> P9[Send to the supplier]:::action
    P9 --> P10[Set status Sent]:::action
    P10 --> P11[Goods arrive]:::action
    P11 --> P12[Set status Received<br/>lot typed for each line]:::action
    P12 --> P13[Stock + quantity, once only<br/>movement recorded]:::action
    P12 --> P14[Record payment:<br/>date, amount, method, reference]:::action
    P6 -.-> F[Upload files: PO file, quotation, other]:::action
    P10 -.-> F
    P12 -.-> F
```

Suppliers and their items and prices are kept by the Admin; the Factory Worker can only view them.

## Admin

```mermaid
flowchart LR
    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;
    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;
    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;
    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;

    Menu([Top menu]):::startEnd --> D[Dashboard: order tiles,<br/>invoice tiles, chart of orders by status]:::action
    Menu --> M[Master data]:::action
    Menu --> Sa[Sales: QT -> Confirm -> production order]:::action
    Menu --> Fa[Factory: start, progress, reopen]:::action
    Menu --> St[Stock: changes and history]:::action
    Menu --> Pu[Purchase: PO, status, payment, files]:::action
    Menu --> Ac[Accounting page]:::action

    St --> St1[Materials: add, edit, delete]:::action

    M --> M1[Customers]:::action
    M --> M2[Products + BOM]:::action
    M --> M4[Suppliers + their items and prices]:::action
    M --> M5[Users: role, department,<br/>password]:::action
    M5 --> U1[New password ends<br/>the sessions of that user]:::action

    Fa --> Fa1[Reopen a Completed process:<br/>note required]:::action
    Fa1 --> Fa2[Order back to In progress]:::action
```

The Admin can do everything the two Workers can.

## Admin: accounting

```mermaid
flowchart TD
    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;
    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;
    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;
    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;

    A[Accounting page]:::action --> T1[Tab: To invoice<br/>Completed orders]:::action
    T1 --> I1[Issue invoice<br/>small dialog]:::action
    I1 --> I2[Invoice Unpaid]:::action
    I2 --> T2[Tab: Waiting for payment<br/>Unpaid invoices]:::action
    A --> T2
    T2 --> I4[Record payment<br/>small dialog: date, amount]:::action
    T2 --> I3[Open invoice as a document:<br/>print]:::action
    I4 --> I5{Full amount?}:::decision
    I5 -- No --> T2
    I5 -- Yes --> I6[Invoice Paid<br/>receipt issued]:::action
    I6 --> T3[Tab: Paid]:::action
    A --> T3
    T3 --> I7[Open receipt as a document:<br/>print]:::action

    A --> S1[Side: We pay suppliers]:::action
    S1 --> T4[Tab: To pay<br/>received POs not paid]:::action
    S1 --> T5[Tab: Paid out<br/>paid POs]:::action
    T4 --> I8[Pay PO: opens the PO page,<br/>the payment is recorded there]:::action
    I8 --> T5
```

The Accounting page has two sides: customers pay us (the tabs To invoice, Waiting for payment, Paid) and we pay suppliers (the tabs To pay and Paid out, which list the received purchase orders; the payment itself is recorded on the PO page, see Purchase).

## Master data

```mermaid
flowchart LR
    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;
    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;
    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;
    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;

    A[Admin]:::action --> B[Record]:::action
    B --> C[Customers]:::action
    B --> D[Products + BOM]:::action
    B --> F[Suppliers + items]:::action
    B --> G[Users]:::action
    C --> H[Add / edit / delete]:::action
    D --> H
    F --> H
    G --> H
    H --> I{Used by other records?}:::decision
    I -- Yes --> J[Delete refused:<br/>shown as in use]:::error
    I -- No --> K([Deleted]):::startEnd
```

Sale Worker: view customers and products. Factory Worker: view products and suppliers. Materials are not here: the Admin adds, edits and deletes them in Stock, Materials.

## Who can do what

| Area | Admin | Sale Worker | Factory Worker |
|---|---|---|---|
| Dashboard | all tiles + chart | order tiles | order tiles |
| QT: create, print, upload PO, confirm, delete a Draft | yes | yes | no access |
| Production orders: view | yes | yes | yes |
| Production orders: add / edit the processes before start | yes | no | yes |
| Start production, record progress | yes | no | yes |
| Reopen a Completed process | yes | no | no |
| Evidence upload (production order) | yes | no | yes |
| Stock: view and movements | yes | yes | yes |
| Stock changes by hand | yes | no | yes |
| Materials: add, edit, delete | yes | no | no |
| Purchase: PO, status, print, payment, files | yes | no | yes |
| Suppliers | yes | no | view only |
| Customers | yes | view only | no |
| Products | yes | view only | view only |
| Invoices, receipts | yes | no | no |
| Users | yes | no | no |

## Print and upload (any page with files)

```mermaid
flowchart TD
    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;
    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;
    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;
    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;

    A[Open QT / PO / order / invoice / receipt]:::action --> B{Action}:::decision
    B -- Print --> C([PDF with name and signature spaces]):::startEnd
    B -- Upload --> D[Choose file: PDF, PNG or JPG, up to 10 MB]:::action
    D --> E[Stored with kind, name, who, when]:::action
    E --> F([List on the page:<br/>open or delete]):::startEnd
```

| Page | Files |
|---|---|
| QT | customer PO |
| Production order | evidence: images and documents (Admin, Factory) |
| Purchase order | PO file, quotation, other files |

## Errors a user may see

| Message | When | What to do |
|---|---|---|
| Invalid credentials | wrong email or password | try again; ask the Admin to reset |
| 403 Forbidden page | a page or action the role may not use | go back; ask the Admin |
| 409 STOCK_SHORT | start production without enough material | purchase or add stock, then start again |
| Validation error | a required field is missing (QT without customer or line) | fill the field |
| In use | delete of a record other records use | keep it, or remove the uses first |
| Session ended | token expired or password changed | sign in again |
