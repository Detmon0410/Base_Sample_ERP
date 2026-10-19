/**
 * ProjectdocInfo/Flow Chart.md as data, word for word: its title, and each section with its blocks in order (a mermaid chart, a list, a
 * table, a paragraph). The intro of the .md only points to other documents and is left out. The page /master/flow-chart shows it
 * (pages/mermaidDoc); mermaidDoc.test.js reads the .md and fails when the two differ, so a change starts in the .md.
 */
export const TITLE = "Flow Chart";

export const SECTIONS = [
  {
    title: "Main flow",
    blocks: [
      { chart: "flowchart TD\n    A([Start]) --> B[Admin: master data<br/>customers, products + BOM,<br/>materials, suppliers + their items, users]\n    B --> C[Sale: create QT with lines<br/>status Draft]\n    C --> D[Print QT form as PDF<br/>send to customer]\n    D --> E[Upload the customer PO<br/>PO No., date, file]\n    E --> F[Confirm QT]\n    F --> G[System creates a Draft Factory Order<br/>from the QT lines]\n    G --> H{Enough stock<br/>for the BOM?}\n    H -- No --> P1[Purchase flow below] --> H\n    H -- Yes --> I[Factory: start production<br/>BOM deducted, oldest lot first]\n    I --> J[Factory: record progress,<br/>upload evidence images / documents]\n    J --> K{All processes<br/>Completed?}\n    K -- No --> J\n    K -- Yes --> L[Admin: issue invoice]\n    L --> M[Admin: full payment -> Paid + receipt]\n    M --> N([End])" },
    ],
  },
  {
    title: "Purchase flow",
    blocks: [
      { chart: "flowchart TD\n    S1[Check the low stock<br/>on Today or the Purchase page] --> S2{Item low?}\n    S2 -- No --> S1\n    S2 -- Yes --> S3[Create PO:<br/>supplier, required date, department,<br/>items of that supplier, quantity,<br/>initial price from the system]\n    S3 --> S4[Save: status Draft]\n    S4 --> S5[Print PO as PDF<br/>name and signature spaces]\n    S5 --> S6[User sets status Sent]\n    S6 --> S7[User sets status Received]\n    S7 --> S8[Stock + quantities, once only]\n    S7 --> S9[Record payment<br/>date, amount, method, reference]\n    S4 -.-> S10[(Upload PO file / quotation / other files)]\n    S6 -.-> S10\n    S7 -.-> S10" },
    ],
  },
  {
    title: "PO status",
    blocks: [
      { chart: "stateDiagram-v2\n    [*] --> Draft: saved\n    Draft --> Sent: user\n    Sent --> Received: user, stock added once\n    Received --> [*]: payment recorded" },
      { text: "Lines can be edited only in `Draft`. A `Draft` PO can be deleted." },
    ],
  },
  {
    title: "QT status",
    blocks: [
      { chart: "stateDiagram-v2\n    [*] --> Draft\n    Draft --> Confirmed: Confirm QT, Factory Order created once\n    Confirmed --> [*]: locked, cannot be deleted" },
    ],
  },
  {
    title: "Order status",
    blocks: [
      { chart: "stateDiagram-v2\n    [*] --> Draft: made by Confirm QT\n    Draft --> InProgress: first process started\n    InProgress --> Completed: every process Completed\n    Completed --> InProgress: a process reopened (Admin, note required)\n    Completed --> [*]: invoiced" },
      { text: "The status of an order is computed from its processes, not set by hand. `Draft` also covers an order that was started but has no progress yet (the page says \"Production started\")." },
    ],
  },
  {
    title: "Process status",
    blocks: [
      { chart: "stateDiagram-v2\n    [*] --> NotStarted\n    NotStarted --> InProgress\n    InProgress --> Completed\n    Completed --> InProgress: Admin only, note required" },
    ],
  },
  {
    title: "Invoice status",
    blocks: [
      { chart: "stateDiagram-v2\n    [*] --> Unpaid: issued\n    Unpaid --> Paid: full payment, receipt issued" },
    ],
  },
  {
    title: "Stock changes",
    blocks: [
      { chart: "flowchart LR\n    S1[Admin or Factory Worker: Add / Deduct / Adjust a lot] --> S3[(MaterialLot)]\n    S2[Start production: BOM deducted, oldest lot first] --> S3\n    S6[PO received: Add to the lot typed for each line, once] --> S3\n    S3 --> S4[(StockChange history)]\n    S3 --> S5{Total vs min level}\n    S5 --> Normal\n    S5 --> Low\n    S5 --> Out" },
    ],
  },
  {
    title: "Confirm QT: checks",
    blocks: [
      { chart: "flowchart LR\n    C1[Press Confirm] --> C2{Customer and<br/>at least one line?}\n    C2 -- No --> C3[Validation error]\n    C2 -- Yes --> C4{Already confirmed?}\n    C4 -- Yes --> C5[Show the existing order]\n    C4 -- No --> C6{Customer PO file?}\n    C6 -- No --> C7[Warning, user may continue]\n    C6 -- Yes --> C8\n    C7 --> C8[Create Draft Factory Order,<br/>attach PO file, lock QT]" },
    ],
  },
];
