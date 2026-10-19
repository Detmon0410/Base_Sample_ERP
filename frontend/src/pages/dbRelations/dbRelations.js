/**
 * ProjectdocInfo/DB Relations.md as data, word for word: its parts (the summary of the current version, then Part 1 and Part 2), the
 * intro of each part (without the sentences that only point to a document), and every table, list and chain of a part, in order.
 * A section is { title, head, rows } (a table), { title, items } (a list) or { title, chain } (a sketch); a table of the summary
 * has no title. The page /master/db-relations and its PDF show it. The cells keep the `code` and **bold** marks of the .md; the page
 * shows them, the PDF leaves the marks out. dbRelations.test.js reads the .md and fails when the two differ, so a change starts in
 * the .md.
 */
export const TITLE = "DB Relations";

export const PARTS = [
  {
    title: "Current version summary (as built)",
    intro: ["22 tables in 5 groups.", "Parts 1 and 2 below give every key and rule; this is the short form."],
    sections: [
      {
        title: "",
        head: ["Group", "Tables", "Main relations"],
        rows: [
          ["Users and files", "User, Attachment", "Attachment.uploaded_by -> User. Attachment points to its owner (PurchaseOrder, QtReference or ProductionOrder) by `owner_type` + `owner_id`, with no database key"],
          ["Master data", "Customer, Product, Material, MaterialLot, ProductBom, Supplier, SupplierMaterial", "Product -> ProductBom -> Material (a BOM line). Material -> MaterialLot (stock by lot). Supplier -> SupplierMaterial -> Material (what a supplier sells, with its price)"],
          ["Sale", "QtReference, QtLine, ProductionOrder, OrderLine, OrderProcess, ProgressEntry", "Customer -> QtReference -> QtLine -> Product. Confirm QT makes one ProductionOrder (QtReference.production_order_id, one to one). Order -> OrderLine -> OrderProcess -> ProgressEntry (by User)"],
          ["Accounting", "Invoice, InvoiceLine, Payment, Receipt", "One Invoice per ProductionOrder; one Payment and one Receipt per Invoice"],
          ["Purchase and stock", "PurchaseOrder, PurchaseOrderLine, PurchasePayment, StockChange", "Supplier -> PurchaseOrder -> PurchaseOrderLine -> Material. One PurchasePayment per PO. StockChange (material, user, and optionally the order or the PO) is the history of every lot change"],
        ],
      },
      {
        title: "Rules to remember",
        items: [
          "**Delete:** children go with their parent (lines, processes, BOM, lots, supplier items, attachments). Anything else that is referenced answers `409 IN_USE`. Only a `Draft` QT or `Draft` PO can be deleted. Invoices, receipts and stock history are never deleted.",
          "**One to one:** Invoice per order, Payment and Receipt per invoice, PurchasePayment per PO, ProductionOrder per confirmed QT.",
          "**Unique:** User.email, and the codes and numbers of Product, Material, Supplier, QT, order, invoice, receipt and PO; (material, lot number); (supplier, material); (QT, product).",
          "**Status:** QT `Draft` -> `Confirmed`. Order `Draft` -> `In Progress` -> `Completed` (computed). Invoice `Unpaid` -> `Paid`. PO `Draft` -> `Sent` -> `Received`.",
          "**Stock moves** only in StockChange + MaterialLot: Start production deducts the BOM (oldest lot first), Receive PO adds once, and a person can Add, Deduct or Adjust a lot by hand.",
        ],
      },
    ],
  },
  {
    title: "Part 1: The base tables (the Mini ERP before Version 2.0)",
    intro: ["Table-by-table list of keys, relations and delete rules.", "The whole model, as built, is in the ER Diagram.", "The rows of QtReference, Material and User are changed by Part 2 below."],
    sections: [
      {
        title: "Foreign keys",
        head: ["Table", "Column", "References", "Cardinality", "Delete rule"],
        rows: [
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
        ],
      },
      {
        title: "Unique keys",
        head: ["Table", "Unique"],
        rows: [
          ["User", "email (lower-cased)"],
          ["Product", "code"],
          ["Material", "code"],
          ["MaterialLot", "(material_id, lot_number)"],
          ["QtReference", "qt_number"],
          ["ProductionOrder", "order_number (`ORD-yyyy-0001`, given by the server)"],
          ["Invoice", "invoice_number, order_id"],
          ["Payment", "invoice_id"],
          ["Receipt", "receipt_number, invoice_id"],
        ],
      },
      {
        title: "Lifecycle rules that touch several tables",
        head: ["Event", "Tables written", "Rule"],
        rows: [
          ["Start production (`POST /orders/:id/start`)", "ProductionOrder.started_at, MaterialLot, StockChange", "Deducts the BOM of every line, oldest lot first. `409 STOCK_SHORT` if a material is short. Locks products and processes"],
          ["Progress entry", "ProgressEntry, OrderProcess", "Updates the status and completed quantity of the process. An order is Completed when all processes are"],
          ["Issue invoice", "Invoice, InvoiceLine", "Only for a Completed order, once. Copies the data (snapshot). Locks the progress of the order"],
          ["Pay invoice", "Payment, Invoice.status, Receipt", "Payment date and amount must equal the total (`MUST_EQUAL_TOTAL`). Sets `Paid` and issues one receipt"],
          ["Manual stock change", "MaterialLot, StockChange", "`Add`, `Deduct` or `Adjust` a lot at any time. The history is never changed or deleted"],
        ],
      },
      {
        title: "Chain of one sale",
        chain: "Customer -> QtReference -> ProductionOrder -> OrderLine -> OrderProcess -> ProgressEntry\n                                  |                |\n                                  |                +-> Product -> ProductBom -> Material -> MaterialLot / StockChange\n                                  v\n                               Invoice -> InvoiceLine\n                                  |\n                                  +-> Payment -> Receipt",
      },
    ],
  },
  {
    title: "Part 2: Added or changed in Version 2.0 (as built)",
    intro: ["Keys, relations and rules after the Purchase, QT 2.0 and User 2.0 changes.", "Only the **new or changed** rows are listed; everything else stays as in Part 1.", "The order status is `Draft`, `In Progress`, `Completed` (computed; `Draft` replaces `New`).", "An order is made only by Confirm QT."],
    sections: [
      {
        title: "New foreign keys",
        head: ["Table", "Column", "References", "Cardinality", "Delete rule"],
        rows: [
          ["SupplierMaterial", "supplier_id", "Supplier.id", "many to one", "goes with the supplier"],
          ["SupplierMaterial", "material_id", "Material.id", "many to one", "material sold by a supplier -> `409 IN_USE`"],
          ["PurchaseOrder", "supplier_id", "Supplier.id", "many to one", "supplier with a PO -> `409 IN_USE`"],
          ["PurchaseOrder", "created_by", "User.id", "many to one", "user with history -> `409 IN_USE`"],
          ["PurchaseOrderLine", "po_id", "PurchaseOrder.id", "many to one", "goes with the PO; only a `Draft` PO can be deleted"],
          ["PurchaseOrderLine", "material_id", "Material.id", "many to one", "material on a PO -> `409 IN_USE`"],
          ["PurchasePayment", "po_id", "PurchaseOrder.id", "one to one", "one payment per PO"],
          ["StockChange", "purchase_order_id", "PurchaseOrder.id", "many to one, optional", "set when a PO is received"],
          ["QtLine", "qt_id", "QtReference.id", "many to one", "goes with the QT; only a `Draft` QT can be deleted"],
          ["QtLine", "product_id", "Product.id", "many to one", "product on a QT -> `409 IN_USE`"],
          ["QtReference", "production_order_id", "ProductionOrder.id", "one to one, optional", "set when the QT is confirmed"],
          ["Attachment", "uploaded_by", "User.id", "many to one", "never deleted"],
          ["Attachment", "(owner_type, owner_id)", "PurchaseOrder, QtReference or ProductionOrder", "many to one, **no database key**", "goes with the owner (service deletes the file too)"],
        ],
      },
      {
        title: "Changed columns",
        head: ["Table", "Change"],
        rows: [
          ["QtReference", "adds `status` (`Draft`, `Confirmed`), `customer_po_number`, `customer_po_date`, `production_order_id`; drops `file_name`, `file_type`, `file_path` (moved to Attachment)"],
          ["Material", "adds `unit`"],
          ["User", "rule: `role = Worker` needs `department` in (`Sales`, `Factory`)"],
        ],
      },
      {
        title: "Unique keys",
        head: ["Table", "Unique"],
        rows: [
          ["Supplier", "code"],
          ["SupplierMaterial", "(supplier_id, material_id)"],
          ["PurchaseOrder", "po_number"],
          ["PurchasePayment", "po_id"],
          ["QtReference", "qt_number, production_order_id"],
          ["QtLine", "(qt_id, product_id)"],
        ],
      },
      {
        title: "Lifecycle rules that touch several tables",
        head: ["Event", "Tables written", "Rule"],
        rows: [
          ["Create PO", "PurchaseOrder, PurchaseOrderLine", "Status `Draft`. Only materials of the chosen supplier (`SupplierMaterial`) can be picked. Unit price starts from `SupplierMaterial.unit_price`, the user can change it. `total` = sum of line amounts"],
          ["Edit PO", "PurchaseOrderLine", "Lines change only in `Draft`"],
          ["Change PO status", "PurchaseOrder", "`Draft` -> `Sent` -> `Received`, one step forward, by hand"],
          ["Receive PO", "PurchaseOrder.received_at, MaterialLot, StockChange", "Adds each line to a lot as a stock change `Add` linked by `purchase_order_id`. **Once only**: a second `Received` does not add again"],
          ["Pay PO", "PurchasePayment", "Needs status `Received`. One payment per PO"],
          ["Upload file", "Attachment", "Kinds `PO_FILE`, `QUOTATION`, `EVIDENCE`, `OTHER`. PDF, PNG or JPG, up to 10 MB. A new `PO_FILE` replaces the old one"],
          ["Confirm QT", "QtReference.status, ProductionOrder, OrderLine, QtReference.production_order_id", "Needs a customer and at least one line. Creates one Draft Factory Order from the QT lines. Once only. The customer PO file is attached to the order. Locks the QT lines"],
          ["Start production", "as before", "Unchanged"],
        ],
      },
      {
        title: "Chain of the new flows",
        chain: "Purchase: Supplier -> SupplierMaterial -> PurchaseOrder -> PurchaseOrderLine\n                                              |-> PurchasePayment\n                                              |-> Attachment\n                                              '-> StockChange -> MaterialLot   (on Received)\n\nSale:     Customer -> QtReference -> QtLine -> (Confirm) -> ProductionOrder -> OrderLine -> ...\n                          '-> Attachment (QT form, customer PO)",
      },
    ],
  },
];
