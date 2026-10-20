/**
 * The ER diagram of the page /master/er-diagram and of its PDF. It is **ProjectdocInfo/ER Diagram.md**, written as data: the same
 * tables, columns (in the same order), keys, notes, relationships, ends, labels and notes.
 * erLayout.test.js reads the .md and fails when the two differ, so a change of the diagram
 * starts in the .md.
 *
 * A column: [name, type, keys, note]. `keys` is "PK", "FK", "UK" or several ("PK,FK", "FK,UK"); `note` is the comment of the .md.
 * `x`, `y` place the table on the drawing (the size comes from the columns, see erLayout.js).
 */
export const TITLE = "ER Diagram";

export const ENTITIES = [
  {
    name: "USER",
    x: 1090,
    y: 860,
    columns: [
      ["id", "int", "PK"],
      ["name", "string"],
      ["department", "string", "", "Sales | Factory | Accounting | Administration"],
      ["email", "string", "UK"],
      ["password_hash", "string"],
      ["role", "string", "", "Admin | Worker"],
    ],
  },
  {
    name: "CUSTOMER",
    x: 40,
    y: 40,
    columns: [
      ["id", "int", "PK"],
      ["name", "string"],
      ["address", "string"],
      ["email", "string"],
      ["telephone", "string"],
    ],
  },
  {
    name: "SUPPLIER",
    x: 1790,
    y: 40,
    columns: [
      ["id", "int", "PK"],
      ["code", "string", "UK"],
      ["name", "string"],
      ["contact", "string"],
      ["address", "string"],
      ["active", "bool"],
    ],
  },
  {
    name: "SUPPLIER_MATERIAL",
    x: 1440,
    y: 220,
    columns: [
      ["supplier_id", "int", "FK"],
      ["material_id", "int", "FK"],
      ["unit_price", "int", "", "initial price"],
    ],
  },
  {
    name: "PRODUCT",
    x: 1090,
    y: 40,
    columns: [
      ["id", "int", "PK"],
      ["code", "string", "UK"],
      ["name", "string"],
      ["price", "int"],
    ],
  },
  {
    name: "MATERIAL",
    x: 1090,
    y: 420,
    columns: [
      ["id", "int", "PK"],
      ["code", "string", "UK"],
      ["name", "string"],
      ["unit", "string"],
      ["min_level", "decimal"],
    ],
  },
  {
    name: "PRODUCT_BOM",
    x: 1090,
    y: 260,
    columns: [
      ["product_id", "int", "FK"],
      ["material_id", "int", "FK"],
      ["quantity", "decimal"],
    ],
  },
  {
    name: "MATERIAL_LOT",
    x: 1090,
    y: 660,
    columns: [
      ["material_id", "int", "FK"],
      ["lot_number", "string"],
      ["quantity", "decimal"],
    ],
  },
  {
    name: "STOCK_CHANGE",
    x: 1440,
    y: 660,
    columns: [
      ["id", "int", "PK"],
      ["material_id", "int", "FK"],
      ["lot_number", "string"],
      ["kind", "string", "", "Add | Deduct | Adjust"],
      ["change", "decimal"],
      ["balance", "decimal"],
      ["order_id", "int", "FK", "start production"],
      ["purchase_order_id", "int", "FK", "PO received"],
      ["user_id", "int", "FK"],
    ],
  },
  {
    name: "QT_REFERENCE",
    x: 390,
    y: 40,
    columns: [
      ["id", "int", "PK"],
      ["qt_number", "string", "UK"],
      ["qt_date", "date"],
      ["customer_id", "int", "FK"],
      ["status", "string", "", "Draft | Confirmed"],
      ["customer_po_number", "string"],
      ["customer_po_date", "date"],
      ["production_order_id", "int", "FK", "set on confirm"],
      ["notes", "string"],
    ],
  },
  {
    name: "QT_LINE",
    x: 740,
    y: 40,
    columns: [
      ["id", "int", "PK"],
      ["qt_id", "int", "FK"],
      ["product_id", "int", "FK"],
      ["quantity", "int"],
      ["unit_price", "int"],
    ],
  },
  {
    name: "PRODUCTION_ORDER",
    x: 390,
    y: 384,
    columns: [
      ["id", "int", "PK"],
      ["order_number", "string", "UK"],
      ["qt_id", "int", "FK"],
      ["customer_id", "int", "FK"],
      ["order_date", "date"],
      ["started_at", "datetime"],
    ],
  },
  {
    name: "ORDER_LINE",
    x: 740,
    y: 586,
    columns: [
      ["id", "int", "PK"],
      ["order_id", "int", "FK"],
      ["product_id", "int", "FK"],
      ["quantity", "int"],
      ["unit_price", "int"],
    ],
  },
  {
    name: "ORDER_PROCESS",
    x: 740,
    y: 786,
    columns: [
      ["id", "int", "PK"],
      ["line_id", "int", "FK"],
      ["sequence", "int"],
      ["name", "string"],
      ["instructions", "string"],
      ["status", "string"],
      ["completed_quantity", "int"],
    ],
  },
  {
    name: "PROGRESS_ENTRY",
    x: 740,
    y: 1026,
    columns: [
      ["id", "int", "PK"],
      ["process_id", "int", "FK"],
      ["status", "string"],
      ["completed_quantity", "int"],
      ["work_date", "date"],
      ["note", "string"],
      ["user_id", "int", "FK"],
    ],
  },
  {
    name: "PURCHASE_ORDER",
    x: 1790,
    y: 300,
    columns: [
      ["id", "int", "PK"],
      ["po_number", "string", "UK"],
      ["supplier_id", "int", "FK"],
      ["department", "string", "", "Sales | Factory | ..."],
      ["required_date", "date"],
      ["status", "string", "", "Draft | Sent | Received"],
      ["total", "int"],
      ["received_at", "datetime"],
      ["created_by", "int", "FK"],
    ],
  },
  {
    name: "PURCHASE_ORDER_LINE",
    x: 1440,
    y: 400,
    columns: [
      ["id", "int", "PK"],
      ["po_id", "int", "FK"],
      ["material_id", "int", "FK"],
      ["quantity", "decimal"],
      ["unit", "string"],
      ["unit_price", "int"],
      ["amount", "int"],
      ["lot_number", "string", "", "typed when received"],
    ],
  },
  {
    name: "PURCHASE_PAYMENT",
    x: 1790,
    y: 664,
    columns: [
      ["po_id", "int", "FK,UK"],
      ["payment_date", "date"],
      ["amount", "int"],
      ["method", "string"],
      ["reference_no", "string"],
      ["note", "string"],
    ],
  },
  {
    name: "ATTACHMENT",
    x: 740,
    y: 250,
    columns: [
      ["id", "int", "PK"],
      ["owner_type", "string", "", "PurchaseOrder | QtReference | ProductionOrder"],
      ["owner_id", "int"],
      ["kind", "string", "", "PO_FILE | QUOTATION | EVIDENCE | OTHER"],
      ["file_name", "string"],
      ["file_type", "string"],
      ["size", "int"],
      ["file_path", "string"],
      ["uploaded_by", "int", "FK"],
      ["at", "datetime"],
    ],
  },
  {
    name: "INVOICE",
    x: 390,
    y: 664,
    columns: [
      ["id", "int", "PK"],
      ["invoice_number", "string", "UK"],
      ["order_id", "int", "FK,UK"],
      ["total", "int"],
      ["status", "string"],
    ],
  },
  {
    name: "INVOICE_LINE",
    x: 40,
    y: 664,
    columns: [
      ["invoice_id", "int", "FK"],
      ["product_code", "string"],
      ["product_name", "string"],
      ["quantity", "int"],
      ["unit_price", "int"],
      ["amount", "int"],
    ],
  },
  {
    name: "PAYMENT",
    x: 390,
    y: 944,
    columns: [
      ["invoice_id", "int", "FK,UK"],
      ["payment_date", "date"],
      ["amount", "int"],
    ],
  },
  {
    name: "RECEIPT",
    x: 40,
    y: 884,
    columns: [
      ["id", "int", "PK"],
      ["receipt_number", "string", "UK"],
      ["invoice_id", "int", "FK,UK"],
      ["amount", "int"],
    ],
  },
];

/**
 * The relationships of the .md, in its order. `parent` is the left side, `child` the right side; `fk` is the column of the child
 * the line stands for. A line to ATTACHMENT from its owner has no database key (`owner_type` + `owner_id`, as the .md notes): its
 * column is not an FK, and the line is drawn dashed. The ends: "one" (||), "zeroOne" (o|), "oneMany" (|{), "zeroMany" (o{).
 * `route` says how the line is drawn (erLayout.js): from a side of the parent to a side of the child; `lane` is the x of the vertical
 * part, `via` the corners of a longer line, `fromY` / `toX` move an end off the row of the key. `labelAt` places the label when the
 * middle of the longest part is taken. Where two lines must cross, the drawing leaves a gap in one of them (a bridge).
 */
export const RELATIONSHIPS = [
  { parent: "CUSTOMER", child: "QT_REFERENCE", fk: "customer_id", parentEnd: "one", childEnd: "zeroMany", label: "has", route: { from: "right", to: "left", lane: 330 } },
  { parent: "QT_REFERENCE", child: "QT_LINE", fk: "qt_id", parentEnd: "one", childEnd: "oneMany", label: "contains", labelAt: [695, 88], route: { from: "right", to: "left", lane: 695 } },
  { parent: "PRODUCT", child: "QT_LINE", fk: "product_id", parentEnd: "one", childEnd: "zeroMany", label: "quoted as", labelAt: [1060, 98], route: { from: "left", to: "right", lane: 1060 } },
  { parent: "QT_REFERENCE", child: "PRODUCTION_ORDER", fk: "qt_id", parentEnd: "one", childEnd: "zeroOne", label: "confirm creates", route: { from: "bottom", to: "top" } },
  { parent: "CUSTOMER", child: "PRODUCTION_ORDER", fk: "customer_id", parentEnd: "one", childEnd: "zeroMany", label: "orders", route: { from: "right", fromY: 190, to: "left", lane: 350 } },
  { parent: "PRODUCTION_ORDER", child: "ORDER_LINE", fk: "order_id", parentEnd: "one", childEnd: "oneMany", label: "contains", labelAt: [680, 560], route: { from: "right", fromY: 560, to: "left", lane: 710 } },
  { parent: "PRODUCT", child: "ORDER_LINE", fk: "product_id", parentEnd: "one", childEnd: "zeroMany", label: "ordered as", route: { from: "left", fromY: 170, to: "right", lane: 1045 } },
  { parent: "ORDER_LINE", child: "ORDER_PROCESS", fk: "line_id", parentEnd: "one", childEnd: "oneMany", label: "made by", route: { from: "bottom", to: "top" } },
  { parent: "ORDER_PROCESS", child: "PROGRESS_ENTRY", fk: "process_id", parentEnd: "one", childEnd: "zeroMany", label: "records", route: { from: "bottom", to: "top" } },
  { parent: "USER", child: "PROGRESS_ENTRY", fk: "user_id", parentEnd: "one", childEnd: "zeroMany", label: "writes", route: { from: "left", to: "right", lane: 1045 } },
  { parent: "PRODUCT", child: "PRODUCT_BOM", fk: "product_id", parentEnd: "one", childEnd: "zeroMany", label: "needs", route: { from: "bottom", to: "top" } },
  { parent: "MATERIAL", child: "PRODUCT_BOM", fk: "material_id", parentEnd: "one", childEnd: "zeroMany", label: "used in", route: { from: "top", to: "bottom" } },
  { parent: "MATERIAL", child: "MATERIAL_LOT", fk: "material_id", parentEnd: "one", childEnd: "zeroMany", label: "kept in", route: { from: "bottom", to: "top" } },
  { parent: "MATERIAL", child: "STOCK_CHANGE", fk: "material_id", parentEnd: "one", childEnd: "zeroMany", label: "history", route: { from: "right", fromY: 560, to: "left", lane: 1405 } },
  { parent: "SUPPLIER", child: "SUPPLIER_MATERIAL", fk: "supplier_id", parentEnd: "one", childEnd: "zeroMany", label: "sells", route: { from: "left", to: "right", lane: 1745 } },
  { parent: "MATERIAL", child: "SUPPLIER_MATERIAL", fk: "material_id", parentEnd: "one", childEnd: "zeroMany", label: "sold by", route: { from: "right", to: "left", lane: 1395 } },
  { parent: "SUPPLIER", child: "PURCHASE_ORDER", fk: "supplier_id", parentEnd: "one", childEnd: "zeroMany", label: "receives", route: { from: "bottom", to: "top" } },
  { parent: "PURCHASE_ORDER", child: "PURCHASE_ORDER_LINE", fk: "po_id", parentEnd: "one", childEnd: "oneMany", label: "contains", route: { from: "left", to: "right", lane: 1745 } },
  { parent: "MATERIAL", child: "PURCHASE_ORDER_LINE", fk: "material_id", parentEnd: "one", childEnd: "zeroMany", label: "bought as", route: { from: "right", fromY: 478, to: "left" } },
  { parent: "PURCHASE_ORDER", child: "PURCHASE_PAYMENT", fk: "po_id", parentEnd: "one", childEnd: "zeroOne", label: "paid by", route: { from: "bottom", to: "top" } },
  { parent: "PURCHASE_ORDER", child: "STOCK_CHANGE", fk: "purchase_order_id", parentEnd: "zeroOne", childEnd: "zeroMany", label: "received adds", route: { from: "left", fromY: 510, to: "right", lane: 1745 } },
  { parent: "USER", child: "PURCHASE_ORDER", fk: "created_by", parentEnd: "one", childEnd: "zeroMany", label: "creates", route: { from: "right", fromY: 1100, to: "right", via: [[2075, 1100], [2075, 542]] } },
  { parent: "PURCHASE_ORDER", child: "ATTACHMENT", fk: "owner_id", parentEnd: "one", childEnd: "zeroMany", label: "files", route: { from: "right", fromY: 330, to: "right", via: [[2075, 330], [2075, 20], [1025, 20]] } },
  { parent: "QT_REFERENCE", child: "ATTACHMENT", fk: "owner_id", parentEnd: "one", childEnd: "zeroMany", label: "files", route: { from: "right", fromY: 220, to: "top", toX: 780, via: [[780, 220]] } },
  { parent: "PRODUCTION_ORDER", child: "ATTACHMENT", fk: "owner_id", parentEnd: "one", childEnd: "zeroMany", label: "evidence", labelAt: [695, 387], route: { from: "right", to: "left", lane: 695 } },
  { parent: "PRODUCTION_ORDER", child: "INVOICE", fk: "order_id", parentEnd: "one", childEnd: "zeroOne", label: "billed by", route: { from: "bottom", to: "top" } },
  { parent: "INVOICE", child: "INVOICE_LINE", fk: "invoice_id", parentEnd: "one", childEnd: "oneMany", label: "contains", route: { from: "left", to: "right" } },
  { parent: "INVOICE", child: "PAYMENT", fk: "invoice_id", parentEnd: "one", childEnd: "zeroOne", label: "paid by", route: { from: "bottom", to: "top" } },
  { parent: "INVOICE", child: "RECEIPT", fk: "invoice_id", parentEnd: "one", childEnd: "zeroOne", label: "proved by", route: { from: "left", fromY: 860, to: "right", lane: 345 } },
];

/** The "Notes" of the .md, word for word and in its order (the `code` and **bold** marks kept): under the diagram and in the PDF. */
export const NOTES = [
  "`Attachment` is polymorphic (`owner_type` + `owner_id`), so there is no database foreign key to the owner; the service checks it.",
  "`PurchasePayment` is stored on the PO and does not go through the Accounting tables.",
  "`QT_REFERENCE.production_order_id` is unique: one QT creates one Factory Order.",
  "`QtLine` has no stored amount: `quantity x unit_price` is computed by the API. The process, progress and invoice line tables list the columns the code has.",
  "Invoice, Payment and Receipt are unchanged and keep their snapshot fields (not repeated here).",
  "`Order status` (`Draft`, `In Progress`, `Completed`) is **computed** from the processes; it is not a column. The stock status (`Normal`, `Low`, `Out`) is computed from the lot totals and `min_level`.",
  "`Invoice` and `Receipt` copy the customer and the product data when they are issued (a snapshot). An order is billed once, and an invoice has at most one payment and one receipt.",
  "An order is made only by Confirm QT, so `ProductionOrder.qt_id` is always set and each QT has at most one order.",
];

/** The section "What Version 2.0 added" of the .md: its table, word for word. */
export const VERSION_ADDED = {"title": "What Version 2.0 added", "head": ["Source", "Change"], "rows": [["Purchase", "New tables `Supplier`, `SupplierMaterial`, `PurchaseOrder`, `PurchaseOrderLine`, `PurchasePayment`. `StockChange.purchase_order_id` links a received PO to the stock it added"], ["QT 2.0", "`QtReference` gets `status`, `customer_po_number`, `customer_po_date`, `production_order_id`. New `QtLine`. The old QT file and the customer PO file move to `Attachment`"], ["Files", "New `Attachment` table, shared by PO, QT and production order (evidence). Replaces `file_name`, `file_type`, `file_path` on `QtReference`"], ["User 2.0", "No new column. A Worker's `department` must be `Sales` or `Factory` and decides access"], ["Material", "`unit` added (the PO lines need a unit)"]]};

/** A line with no database key (to ATTACHMENT from its owner): its column is not an FK. Drawn dashed. */
export const hasNoKey = (relationship) => {
  const child = ENTITIES.find((entity) => entity.name === relationship.child);
  const column = child.columns.find(([name]) => name === relationship.fk);
  return !(column?.[2] ?? "").split(",").includes("FK");
};
