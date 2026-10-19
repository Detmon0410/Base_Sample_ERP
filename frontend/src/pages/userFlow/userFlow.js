/**
 * ProjectdocInfo/User Flow.md as data, word for word: its title, and each section with its blocks in order (a mermaid chart, a
 * table, a paragraph). The intro of the .md only points to other documents and is left out. The page /master/user-flow shows it
 * (pages/mermaidDoc); mermaidDoc.test.js reads the .md and fails when the two differ, so a change starts in the .md.
 */
export const TITLE = "User Flow";

export const SECTIONS = [
  {
    title: "Sale Worker",
    blocks: [
      { chart: "flowchart TD\n    D[Dashboard: order tiles] --> Q[Sales work list]\n    Q --> Q1[One page for the job:<br/>customer + lines]\n    Q1 --> Q2[Print QT form PDF]\n    Q2 --> Q3[Upload customer PO]\n    Q3 --> Q4[Confirm QT]\n    Q4 --> O[Same page: the production order]\n    O --> O1[Add the processes<br/>before the start,<br/>see the progress after it]\n    D --> V[View: orders, stock, products, customers]" },
    ],
  },
  {
    title: "Factory Worker",
    blocks: [
      { chart: "flowchart TD\n    D[Today: the work of the day] --> L[Production orders]\n    L --> O2[Open the order: start production<br/>409 STOCK_SHORT if material short]\n    D --> O3[Record progress on the card]\n    O3 --> O4[Open the order: upload evidence,<br/>images and documents]\n    D --> R[Purchase orders to receive]\n    D --> S[Stock]\n    S --> S1[Add / Deduct / Adjust a lot]\n    D --> P[Purchase]\n    P --> P1[See low stock]\n    P1 --> P2[Create PO]\n    P2 --> P3[Print PDF]\n    P3 --> P4[Sent -> Received]\n    P4 --> P5[Record payment]" },
    ],
  },
  {
    title: "Admin",
    blocks: [
      { chart: "flowchart TD\n    D[Dashboard: all tiles + chart] --> M[Master data:<br/>customers, products, suppliers, users]\n    D --> Sale[QT -> Confirm -> Factory Order]\n    D --> Fac[Start production, progress, reopen]\n    D --> Stk[Stock changes]\n    D --> Pur[Purchase: PO, status, payment]\n    D --> Acc[Accounting page:<br/>invoice -> payment -> receipt]" },
      { text: "The Admin can do everything the two Workers can." },
    ],
  },
  {
    title: "Who can do what",
    blocks: [
      { table: { head: ["Area", "Admin", "Sale Worker", "Factory Worker"], rows: [
        ["QT: create, print, upload PO, confirm", "yes", "yes", "no access"],
        ["Production orders: create / edit before start", "yes", "yes", "no"],
        ["Start production, record progress", "yes", "no", "yes"],
        ["Evidence upload (production order)", "yes", "no", "yes"],
        ["Stock: view", "yes", "yes", "yes"],
        ["Stock changes by hand", "yes", "no", "yes"],
        ["Purchase: PO, status, print, payment", "yes", "no", "yes"],
        ["Suppliers", "yes", "no", "view only"],
        ["Customers", "yes", "view only", "no"],
        ["Products", "yes", "view only", "view only"],
        ["Invoices, receipts, users", "yes", "no", "no"],
      ] } },
    ],
  },
  {
    title: "Print and upload (any page with files)",
    blocks: [
      { chart: "flowchart LR\n    A[Open QT / PO / order] --> B{Action}\n    B -- Print --> C[PDF with name and signature spaces]\n    B -- Upload --> D[Choose file: PDF, PNG or JPG, up to 10 MB]\n    D --> E[Stored with kind, name, who, when]" },
    ],
  },
];
