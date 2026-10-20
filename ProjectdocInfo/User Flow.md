# User Flow

How each user works through the system, by role. The order of the work is in [Flow Chart](Flow%20Chart.md); the pages are in [Site Map](Site%20Map.md).

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
    A[Open the app] --> B{Signed in?}
    B -- No --> C[Sign in page:<br/>email + password]
    C --> D{Correct?}
    D -- No --> C1[Error: invalid credentials<br/>stay on the page]
    C1 --> C
    D -- Yes --> E[First page by role]
    B -- Yes --> E
    E --> F[Menu shows only what the role may use]
    F --> G[Use the pages]
    G --> H{Page not allowed<br/>for this role?}
    H -- Yes --> I[403 Forbidden page]
    H -- No --> G
    G --> J[Switch language EN / JA]
    G --> K[Log out]
    K --> C
    G --> L{Session expired<br/>or password changed?}
    L -- Yes --> C
```

- The menu hides what the user may not use; the backend checks the same rules on every call.
- A menu that has only one visible entry is shown as that entry alone.
- An unknown address opens the Not found page; old addresses of moved pages are redirected.

## Sale Worker

```mermaid
flowchart TD
    D[Dashboard: order tiles<br/>Draft / In progress / Completed] --> Q[Sales work list:<br/>one row per job with its step]
    Q --> N[New job]
    Q --> Q1[Open a job]
    N --> Q1
    Q1 --> Q2[Choose customer<br/>add lines: product, quantity, price<br/>status Draft]
    Q2 --> Q3[Print QT form PDF<br/>send to the customer]
    Q3 --> Q4[Upload customer PO:<br/>PO No., date, file]
    Q4 --> Q5[Press Confirm QT]
    Q5 --> Q6{Customer and<br/>at least one line?}
    Q6 -- No --> Q2
    Q6 -- Yes --> Q7{PO file attached?}
    Q7 -- No --> Q8[Warning: continue or go back]
    Q8 -- Back --> Q4
    Q8 -- Continue --> Q9
    Q7 -- Yes --> Q9[QT locked<br/>Draft production order created]
    Q9 --> O[The QT page links to the production order]
    O --> O1[Order page: read only for Sale<br/>Factory adds the processes]
    O1 --> O2[Factory starts production]
    O2 --> O3[Sale sees the progress, read only]
    D --> V1[View: production orders]
    D --> V2[View: stock and movements]
    D --> V3[View: products and customers]
    Q2 --> Qd[Delete a Draft QT]
```

What the Sale Worker cannot do: add or change the processes of an order, start production, record progress, change stock, open Purchase, Accounting, Suppliers or Users. A confirmed QT is locked and cannot be deleted; an order cannot be made by hand, only by Confirm QT.

## Factory Worker

```mermaid
flowchart TD
    T[Dashboard: order tiles<br/>Draft / In progress / Completed] --> A0[Orders list]
    A0 --> A00[Open a Draft order:<br/>add / edit the processes]
    A00 --> A1[Orders to start]
    A0 --> A2[Orders in production]
    T --> A3[Purchase: orders to receive]
    T --> A4[Purchase: low stock list]

    A1 --> B1[Start production on the order page]
    B1 --> B2{Enough material<br/>for the BOM?}
    B2 -- No --> B3[409 STOCK_SHORT:<br/>the card shows what is short]
    B3 --> P1
    B2 -- Yes --> B4[BOM deducted, oldest lot first<br/>order In production]
    B4 --> A2

    A2 --> C1[Order page: Record progress]
    C1 --> C2[Choose the process<br/>Not started / In progress / Completed]
    C2 --> C3{All processes<br/>Completed?}
    C3 -- No --> A2
    C3 -- Yes --> C4[Order Completed<br/>goes to Admin for the invoice]
    A2 --> C5[Open the order:<br/>upload evidence, images and documents]

    A3 --> R1[Open the PO]
    R1 --> R2[Set status Received:<br/>type the lot for each line]
    R2 --> R3[Stock added once]

    A4 --> P1[Purchase page]
    T --> S[Stock]
    S --> S1[Add / Deduct / Adjust a lot<br/>with a reason]
    S --> S2[Movements: history]
    T --> V[View: products, suppliers, production orders]
```

A Factory Worker cannot reopen a Completed process (Admin only), cannot change QT, customers, products or materials, and cannot open Accounting or Users.

## Purchase (Factory Worker and Admin)

```mermaid
flowchart TD
    P1[Purchase page: stock list<br/>with low flags] --> P2{Item low?}
    P2 -- No --> P1
    P2 -- Yes --> P3[Create PO from the item]
    P3 --> P4[Fill the form:<br/>supplier, required date, department]
    P4 --> P5[Add lines: items of that supplier,<br/>quantity, price from the system]
    P5 --> P6[Save: status Draft]
    P6 --> P7[Edit lines or delete<br/>only while Draft]
    P6 --> P8[Print PO as PDF<br/>name and signature spaces]
    P8 --> P9[Send to the supplier]
    P9 --> P10[Set status Sent]
    P10 --> P11[Goods arrive]
    P11 --> P12[Set status Received<br/>lot typed for each line]
    P12 --> P13[Stock + quantity, once only<br/>movement recorded]
    P12 --> P14[Record payment:<br/>date, amount, method, reference]
    P6 -.-> F[Upload files: PO file, quotation, other]
    P10 -.-> F
    P12 -.-> F
```

Suppliers and their items and prices are kept by the Admin; the Factory Worker can only view them.

## Admin

```mermaid
flowchart TD
    D[Dashboard: order tiles,<br/>invoice tiles, chart of orders by status] --> M[Master data]
    D --> Sa[Sales: QT -> Confirm -> production order]
    D --> Fa[Factory: start, progress, reopen]
    D --> St[Stock: changes and history]
    D --> Pu[Purchase: PO, status, payment, files]
    D --> Ac[Accounting page]

    M --> M1[Customers]
    M --> M2[Products + BOM + processes]
    M --> M3[Materials]
    M --> M4[Suppliers + their items and prices]
    M --> M5[Users: role, department,<br/>password]

    Fa --> Fa1[Reopen a Completed process:<br/>note required]
    Fa1 --> Fa2[Order back to In progress]

    M5 --> U1[New password ends<br/>the sessions of that user]
```

The Admin can do everything the two Workers can.

## Admin: accounting

```mermaid
flowchart TD
    A[Accounting page] --> T1[Tab: To invoice<br/>Completed orders]
    A --> T2[Tab: Waiting for payment<br/>Unpaid invoices]
    A --> T3[Tab: Paid]

    T1 --> I1[Issue invoice<br/>small dialog]
    I1 --> I2[Invoice Unpaid]
    I2 --> T2
    T2 --> I3[Open invoice as a document:<br/>print]
    T2 --> I4[Record payment<br/>small dialog: date, amount]
    I4 --> I5{Full amount?}
    I5 -- No --> T2
    I5 -- Yes --> I6[Invoice Paid<br/>receipt issued]
    I6 --> T3
    T3 --> I7[Open receipt as a document:<br/>print]
```

## Master data

```mermaid
flowchart LR
    A[Admin] --> B{Record}
    B --> C[Customers]
    B --> D[Products + BOM]
    B --> E[Materials]
    B --> F[Suppliers + items]
    B --> G[Users]
    C --> H[Add / edit / delete]
    D --> H
    E --> H
    F --> H
    G --> H
    H --> I{Used by other records?}
    I -- Yes --> J[Delete refused:<br/>shown as in use]
    I -- No --> K[Deleted]
```

Sale Worker: view customers and products. Factory Worker: view products and suppliers.

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
flowchart LR
    A[Open QT / PO / order / invoice / receipt] --> B{Action}
    B -- Print --> C[PDF with name and signature spaces]
    B -- Upload --> D[Choose file: PDF, PNG or JPG, up to 10 MB]
    D --> E[Stored with kind, name, who, when]
    E --> F[List on the page:<br/>open or delete]
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
