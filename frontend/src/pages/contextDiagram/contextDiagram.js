/**
 * ProjectdocInfo/Context Diagram.md as data, word for word: its title, and each section with its blocks in order (a mermaid chart, a
 * list, a table, a paragraph). The .md has no intro. The page /master/context-diagram shows it (pages/mermaidDoc), with what is
 * never shown hidden (utils/censor.js); mermaidDoc.test.js reads the .md and fails when the two differ, so a change starts in the .md.
 */
export const TITLE = "Context Diagram";

export const SECTIONS = [
  {
    title: "Level 0: system context",
    blocks: [
      { chart: "flowchart LR\n    Admin([Admin])\n    Sale([Sale Worker])\n    Fac([Factory Worker])\n    Cust([Customer])\n    Sup([Supplier])\n\n    ERP[[\"Mini ERP 2.0\"]]\n\n    Admin -- \"master data, invoices,<br/>payments, all actions\" --> ERP\n    ERP -- \"dashboard, all lists,<br/>invoice, receipt\" --> Admin\n\n    Sale -- \"QT, customer PO,<br/>orders before start\" --> ERP\n    ERP -- \"QT form PDF\" --> Sale\n\n    Fac -- \"progress, evidence, stock changes,<br/>PO, PO status, PO payment\" --> ERP\n    ERP -- \"orders, stock, PO PDF\" --> Fac\n\n    Sale -. \"sends QT form, receives customer PO\" .- Cust\n    Fac -. \"sends PO PDF, receives goods\" .- Sup\n    Admin -. \"invoice and receipt, payment\" .- Cust\n    Fac -. \"pays the supplier\" .-> Sup" },
    ],
  },
  {
    title: "Level 1: inside the system",
    blocks: [
      { chart: "flowchart LR\n    subgraph Client[\"Frontend\"]\n        UI[Pages: Dashboard, Sales (QT),<br/>Orders, Purchase, Accounting,<br/>Stock, Master]\n        PDF[PDF print: QT form, PO]\n        Mock[(Mock API)]\n    end\n    subgraph Server[\"Backend\"]\n        API[REST API /api<br/>auth, master, suppliers, stock, qt,<br/>orders, purchase, files, invoices,<br/>receipts, dashboard]\n        FS[(File storage<br/>attachments)]\n        DB[(MySQL)]\n    end\n\n    UI --> PDF\n    UI -- \"mock mode\" --> Mock\n    UI -- \"JSON + Bearer token\" --> API\n    API --> DB\n    API --> FS" },
    ],
  },
  {
    title: "External entities",
    blocks: [
      { table: { head: ["Entity", "Gives the system", "Gets from the system"], rows: [
        ["Admin", "master data, invoices, payments, any action", "all pages, invoice and receipt"],
        ["Sale Worker", "QT, customer PO file, order edits", "QT form PDF, order and stock views"],
        ["Factory Worker", "progress, evidence files, stock changes, PO and its status and payment", "orders, stock, PO PDF"],
        ["Customer (outside)", "customer PO, payment", "QT form, invoice, receipt (handed over by users)"],
        ["Supplier (outside)", "goods, quotation", "PO PDF (handed over by the user)"],
      ] } },
    ],
  },
  {
    title: "Data stores added in Version 2.0",
    blocks: [
      { table: { head: ["Store", "Content"], rows: [
        ["Purchase data", "suppliers, supplier items and prices, POs, PO lines, PO payments"],
        ["Attachments", "PO files, quotations, production evidence, other documents"],
      ] } },
    ],
  },
  {
    title: "Not in this system",
    blocks: [
      { text: "Sales orders, delivery, supplier invoices in Accounting, serial numbers and tax." },
    ],
  },
];
