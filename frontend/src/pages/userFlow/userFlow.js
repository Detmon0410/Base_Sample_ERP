/**
 * ProjectdocInfo/User Flow.md as data, word for word: its title, and each section with its blocks in order (a mermaid chart, a list, a
 * table, a paragraph). The intro of the .md only points to other documents and is left out. The page /master/user-flow shows it
 * (pages/mermaidDoc); mermaidDoc.test.js reads the .md and fails when the two differ, so a change starts in the .md.
 */
export const TITLE = "User Flow";

export const SECTIONS = [
  {
    title: "Roles",
    blocks: [
      { table: { head: ["Role", "Department", "Who", "First page"], rows: [
        ["Admin", "any (only a label)", "Owner / office: does everything", "Dashboard: order tiles, invoice tiles, chart"],
        ["Worker", "Sales", "Sale Worker: quotations (a production order is only read)", "Dashboard: order tiles"],
        ["Worker", "Factory", "Factory Worker: the processes, production, stock, purchase", "Dashboard: order tiles"],
      ] } },
      { text: "A Worker must have the department `Sales` or `Factory`; the department decides what the Worker can do. There is no sign-up and no forgot-password: an Admin makes the accounts and sets the passwords." },
    ],
  },
  {
    title: "Everyone: sign in and move around",
    blocks: [
      { chart: "flowchart TD\n    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;\n    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;\n    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;\n    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;\n\n    A([Open the app]):::startEnd --> B{Signed in?}:::decision\n    B -- No --> C[Sign in page:<br/>email + password]:::action\n    C --> D{Correct?}:::decision\n    D -- No --> C1[Error: invalid credentials<br/>stay on the page]:::error\n    C1 --> C\n    D -- Yes --> E[First page by role]:::action\n    B -- Yes --> E\n    E --> F[Menu shows only what the role may use]:::action\n    F --> G[Use the pages]:::action\n\n    G --> H{Page not allowed<br/>for this role?}:::decision\n    H -- No --> G\n    H -- Yes --> I[403 Forbidden page]:::error\n    I -- Back --> G\n    G --> J[Switch language EN / JA]:::action\n    G --> K[Log out]:::action\n    G --> L{Session expired<br/>or password changed?}:::decision\n    K --> Exit([Sign in page:<br/>email + password]):::startEnd\n    L -- Yes --> Exit" },
      { items: ["The menu hides what the user may not use; the backend checks the same rules on every call.", "A menu that has only one visible entry is shown as that entry alone.", "An unknown address opens the Not found page; old addresses of moved pages are redirected."] },
    ],
  },
  {
    title: "Sale Worker",
    blocks: [
      { heading: "Pages" },
      { chart: "flowchart LR\n    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;\n    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;\n    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;\n    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;\n\n    D[Dashboard: order tiles<br/>Draft / In progress / Completed]:::action --> Q[Sales work list:<br/>one row per job with its step]:::action\n    D --> V1[View: production orders]:::action\n    D --> V2[View: stock and movements]:::action\n    D --> V3[View: products and customers]:::action" },
      { heading: "Make and confirm a QT" },
      { chart: "flowchart TD\n    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;\n    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;\n    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;\n    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;\n\n    Q[Sales work list:<br/>one row per job with its step]:::action --> N[New job]:::action\n    Q --> Q1[Open a job]:::action\n    N --> Q1\n    Q1 --> Q2[Choose customer<br/>add lines: product, quantity, price<br/>status Draft]:::action\n    Q2 --> Q3[Print QT form PDF<br/>send to the customer]:::action\n    Q2 --> Qd[Delete a Draft QT]:::action\n    Q3 --> Q4[Upload customer PO:<br/>PO No., date, file]:::action\n    Q4 --> Q5[Press Confirm QT]:::action\n    Q5 --> Q6{Customer and<br/>at least one line?}:::decision\n    Q6 -- No --> Q2\n    Q6 -- Yes --> Q7{PO file attached?}:::decision\n    Q7 -- No --> Q8{Warning: continue or go back}:::decision\n    Q8 -- Back --> Q4\n    Q7 -- Yes --> Q9([QT locked<br/>Draft production order created]):::startEnd\n    Q8 -- Continue --> Q9" },
      { heading: "After Confirm" },
      { chart: "flowchart TD\n    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;\n    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;\n    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;\n    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;\n\n    Q9([QT locked<br/>Draft production order created]):::startEnd --> O[The QT page links to the production order]:::action\n    O --> O1[Order page: read only for Sale<br/>Factory adds the processes]:::action\n    O1 --> O2[Factory starts production]:::action\n    O2 --> O3([Sale sees the progress, read only]):::startEnd" },
      { text: "What the Sale Worker cannot do: add or change the processes of an order, start production, record progress, change stock, open Purchase, Accounting, Suppliers or Users. A confirmed QT is locked and cannot be deleted; an order cannot be made by hand, only by Confirm QT." },
    ],
  },
  {
    title: "Factory Worker",
    blocks: [
      { heading: "Prepare and start an order" },
      { chart: "flowchart TD\n    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;\n    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;\n    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;\n    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;\n\n    T[Dashboard: order tiles<br/>Draft / In progress / Completed]:::action --> A0[Orders list]:::action\n    A0 --> A00[Open a Draft order:<br/>add / edit the processes]:::action\n    A00 --> A1[Orders to start]:::action\n    A1 --> B1[Start production on the order page]:::action\n    B1 --> B2{Enough material<br/>for the BOM?}:::decision\n    B2 -- Yes --> B4[BOM deducted, oldest lot first<br/>order In production]:::action\n    B2 -- No --> B3[409 STOCK_SHORT:<br/>the card shows what is short]:::error\n    B4 --> A2([Orders in production]):::startEnd\n    B3 --> P1([Purchase page]):::startEnd" },
      { heading: "Record progress" },
      { chart: "flowchart TD\n    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;\n    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;\n    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;\n    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;\n\n    A0[Orders list]:::action --> A2[Orders in production]:::action\n    A2 --> C1[Order page: Record progress]:::action\n    A2 --> C5[Open the order:<br/>upload evidence, images and documents]:::action\n    C1 --> C2[Choose the process<br/>Not started / In progress / Completed]:::action\n    C2 --> C3{All processes<br/>Completed?}:::decision\n    C3 -- No --> A2\n    C3 -- Yes --> C4([Order Completed<br/>goes to Admin for the invoice]):::startEnd" },
      { heading: "Purchase and stock" },
      { chart: "flowchart TD\n    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;\n    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;\n    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;\n    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;\n\n    T[Dashboard: order tiles<br/>Draft / In progress / Completed]:::action --> A3[Purchase: orders to receive]:::action\n    T --> A4[Purchase: low stock list]:::action\n    T --> S[Stock]:::action\n    T --> V[View: products, suppliers, production orders]:::action\n    A3 --> R1[Open the PO]:::action\n    R1 --> R2[Set status Received:<br/>type the lot for each line]:::action\n    R2 --> R3[Stock added once]:::action\n    A4 --> P1[Purchase page]:::action\n    S --> S1[Add / Deduct / Adjust a lot<br/>with a reason]:::action\n    S --> S2[Movements: history]:::action" },
      { text: "A Factory Worker cannot reopen a Completed process (Admin only), cannot change QT, customers, products or materials, and cannot open Accounting or Users." },
    ],
  },
  {
    title: "Purchase (Factory Worker and Admin)",
    blocks: [
      { chart: "flowchart TD\n    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;\n    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;\n    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;\n    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;\n\n    P1[Purchase page: stock list<br/>with low flags]:::action --> P2{Item low?}:::decision\n    P2 -- No --> P1\n    P2 -- Yes --> P3[Create PO from the item]:::action\n    P3 --> P4[Fill the form:<br/>supplier, required date, department]:::action\n    P4 --> P5[Add lines: items of that supplier,<br/>quantity, price from the system]:::action\n    P5 --> P6[Save: status Draft]:::action\n    P6 --> P8[Print PO as PDF<br/>name and signature spaces]:::action\n    P6 --> P7[Edit lines or delete<br/>only while Draft]:::action\n    P8 --> P9[Send to the supplier]:::action\n    P9 --> P10[Set status Sent]:::action\n    P10 --> P11[Goods arrive]:::action\n    P11 --> P12[Set status Received<br/>lot typed for each line]:::action\n    P12 --> P13[Stock + quantity, once only<br/>movement recorded]:::action\n    P12 --> P14[Record payment:<br/>date, amount, method, reference]:::action\n    P6 -.-> F[Upload files: PO file, quotation, other]:::action\n    P10 -.-> F\n    P12 -.-> F" },
      { text: "Suppliers and their items and prices are kept by the Admin; the Factory Worker can only view them." },
    ],
  },
  {
    title: "Admin",
    blocks: [
      { chart: "flowchart LR\n    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;\n    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;\n    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;\n    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;\n\n    D[Dashboard: order tiles,<br/>invoice tiles, chart of orders by status]:::action --> M[Master data]:::action\n    D --> Sa[Sales: QT -> Confirm -> production order]:::action\n    D --> Fa[Factory: start, progress, reopen]:::action\n    D --> St[Stock: changes and history]:::action\n    D --> Pu[Purchase: PO, status, payment, files]:::action\n    D --> Ac[Accounting page]:::action\n\n    M --> M1[Customers]:::action\n    M --> M2[Products + BOM + processes]:::action\n    M --> M3[Materials]:::action\n    M --> M4[Suppliers + their items and prices]:::action\n    M --> M5[Users: role, department,<br/>password]:::action\n    M5 --> U1[New password ends<br/>the sessions of that user]:::action\n\n    Fa --> Fa1[Reopen a Completed process:<br/>note required]:::action\n    Fa1 --> Fa2[Order back to In progress]:::action" },
      { text: "The Admin can do everything the two Workers can." },
    ],
  },
  {
    title: "Admin: accounting",
    blocks: [
      { chart: "flowchart TD\n    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;\n    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;\n    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;\n    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;\n\n    A[Accounting page]:::action --> T1[Tab: To invoice<br/>Completed orders]:::action\n    T1 --> I1[Issue invoice<br/>small dialog]:::action\n    I1 --> I2[Invoice Unpaid]:::action\n    I2 --> T2[Tab: Waiting for payment<br/>Unpaid invoices]:::action\n    A --> T2\n    T2 --> I4[Record payment<br/>small dialog: date, amount]:::action\n    T2 --> I3[Open invoice as a document:<br/>print]:::action\n    I4 --> I5{Full amount?}:::decision\n    I5 -- No --> T2\n    I5 -- Yes --> I6[Invoice Paid<br/>receipt issued]:::action\n    I6 --> T3[Tab: Paid]:::action\n    A --> T3\n    T3 --> I7[Open receipt as a document:<br/>print]:::action" },
    ],
  },
  {
    title: "Master data",
    blocks: [
      { chart: "flowchart LR\n    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;\n    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;\n    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;\n    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;\n\n    A[Admin]:::action --> B[Record]:::action\n    B --> C[Customers]:::action\n    B --> D[Products + BOM]:::action\n    B --> E[Materials]:::action\n    B --> F[Suppliers + items]:::action\n    B --> G[Users]:::action\n    C --> H[Add / edit / delete]:::action\n    D --> H\n    E --> H\n    F --> H\n    G --> H\n    H --> I{Used by other records?}:::decision\n    I -- Yes --> J[Delete refused:<br/>shown as in use]:::error\n    I -- No --> K([Deleted]):::startEnd" },
      { text: "Sale Worker: view customers and products. Factory Worker: view products and suppliers." },
    ],
  },
  {
    title: "Who can do what",
    blocks: [
      { table: { head: ["Area", "Admin", "Sale Worker", "Factory Worker"], rows: [
        ["Dashboard", "all tiles + chart", "order tiles", "order tiles"],
        ["QT: create, print, upload PO, confirm, delete a Draft", "yes", "yes", "no access"],
        ["Production orders: view", "yes", "yes", "yes"],
        ["Production orders: add / edit the processes before start", "yes", "no", "yes"],
        ["Start production, record progress", "yes", "no", "yes"],
        ["Reopen a Completed process", "yes", "no", "no"],
        ["Evidence upload (production order)", "yes", "no", "yes"],
        ["Stock: view and movements", "yes", "yes", "yes"],
        ["Stock changes by hand", "yes", "no", "yes"],
        ["Materials: add, edit, delete", "yes", "no", "no"],
        ["Purchase: PO, status, print, payment, files", "yes", "no", "yes"],
        ["Suppliers", "yes", "no", "view only"],
        ["Customers", "yes", "view only", "no"],
        ["Products", "yes", "view only", "view only"],
        ["Invoices, receipts", "yes", "no", "no"],
        ["Users", "yes", "no", "no"],
      ] } },
    ],
  },
  {
    title: "Print and upload (any page with files)",
    blocks: [
      { chart: "flowchart TD\n    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;\n    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;\n    classDef decision fill:#e0f2fe,stroke:#0284c7,color:#1e293b,stroke-width:1.5px;\n    classDef error fill:#fee2e2,stroke:#ef4444,color:#991b1b,stroke-width:1.5px;\n\n    A[Open QT / PO / order / invoice / receipt]:::action --> B{Action}:::decision\n    B -- Print --> C([PDF with name and signature spaces]):::startEnd\n    B -- Upload --> D[Choose file: PDF, PNG or JPG, up to 10 MB]:::action\n    D --> E[Stored with kind, name, who, when]:::action\n    E --> F([List on the page:<br/>open or delete]):::startEnd" },
      { table: { head: ["Page", "Files"], rows: [
        ["QT", "customer PO"],
        ["Production order", "evidence: images and documents (Admin, Factory)"],
        ["Purchase order", "PO file, quotation, other files"],
      ] } },
    ],
  },
  {
    title: "Errors a user may see",
    blocks: [
      { table: { head: ["Message", "When", "What to do"], rows: [
        ["Invalid credentials", "wrong email or password", "try again; ask the Admin to reset"],
        ["403 Forbidden page", "a page or action the role may not use", "go back; ask the Admin"],
        ["409 STOCK_SHORT", "start production without enough material", "purchase or add stock, then start again"],
        ["Validation error", "a required field is missing (QT without customer or line)", "fill the field"],
        ["In use", "delete of a record other records use", "keep it, or remove the uses first"],
        ["Session ended", "token expired or password changed", "sign in again"],
      ] } },
    ],
  },
];
