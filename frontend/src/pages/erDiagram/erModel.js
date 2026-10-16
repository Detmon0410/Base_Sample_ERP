/**
 * The ER diagram of the page /master/er-diagram and of its PDF. It is **ProjectdocInfo/ER Diagram.md**, written as data: the same
 * tables, columns (in the same order), keys, notes, relationships, ends and labels. erModel.test.js reads the .md and fails when the
 * two differ, so a change of the diagram starts in the .md.
 *
 * A column: [name, type, keys, note]. `keys` is "PK", "FK", "UK" or "FK,UK"; `note` is the comment of the .md ("Admin | Worker").
 * `x`, `y` place the table on the drawing (the size comes from the columns, see erLayout.js).
 */
export const ENTITIES = [
  {
    name: "USER",
    x: 1060,
    y: 520,
    columns: [
      ["id", "int", "PK"],
      ["name", "string"],
      ["department", "string"],
      ["email", "string", "UK"],
      ["password_hash", "string"],
      ["role", "string", "", "Admin | Worker"],
      ["last_login_at", "datetime"],
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
    name: "PRODUCT",
    x: 1060,
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
    x: 1400,
    y: 220,
    columns: [
      ["id", "int", "PK"],
      ["code", "string", "UK"],
      ["name", "string"],
      ["min_level", "decimal", "", "optional"],
    ],
  },
  {
    name: "PRODUCT_BOM",
    x: 1060,
    y: 220,
    columns: [
      ["product_id", "int", "FK"],
      ["material_id", "int", "FK"],
      ["quantity", "decimal"],
    ],
  },
  {
    name: "MATERIAL_LOT",
    x: 1400,
    y: 410,
    columns: [
      ["material_id", "int", "FK"],
      ["lot_number", "string", "", "UK with material_id"],
      ["quantity", "decimal"],
    ],
  },
  {
    name: "STOCK_CHANGE",
    x: 1400,
    y: 580,
    columns: [
      ["id", "int", "PK"],
      ["material_id", "int", "FK"],
      ["lot_number", "string"],
      ["kind", "string", "", "Add | Deduct | Adjust"],
      ["change", "decimal"],
      ["balance", "decimal"],
      ["change_date", "date"],
      ["note", "string"],
      ["initial", "bool"],
      ["order_id", "int", "FK", "optional"],
      ["user_id", "int", "FK"],
      ["at", "datetime"],
    ],
  },
  {
    name: "QT_REFERENCE",
    x: 40,
    y: 240,
    columns: [
      ["id", "int", "PK"],
      ["qt_number", "string", "UK"],
      ["qt_date", "date"],
      ["customer_id", "int", "FK"],
      ["notes", "string"],
      ["file_name", "string"],
      ["file_type", "string"],
      ["file_path", "string"],
    ],
  },
  {
    name: "PRODUCTION_ORDER",
    x: 380,
    y: 60,
    columns: [
      ["id", "int", "PK"],
      ["order_number", "string", "UK"],
      ["qt_id", "int", "FK"],
      ["customer_id", "int", "FK"],
      ["order_date", "date"],
      ["notes", "string"],
      ["started_at", "datetime", "", "null until started"],
    ],
  },
  {
    name: "ORDER_LINE",
    x: 720,
    y: 40,
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
    x: 720,
    y: 240,
    columns: [
      ["id", "int", "PK"],
      ["line_id", "int", "FK"],
      ["sequence", "int"],
      ["name", "string"],
      ["instructions", "string"],
      ["status", "string", "", "Not Started | In Progress | Completed"],
      ["completed_quantity", "int"],
    ],
  },
  {
    name: "PROGRESS_ENTRY",
    x: 720,
    y: 490,
    columns: [
      ["id", "int", "PK"],
      ["process_id", "int", "FK"],
      ["status", "string"],
      ["completed_quantity", "int"],
      ["work_date", "date"],
      ["note", "string"],
      ["user_id", "int", "FK"],
      ["at", "datetime"],
    ],
  },
  {
    name: "INVOICE",
    x: 380,
    y: 310,
    columns: [
      ["id", "int", "PK"],
      ["invoice_number", "string", "UK"],
      ["invoice_date", "date"],
      ["order_id", "int", "FK,UK"],
      ["customer_name", "string", "", "snapshot"],
      ["customer_address", "string", "", "snapshot"],
      ["total", "int"],
      ["status", "string", "", "Unpaid | Paid"],
    ],
  },
  {
    name: "INVOICE_LINE",
    x: 40,
    y: 500,
    columns: [
      ["invoice_id", "int", "FK"],
      ["product_code", "string", "", "snapshot"],
      ["product_name", "string", "", "snapshot"],
      ["quantity", "int"],
      ["unit_price", "int"],
      ["amount", "int"],
    ],
  },
  {
    name: "PAYMENT",
    x: 380,
    y: 600,
    columns: [
      ["invoice_id", "int", "FK,UK"],
      ["payment_date", "date"],
      ["amount", "int"],
    ],
  },
  {
    name: "RECEIPT",
    x: 380,
    y: 750,
    columns: [
      ["id", "int", "PK"],
      ["receipt_number", "string", "UK"],
      ["invoice_id", "int", "FK,UK"],
      ["receipt_date", "date"],
      ["customer_name", "string", "", "snapshot"],
      ["customer_address", "string", "", "snapshot"],
      ["amount", "int"],
    ],
  },
];

/**
 * The relationships of the .md, in its order. `parent` is the left side, `child` the right side and holds the foreign key `fk`.
 * The ends: "one" (||), "zeroOne" (o|), "oneMany" (|{), "zeroMany" (o{). `label` is the label of the .md.
 * `route` says how the line is drawn (erLayout.js): from a side of the parent to a side of the child; `lane` is the x of the vertical
 * part, `via` the corners of a longer line, `fromY` / `toX` move the end off the row of the key. `labelAt` places the label when the
 * middle of the longest part is taken.
 */
export const RELATIONSHIPS = [
  { parent: "CUSTOMER", child: "QT_REFERENCE", fk: "customer_id", parentEnd: "one", childEnd: "zeroMany", label: "has", route: { from: "bottom", to: "top" } },
  { parent: "CUSTOMER", child: "PRODUCTION_ORDER", fk: "customer_id", parentEnd: "one", childEnd: "zeroMany", label: "orders", route: { from: "right", to: "top", toX: 420, via: [[315, 78], [315, 30], [420, 30]] } },
  { parent: "QT_REFERENCE", child: "PRODUCTION_ORDER", fk: "qt_id", parentEnd: "one", childEnd: "zeroMany", label: "origin of", route: { from: "right", to: "left", lane: 345 } },
  { parent: "PRODUCTION_ORDER", child: "ORDER_LINE", fk: "order_id", parentEnd: "one", childEnd: "oneMany", label: "contains", route: { from: "right", to: "left" } },
  { parent: "PRODUCT", child: "ORDER_LINE", fk: "product_id", parentEnd: "one", childEnd: "zeroMany", label: "ordered as", labelAt: [1015, 98], route: { from: "left", to: "right", lane: 1015 } },
  { parent: "ORDER_LINE", child: "ORDER_PROCESS", fk: "line_id", parentEnd: "one", childEnd: "oneMany", label: "is made by", route: { from: "bottom", to: "top" } },
  { parent: "ORDER_PROCESS", child: "PROGRESS_ENTRY", fk: "process_id", parentEnd: "one", childEnd: "zeroMany", label: "records", route: { from: "bottom", to: "top" } },
  { parent: "USER", child: "PROGRESS_ENTRY", fk: "user_id", parentEnd: "one", childEnd: "zeroMany", label: "writes", route: { from: "left", to: "right", lane: 1015 } },
  { parent: "PRODUCT", child: "PRODUCT_BOM", fk: "product_id", parentEnd: "one", childEnd: "zeroMany", label: "needs", route: { from: "bottom", to: "top" } },
  { parent: "MATERIAL", child: "PRODUCT_BOM", fk: "material_id", parentEnd: "one", childEnd: "zeroMany", label: "used in", labelAt: [1355, 268], route: { from: "left", to: "right", lane: 1355 } },
  { parent: "MATERIAL", child: "MATERIAL_LOT", fk: "material_id", parentEnd: "one", childEnd: "zeroMany", label: "kept in", route: { from: "bottom", to: "top" } },
  { parent: "MATERIAL", child: "STOCK_CHANGE", fk: "material_id", parentEnd: "one", childEnd: "zeroMany", label: "history", route: { from: "right", to: "right", lane: 1685 } },
  { parent: "USER", child: "STOCK_CHANGE", fk: "user_id", parentEnd: "one", childEnd: "zeroMany", label: "makes", route: { from: "right", to: "left", lane: 1365 } },
  { parent: "PRODUCTION_ORDER", child: "STOCK_CHANGE", fk: "order_id", parentEnd: "zeroOne", childEnd: "zeroMany", label: "start deducts", route: { from: "right", fromY: 230, to: "bottom", via: [[705, 230], [705, 960], [1525, 960]] } },
  { parent: "PRODUCTION_ORDER", child: "INVOICE", fk: "order_id", parentEnd: "one", childEnd: "zeroOne", label: "billed by", route: { from: "bottom", to: "top" } },
  { parent: "INVOICE", child: "INVOICE_LINE", fk: "invoice_id", parentEnd: "one", childEnd: "oneMany", label: "contains", route: { from: "left", to: "right", lane: 335 } },
  { parent: "INVOICE", child: "PAYMENT", fk: "invoice_id", parentEnd: "one", childEnd: "zeroOne", label: "paid by", route: { from: "bottom", to: "top" } },
  { parent: "INVOICE", child: "RECEIPT", fk: "invoice_id", parentEnd: "one", childEnd: "zeroOne", label: "proved by", route: { from: "right", to: "right", lane: 660 } },
];

/** The "Notes" of the .md, in its order: written under the diagram and in the PDF. */
export const NOTE_KEYS = ["snapshot", "oneInvoice", "computedOrderStatus", "computedStockStatus"];
