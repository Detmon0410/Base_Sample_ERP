/**
 * ProjectdocInfo/APIs Diagram.md as data, word for word: its title, its intro (without the sentence that points to other documents),
 * and each section with its blocks in order (a mermaid chart, a sub-heading, a table, a paragraph). The page /master/apis-diagram
 * shows it (pages/mermaidDoc), with what is never shown hidden (utils/censor.js); mermaidDoc.test.js reads the .md and fails when
 * the two differ, so a change starts in the .md.
 */
export const TITLE = "APIs Diagram";

export const INTRO = [
  { text: "Summary of the backend API built in `backend/` (Node.js, Express, Prisma, MySQL). Base URL `http://localhost:3000/api`. Every route except `/health` and `POST /auth/login` needs `Authorization: Bearer <token>`." },
  { text: "Envelope: success `{ success: true, data, meta? }`, error `{ success: false, message, error: \"CODE\", errors? }`." },
];

export const SECTIONS = [
  {
    title: "1. Layers",
    blocks: [
      { chart: "flowchart LR\n    FE[Frontend<br/>React :5173] -->|JSON + Bearer JWT| R[routes/*.routes.js]\n    R --> AUTH[authenticate<br/>JWT + tokenVersion]\n    AUTH --> PERM[requires role / department]\n    PERM --> S[services/*.service.js<br/>validation + rules]\n    S --> P[(Prisma)]\n    P --> DB[(MySQL<br/>kanou_mini_erp)]\n    S --> FS[(uploads/<br/>attachment files)]\n    S -. ApiError .-> ERR[error.middleware<br/>envelope + codes]" },
    ],
  },
  {
    title: "2. Endpoints by module",
    blocks: [
      { chart: "flowchart LR\n    API[\"/api\"]\n    API --> AUTHM[\"Auth\"]\n    API --> MASTER[\"Master data\"]\n    API --> STOCK[\"Stock\"]\n    API --> SALE[\"Sale\"]\n    API --> ACC[\"Accounting\"]\n    API --> BUY[\"Purchase (2.0)\"]\n    API --> MISC[\"Files / Dashboard\"]\n\n    BUY --> b1[\"/suppliers  GET POST PUT DELETE (items, active)\"]\n    BUY --> b2[\"/purchase-orders  GET POST PUT DELETE (Draft only)\"]\n    BUY --> b3[\"POST /purchase-orders/:id/status  Sent / Received + lots\"]\n    BUY --> b4[\"POST /purchase-orders/:id/payment\"]\n\n    AUTHM --> a1[\"POST /auth/login\"]\n    AUTHM --> a2[\"GET /auth/me\"]\n    AUTHM --> a3[\"POST /auth/logout\"]\n\n    MASTER --> m1[\"/customers  GET POST PUT DELETE\"]\n    MASTER --> m2[\"/products  GET POST PUT DELETE (with BOM)\"]\n    MASTER --> m3[\"/users  GET POST PUT DELETE\"]\n\n    STOCK --> s1[\"/materials  GET POST PUT DELETE (lots, total, stockStatus)\"]\n    STOCK --> s2[\"GET /materials/:id/stock-changes\"]\n    STOCK --> s3[\"POST /materials/:id/stock-changes  Add / Deduct / Adjust\"]\n    STOCK --> s4[\"GET /stock-changes  movements ledger\"]\n\n    SALE --> q1[\"/qt  GET POST PUT DELETE\"]\n    SALE --> q2[\"POST /qt/:id/confirm\"]\n    SALE --> o1[\"GET /orders, GET /orders/:id\"]\n    SALE --> o2[\"PUT /orders/:id  before start\"]\n    SALE --> o3[\"POST /orders/:id/start\"]\n    SALE --> o4[\"POST /orders/:id/progress\"]\n\n    ACC --> i1[\"GET /invoices, GET /invoices/:id\"]\n    ACC --> i2[\"POST /invoices\"]\n    ACC --> i3[\"POST /invoices/:id/payment\"]\n    ACC --> r1[\"GET /receipts, GET /receipts/:id\"]\n\n    MISC --> f1[\"GET /attachments?ownerType&ownerId\"]\n    MISC --> f2[\"GET /attachments/:id\"]\n    MISC --> f3[\"POST /attachments, DELETE /attachments/:id\"]\n    MISC --> d1[\"GET /dashboard\"]" },
      { text: "Query options added by the merged contract: `GET /qt` takes `step` (`Draft`, `Confirmed`, `InProduction`, `Done`) and every QT has a computed `step`; `GET /orders` takes `invoiced` (`true` / `false`); `GET /suppliers` takes `materialId` and `active`, and a list row has `itemCount` instead of `items`; a purchase order carries `supplierAddress` and its payment is `{ paymentDate, amount, method, referenceNo, note }`." },
      { text: "List calls take `q`, `page`, `pageSize` and answer `meta: { page, pageSize, total }`. `/orders`, `/qt`, `/invoices` also take `status`; `/materials` takes `status` = Normal / Low / Out; `/stock-changes` takes `type`, `from`, `to`." },
    ],
  },
  {
    title: "3. Who may call",
    blocks: [
      { table: { head: ["Area", "Admin", "Sale Worker (`Sales`)", "Factory Worker (`Factory`)"], align: ["left", "center", "center", "center"], rows: [
        ["Dashboard, products read, materials read, stock history, orders read", "yes", "yes", "yes"],
        ["Customers read", "yes", "yes", "403"],
        ["Customers, products, materials, users write", "yes", "403", "403"],
        ["Users read", "yes", "403", "403"],
        ["QT (all calls, Confirm, delete a Draft)", "yes", "yes", "403"],
        ["`PUT /orders/:id` (before start)", "yes", "yes", "403"],
        ["`POST /orders/:id/start`, `/progress`", "yes", "403", "yes"],
        ["Stock change by hand", "yes", "403", "yes"],
        ["Reopen / change a Completed process", "yes", "403", "403"],
        ["Suppliers read; purchase orders, payment, PO files", "yes", "403", "yes"],
        ["Suppliers write", "yes", "403", "403"],
        ["Invoices, payments, receipts", "yes", "403", "403"],
        ["Files of a QT (read, upload, delete)", "yes", "yes", "403"],
        ["Files of an order: read", "yes", "yes", "yes"],
        ["Files of an order: upload, delete", "yes", "403", "yes"],
      ] } },
      { text: "The role check runs before the record lookup, so a forbidden user gets `403`, not `404`." },
    ],
  },
  {
    title: "4. One sale, end to end",
    blocks: [
      { chart: "sequenceDiagram\n    actor Sale as Sale Worker / Admin\n    actor Fac as Factory Worker / Admin\n    actor Adm as Admin\n    participant API\n    participant DB\n\n    Sale->>API: POST /qt  (Draft, lines)\n    Sale->>API: POST /attachments  (PO_FILE, optional)\n    Sale->>API: POST /qt/:id/confirm\n    API->>DB: QT = Confirmed, create ORD-yyyy-0001 (Draft), copy PO file\n    API-->>Sale: { qt, order, alreadyConfirmed, warnings }\n    Sale->>API: PUT /orders/:id  (date, lines, processes)\n    Fac->>API: POST /orders/:id/start\n    API->>DB: deduct BOM from lots, oldest lot first\n    API-->>Fac: 409 STOCK_SHORT if a material is short\n    Fac->>API: POST /orders/:id/progress  (repeat per process)\n    Note over API: order status is computed:<br/>Draft, In Progress, Completed\n    Adm->>API: POST /invoices  (order Completed)\n    API->>DB: snapshot invoice INV-yyyy-0001, lock progress\n    Adm->>API: POST /invoices/:id/payment  (amount = total)\n    API->>DB: Payment, status Paid, Receipt RC-yyyy-0001" },
      { heading: "Purchase flow" },
      { chart: "sequenceDiagram\n    actor U as Factory Worker / Admin\n    participant API\n    participant DB\n\n    U->>API: GET /materials?status=Low\n    U->>API: POST /purchase-orders  (supplier, date, lines)\n    API->>DB: PO-yyyy-0001 Draft, price from supplier item\n    U->>API: POST /purchase-orders/:id/status  { Sent }\n    U->>API: POST /purchase-orders/:id/status  { Received, lots[] }\n    API->>DB: Add stock per line (once only), link purchaseOrderId\n    U->>API: POST /purchase-orders/:id/payment  (amount = total)\n    U->>API: POST /attachments  (ownerType PurchaseOrder)" },
    ],
  },
  {
    title: "5. Order and invoice states",
    blocks: [
      { chart: "stateDiagram-v2\n    [*] --> QT_Draft\n    QT_Draft --> QT_Confirmed: POST /qt/:id/confirm (once)\n    QT_Confirmed --> Order_Draft: order created\n\n    state \"Order Draft\" as Order_Draft\n    Order_Draft --> Order_Started: POST start (deducts stock)\n    Order_Started --> Order_InProgress: first process moves\n    Order_InProgress --> Order_Completed: every process Completed\n\n    Order_Completed --> Invoice_Unpaid: POST /invoices\n    Invoice_Unpaid --> Invoice_Paid: POST payment (amount = total)\n    Invoice_Paid --> [*]: receipt issued" },
    ],
  },
  {
    title: "6. Data model (tables)",
    blocks: [
      { chart: "erDiagram\n    User ||--o{ ProgressEntry : writes\n    User ||--o{ StockChange : makes\n    User ||--o{ Attachment : uploads\n    Customer ||--o{ QtReference : has\n    Customer ||--o{ ProductionOrder : orders\n    QtReference ||--o{ QtLine : contains\n    Product ||--o{ QtLine : quoted\n    QtReference ||--o| ProductionOrder : \"confirm creates\"\n    ProductionOrder ||--|{ OrderLine : contains\n    Product ||--o{ OrderLine : ordered\n    OrderLine ||--|{ OrderProcess : \"made by\"\n    OrderProcess ||--o{ ProgressEntry : records\n    Product ||--o{ ProductBom : needs\n    Material ||--o{ ProductBom : \"used in\"\n    Material ||--o{ MaterialLot : \"kept in\"\n    Material ||--o{ StockChange : history\n    ProductionOrder o|--o{ StockChange : \"start deducts\"\n    ProductionOrder ||--o| Invoice : \"billed by\"\n    Invoice ||--|{ InvoiceLine : contains\n    Invoice ||--o| Payment : \"paid by\"\n    Invoice ||--o| Receipt : \"proved by\"\n    Supplier ||--o{ SupplierMaterial : sells\n    Material ||--o{ SupplierMaterial : \"sold by\"\n    Supplier ||--o{ PurchaseOrder : receives\n    PurchaseOrder ||--|{ PurchaseOrderLine : contains\n    Material ||--o{ PurchaseOrderLine : \"bought as\"\n    PurchaseOrder ||--o| PurchasePayment : \"paid by\"\n    PurchaseOrder o|--o{ StockChange : \"received adds\"" },
      { text: "`Attachment` points to its owner (`QtReference` or `ProductionOrder`) by `ownerType` + `ownerId`, with no database foreign key." },
    ],
  },
  {
    title: "7. Error codes",
    blocks: [
      { table: { head: ["HTTP", "`error`", "Typical cause"], align: ["right", "left", "left"], rows: [
        ["400", "`VALIDATION_ERROR`", "`errors: [{ path, code }]`, codes `REQUIRED`, `INVALID`, `INVALID_DATE`, `DUPLICATE`, `TOO_SHORT`, `TOO_HIGH`, `MUST_EQUAL_TOTAL`, `FILE_TYPE`, `FILE_TOO_BIG` ..."],
        ["401", "`UNAUTHORIZED`, `INVALID_CREDENTIALS`", "No / bad / old token; wrong login"],
        ["403", "`FORBIDDEN`, `COMPLETED_LOCKED`", "Role or department not allowed"],
        ["404", "`NOT_FOUND`", "No such record"],
        ["409", "`DUPLICATE_VALUE`", "Unique `code`, `email`, `qtNumber` used"],
        ["409", "`IN_USE`", "Delete of a used record; `errors: [{ kind, count, items }]`"],
        ["409", "`STOCK_SHORT`, `STOCK_NEGATIVE`, `LOT_NOT_FOUND`", "Stock rules"],
        ["409", "`QT_LOCKED`, `ORDER_LOCKED`, `ALREADY_STARTED`, `ORDER_NOT_READY`, `ORDER_NOT_STARTED`, `ORDER_INVOICED`", "Order / QT lifecycle"],
        ["409", "`PO_LOCKED`, `INVALID_STATUS_CHANGE`, `PO_NOT_RECEIVED`", "Purchase order lifecycle (`ALREADY_PAID` also covers a PO)"],
        ["400", "`SUPPLIER_INACTIVE`, `NOT_SOLD_BY_SUPPLIER` (codes inside `VALIDATION_ERROR`)", "Purchase order lines"],
        ["409", "`ORDER_NOT_COMPLETED`, `INVOICE_EXISTS`, `ALREADY_PAID`, `FILE_LOCKED`", "Accounting and files"],
        ["429", "`TOO_MANY_REQUESTS`", "Login rate limit"],
        ["500", "`INTERNAL_SERVER_ERROR`", "Unexpected failure"],
      ] } },
    ],
  },
  {
    title: "8. Tests",
    blocks: [
      { text: "`cd backend && pnpm test` runs integration tests (Node test runner) that call the real Express app over HTTP against a separate database, `kanou_mini_erp_test` (made from `DATABASE_URL` with `_test` added; the tests refuse to run on any other name, because they empty every table). The schema is pushed by `test-support/setup-db.js` first." },
      { table: { head: ["File", "Covers"], rows: [
        ["`test/auth.test.js`", "login, `/me`, logout, sessions ended by a new password, rate limit, 401 on every module"],
        ["`test/master.test.js`", "customers, products with BOM, users: validation, search, paging, roles, `IN_USE`, duplicates"],
        ["`test/stock.test.js`", "materials, lots, status, stock changes (Add / Deduct / Adjust), history, movements, delete rules"],
        ["`test/sale.test.js`", "QT, Confirm QT, files (PO copy to the order), production orders, start (stock deduction), progress rules"],
        ["`test/accounting.test.js`", "invoices (snapshot), payment, receipts, dashboard"],
        ["`test/purchase.test.js`", "suppliers, purchase orders, status path, receiving (stock once), payment, files, in-use rules"],
      ] } },
    ],
  },
  {
    title: "9. Status",
    blocks: [
      { text: "All endpoints above are implemented in `backend/src` and covered by the tests. The development database `kanou_mini_erp` still has to be created with `pnpm run db:setup` (users `admin@gmail.com` / `admin`, `worker@gmail.com` / `worker`, `sale@gmail.com` / `sale`)." },
    ],
  },
];
