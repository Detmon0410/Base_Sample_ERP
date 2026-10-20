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
      { chart: "flowchart TD\n    A[Open the app] --> B{Signed in?}\n    B -- No --> C[Sign in page:<br/>email + password]\n    C --> D{Correct?}\n    D -- No --> C1[Error: invalid credentials<br/>stay on the page]\n    C1 --> C\n    D -- Yes --> E[First page by role]\n    B -- Yes --> E\n    E --> F[Menu shows only what the role may use]\n    F --> G[Use the pages]\n    G --> H{Page not allowed<br/>for this role?}\n    H -- Yes --> I[403 Forbidden page]\n    H -- No --> G\n    G --> J[Switch language EN / JA]\n    G --> K[Log out]\n    K --> C\n    G --> L{Session expired<br/>or password changed?}\n    L -- Yes --> C" },
      { items: ["The menu hides what the user may not use; the backend checks the same rules on every call.", "A menu that has only one visible entry is shown as that entry alone.", "An unknown address opens the Not found page; old addresses of moved pages are redirected."] },
    ],
  },
  {
    title: "Sale Worker",
    blocks: [
      { chart: "flowchart TD\n    D[Dashboard: order tiles<br/>Draft / In progress / Completed] --> Q[Sales work list:<br/>one row per job with its step]\n    Q --> N[New job]\n    Q --> Q1[Open a job]\n    N --> Q1\n    Q1 --> Q2[Choose customer<br/>add lines: product, quantity, price<br/>status Draft]\n    Q2 --> Q3[Print QT form PDF<br/>send to the customer]\n    Q3 --> Q4[Upload customer PO:<br/>PO No., date, file]\n    Q4 --> Q5[Press Confirm QT]\n    Q5 --> Q6{Customer and<br/>at least one line?}\n    Q6 -- No --> Q2\n    Q6 -- Yes --> Q7{PO file attached?}\n    Q7 -- No --> Q8[Warning: continue or go back]\n    Q8 -- Back --> Q4\n    Q8 -- Continue --> Q9\n    Q7 -- Yes --> Q9[QT locked<br/>Draft production order created]\n    Q9 --> O[The QT page links to the production order]\n    O --> O1[Order page: read only for Sale<br/>Factory adds the processes]\n    O1 --> O2[Factory starts production]\n    O2 --> O3[Sale sees the progress, read only]\n    D --> V1[View: production orders]\n    D --> V2[View: stock and movements]\n    D --> V3[View: products and customers]\n    Q2 --> Qd[Delete a Draft QT]" },
      { text: "What the Sale Worker cannot do: add or change the processes of an order, start production, record progress, change stock, open Purchase, Accounting, Suppliers or Users. A confirmed QT is locked and cannot be deleted; an order cannot be made by hand, only by Confirm QT." },
    ],
  },
  {
    title: "Factory Worker",
    blocks: [
      { chart: "flowchart TD\n    T[Dashboard: order tiles<br/>Draft / In progress / Completed] --> A0[Orders list]\n    A0 --> A00[Open a Draft order:<br/>add / edit the processes]\n    A00 --> A1[Orders to start]\n    A0 --> A2[Orders in production]\n    T --> A3[Purchase: orders to receive]\n    T --> A4[Purchase: low stock list]\n\n    A1 --> B1[Start production on the order page]\n    B1 --> B2{Enough material<br/>for the BOM?}\n    B2 -- No --> B3[409 STOCK_SHORT:<br/>the card shows what is short]\n    B3 --> P1\n    B2 -- Yes --> B4[BOM deducted, oldest lot first<br/>order In production]\n    B4 --> A2\n\n    A2 --> C1[Order page: Record progress]\n    C1 --> C2[Choose the process<br/>Not started / In progress / Completed]\n    C2 --> C3{All processes<br/>Completed?}\n    C3 -- No --> A2\n    C3 -- Yes --> C4[Order Completed<br/>goes to Admin for the invoice]\n    A2 --> C5[Open the order:<br/>upload evidence, images and documents]\n\n    A3 --> R1[Open the PO]\n    R1 --> R2[Set status Received:<br/>type the lot for each line]\n    R2 --> R3[Stock added once]\n\n    A4 --> P1[Purchase page]\n    T --> S[Stock]\n    S --> S1[Add / Deduct / Adjust a lot<br/>with a reason]\n    S --> S2[Movements: history]\n    T --> V[View: products, suppliers, production orders]" },
      { text: "A Factory Worker cannot reopen a Completed process (Admin only), cannot change QT, customers, products or materials, and cannot open Accounting or Users." },
    ],
  },
  {
    title: "Purchase (Factory Worker and Admin)",
    blocks: [
      { chart: "flowchart TD\n    P1[Purchase page: stock list<br/>with low flags] --> P2{Item low?}\n    P2 -- No --> P1\n    P2 -- Yes --> P3[Create PO from the item]\n    P3 --> P4[Fill the form:<br/>supplier, required date, department]\n    P4 --> P5[Add lines: items of that supplier,<br/>quantity, price from the system]\n    P5 --> P6[Save: status Draft]\n    P6 --> P7[Edit lines or delete<br/>only while Draft]\n    P6 --> P8[Print PO as PDF<br/>name and signature spaces]\n    P8 --> P9[Send to the supplier]\n    P9 --> P10[Set status Sent]\n    P10 --> P11[Goods arrive]\n    P11 --> P12[Set status Received<br/>lot typed for each line]\n    P12 --> P13[Stock + quantity, once only<br/>movement recorded]\n    P12 --> P14[Record payment:<br/>date, amount, method, reference]\n    P6 -.-> F[Upload files: PO file, quotation, other]\n    P10 -.-> F\n    P12 -.-> F" },
      { text: "Suppliers and their items and prices are kept by the Admin; the Factory Worker can only view them." },
    ],
  },
  {
    title: "Admin",
    blocks: [
      { chart: "flowchart TD\n    D[Dashboard: order tiles,<br/>invoice tiles, chart of orders by status] --> M[Master data]\n    D --> Sa[Sales: QT -> Confirm -> production order]\n    D --> Fa[Factory: start, progress, reopen]\n    D --> St[Stock: changes and history]\n    D --> Pu[Purchase: PO, status, payment, files]\n    D --> Ac[Accounting page]\n\n    M --> M1[Customers]\n    M --> M2[Products + BOM + processes]\n    M --> M3[Materials]\n    M --> M4[Suppliers + their items and prices]\n    M --> M5[Users: role, department,<br/>password]\n\n    Fa --> Fa1[Reopen a Completed process:<br/>note required]\n    Fa1 --> Fa2[Order back to In progress]\n\n    M5 --> U1[New password ends<br/>the sessions of that user]" },
      { text: "The Admin can do everything the two Workers can." },
    ],
  },
  {
    title: "Admin: accounting",
    blocks: [
      { chart: "flowchart TD\n    A[Accounting page] --> T1[Tab: To invoice<br/>Completed orders]\n    A --> T2[Tab: Waiting for payment<br/>Unpaid invoices]\n    A --> T3[Tab: Paid]\n\n    T1 --> I1[Issue invoice<br/>small dialog]\n    I1 --> I2[Invoice Unpaid]\n    I2 --> T2\n    T2 --> I3[Open invoice as a document:<br/>print]\n    T2 --> I4[Record payment<br/>small dialog: date, amount]\n    I4 --> I5{Full amount?}\n    I5 -- No --> T2\n    I5 -- Yes --> I6[Invoice Paid<br/>receipt issued]\n    I6 --> T3\n    T3 --> I7[Open receipt as a document:<br/>print]" },
    ],
  },
  {
    title: "Master data",
    blocks: [
      { chart: "flowchart LR\n    A[Admin] --> B{Record}\n    B --> C[Customers]\n    B --> D[Products + BOM]\n    B --> E[Materials]\n    B --> F[Suppliers + items]\n    B --> G[Users]\n    C --> H[Add / edit / delete]\n    D --> H\n    E --> H\n    F --> H\n    G --> H\n    H --> I{Used by other records?}\n    I -- Yes --> J[Delete refused:<br/>shown as in use]\n    I -- No --> K[Deleted]" },
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
      { chart: "flowchart LR\n    A[Open QT / PO / order / invoice / receipt] --> B{Action}\n    B -- Print --> C[PDF with name and signature spaces]\n    B -- Upload --> D[Choose file: PDF, PNG or JPG, up to 10 MB]\n    D --> E[Stored with kind, name, who, when]\n    E --> F[List on the page:<br/>open or delete]" },
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
