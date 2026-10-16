/**
 * The tables of ProjectdocInfo/DB Relations.md, word for word. The ER diagram page (and its PDF) shows what the drawing does not:
 * the delete rule of each foreign key, the unique keys that say more than "UK" (UNIQUE_DETAILS) and the rules across tables. The
 * "Chain of one sale" of the .md is left out: the drawing shows the same tables and lines. The cells keep the `code` marks of the .md;
 * the page shows them as code and the PDF leaves them out. dbRelations.test.js reads the .md and fails when the two differ, so a
 * change starts in the .md. The words are English in both languages, as in the .md.
 */

/** ## Foreign keys: [table, column, references, cardinality, delete rule]. */
export const FOREIGN_KEYS = [
  ["QtReference", "customer_id", "Customer.id", "many to one", "customer in use -> `409 IN_USE`"],
  ["ProductionOrder", "qt_id", "QtReference.id", "many to one", "QT used by an order -> `409 IN_USE`"],
  ["ProductionOrder", "customer_id", "Customer.id", "many to one", "customer in use -> `409 IN_USE`"],
  ["OrderLine", "order_id", "ProductionOrder.id", "many to one", "goes with the order"],
  ["OrderLine", "product_id", "Product.id", "many to one", "product in use -> `409 IN_USE`"],
  ["OrderProcess", "line_id", "OrderLine.id", "many to one", "goes with the line"],
  ["ProgressEntry", "process_id", "OrderProcess.id", "many to one", "never deleted"],
  ["ProgressEntry", "user_id", "User.id", "many to one", "user with history -> `409 IN_USE`"],
  ["ProductBom", "product_id", "Product.id", "many to one", "goes with the product"],
  ["ProductBom", "material_id", "Material.id", "many to one", "material in a BOM -> `409 IN_USE`"],
  ["MaterialLot", "material_id", "Material.id", "many to one", "goes with the material"],
  ["StockChange", "material_id", "Material.id", "many to one", "material with a non-initial change cannot be deleted"],
  ["StockChange", "order_id", "ProductionOrder.id", "many to one, optional", "set when the start of an order deducts stock"],
  ["StockChange", "user_id", "User.id", "many to one", "never deleted"],
  ["Invoice", "order_id", "ProductionOrder.id", "one to one", "one invoice per order"],
  ["InvoiceLine", "invoice_id", "Invoice.id", "many to one", "goes with the invoice"],
  ["Payment", "invoice_id", "Invoice.id", "one to one", "one full payment per invoice"],
  ["Receipt", "invoice_id", "Invoice.id", "one to one", "one receipt per invoice"],
];

/** ## Unique keys: [table, unique]. */
export const UNIQUE_KEYS = [
  ["User", "email (lower-cased)"],
  ["Product", "code"],
  ["Material", "code"],
  ["MaterialLot", "(material_id, lot_number)"],
  ["QtReference", "qt_number"],
  ["ProductionOrder", "order_number (`ORD-yyyy-0001`, given by the server)"],
  ["Invoice", "invoice_number, order_id"],
  ["Payment", "invoice_id"],
  ["Receipt", "receipt_number, invoice_id"],
];

/** ## Lifecycle rules that touch several tables: [event, tables written, rule]. */
export const CROSS_TABLE_RULES = [
  ["Start production (`POST /orders/:id/start`)", "ProductionOrder.started_at, MaterialLot, StockChange", "Deducts the BOM of every line, oldest lot first. `409 STOCK_SHORT` if a material is short. Locks products and processes"],
  ["Progress entry", "ProgressEntry, OrderProcess", "Updates the status and completed quantity of the process. An order is Completed when all processes are"],
  ["Issue invoice", "Invoice, InvoiceLine", "Only for a Completed order, once. Copies the data (snapshot). Locks the progress of the order"],
  ["Pay invoice", "Payment, Invoice.status, Receipt", "Payment date and amount must equal the total (`MUST_EQUAL_TOTAL`). Sets `Paid` and issues one receipt"],
  ["Manual stock change", "MaterialLot, StockChange", "`Add`, `Deduct` or `Adjust` a lot at any time. The history is never changed or deleted"],
];


/** The name of a table of DB Relations.md (QtReference) as the ER diagram writes it (QT_REFERENCE). */
export const erName = (table) => table.replace(/(?!^)([A-Z])/g, "_$1").toUpperCase();

/** The row of FOREIGN_KEYS of one relationship of the ER diagram: the same child table and column. */
export const foreignKeyOf = (relationship) => FOREIGN_KEYS.find(([table, column]) => erName(table) === relationship.child && column === relationship.fk);

/** A cell without the `code` marks of the .md (the PDF). */
export const plain = (text) => text.replace(/`/g, "");

/**
 * The unique keys that say more than the UK of the drawing, as "Table.column (detail)": "User.email (lower-cased)". A key of two
 * columns is left out (the drawing has it as the note "UK with material_id"), and so is a key with no detail.
 */
export const UNIQUE_DETAILS = UNIQUE_KEYS.filter(([, unique]) => !unique.startsWith("(") && unique.includes("(")).map(([table, unique]) => `${table}.${unique}`);
