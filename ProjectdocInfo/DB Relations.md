# DB Relations

One file with both versions: **Part 1** is the system as built on branch `mini-erp`; **Part 2** is Version 2.0 (planned): Purchase ([Purchase Logic Draft2](../docs/Purchase%20Logic%20Draft2.md)), QT Upgrade 2.0 ([doc](../docs/QT%20Upgrade%202.0.md)) and User Version 2.0 ([doc](../docs/User%20Version%202.0.md)).

## Part 1: Current version (as built)

Table-by-table list of keys, relations and delete rules. The diagram is in [ER Diagram, Part 1](ER%20Diagram.md#part-1-current-version-as-built). Source: [docs/api](../docs/api/README.md) (`master-data.md`, `stock.md`, `qt.md`, `orders.md`, `invoices.md`, `receipts.md`).

### Foreign keys

| Table | Column | References | Cardinality | Delete rule |
|---|---|---|---|---|
| QtReference | customer_id | Customer.id | many to one | customer in use -> `409 IN_USE` |
| ProductionOrder | qt_id | QtReference.id | many to one | QT used by an order -> `409 IN_USE` |
| ProductionOrder | customer_id | Customer.id | many to one | customer in use -> `409 IN_USE` |
| OrderLine | order_id | ProductionOrder.id | many to one | goes with the order |
| OrderLine | product_id | Product.id | many to one | product in use -> `409 IN_USE` |
| OrderProcess | line_id | OrderLine.id | many to one | goes with the line |
| ProgressEntry | process_id | OrderProcess.id | many to one | never deleted |
| ProgressEntry | user_id | User.id | many to one | user with history -> `409 IN_USE` |
| ProductBom | product_id | Product.id | many to one | goes with the product |
| ProductBom | material_id | Material.id | many to one | material in a BOM -> `409 IN_USE` |
| MaterialLot | material_id | Material.id | many to one | goes with the material |
| StockChange | material_id | Material.id | many to one | material with a non-initial change cannot be deleted |
| StockChange | order_id | ProductionOrder.id | many to one, optional | set when the start of an order deducts stock |
| StockChange | user_id | User.id | many to one | never deleted |
| Invoice | order_id | ProductionOrder.id | one to one | one invoice per order |
| InvoiceLine | invoice_id | Invoice.id | many to one | goes with the invoice |
| Payment | invoice_id | Invoice.id | one to one | one full payment per invoice |
| Receipt | invoice_id | Invoice.id | one to one | one receipt per invoice |

### Unique keys

| Table | Unique |
|---|---|
| User | email (lower-cased) |
| Product | code |
| Material | code |
| MaterialLot | (material_id, lot_number) |
| QtReference | qt_number |
| ProductionOrder | order_number (`ORD-yyyy-0001`, given by the server) |
| Invoice | invoice_number, order_id |
| Payment | invoice_id |
| Receipt | receipt_number, invoice_id |

### Lifecycle rules that touch several tables

| Event | Tables written | Rule |
|---|---|---|
| Start production (`POST /orders/:id/start`) | ProductionOrder.started_at, MaterialLot, StockChange | Deducts the BOM of every line, oldest lot first. `409 STOCK_SHORT` if a material is short. Locks products and processes |
| Progress entry | ProgressEntry, OrderProcess | Updates the status and completed quantity of the process. An order is Completed when all processes are |
| Issue invoice | Invoice, InvoiceLine | Only for a Completed order, once. Copies the data (snapshot). Locks the progress of the order |
| Pay invoice | Payment, Invoice.status, Receipt | Payment date and amount must equal the total (`MUST_EQUAL_TOTAL`). Sets `Paid` and issues one receipt |
| Manual stock change | MaterialLot, StockChange | `Add`, `Deduct` or `Adjust` a lot at any time. The history is never changed or deleted |

### Chain of one sale

```text
Customer -> QtReference -> ProductionOrder -> OrderLine -> OrderProcess -> ProgressEntry
                                  |                |
                                  |                +-> Product -> ProductBom -> Material -> MaterialLot / StockChange
                                  v
                               Invoice -> InvoiceLine
                                  |
                                  +-> Payment -> Receipt
```

---

## Part 2: Version 2.0 (planned)

Keys, relations and rules after the Purchase, QT 2.0 and User 2.0 changes. Only the **new or changed** rows are listed; everything else stays as in [Part 1](#part-1-current-version-as-built). The diagram is in [ER Diagram, Part 2](ER%20Diagram.md#part-2-version-20-planned).

### New foreign keys

| Table | Column | References | Cardinality | Delete rule |
|---|---|---|---|---|
| SupplierMaterial | supplier_id | Supplier.id | many to one | goes with the supplier |
| SupplierMaterial | material_id | Material.id | many to one | material sold by a supplier -> `409 IN_USE` |
| PurchaseOrder | supplier_id | Supplier.id | many to one | supplier with a PO -> `409 IN_USE` |
| PurchaseOrder | created_by | User.id | many to one | user with history -> `409 IN_USE` |
| PurchaseOrderLine | po_id | PurchaseOrder.id | many to one | goes with the PO; only a `Draft` PO can be deleted |
| PurchaseOrderLine | material_id | Material.id | many to one | material on a PO -> `409 IN_USE` |
| PurchasePayment | po_id | PurchaseOrder.id | one to one | one payment per PO |
| StockChange | purchase_order_id | PurchaseOrder.id | many to one, optional | set when a PO is received |
| QtLine | qt_id | QtReference.id | many to one | goes with the QT; only a `Draft` QT can be deleted |
| QtLine | product_id | Product.id | many to one | product on a QT -> `409 IN_USE` |
| QtReference | production_order_id | ProductionOrder.id | one to one, optional | set when the QT is confirmed |
| Attachment | uploaded_by | User.id | many to one | never deleted |
| Attachment | (owner_type, owner_id) | PurchaseOrder, QtReference or ProductionOrder | many to one, **no database key** | goes with the owner (service deletes the file too) |

### Changed columns

| Table | Change |
|---|---|
| QtReference | adds `status` (`Draft`, `Confirmed`), `customer_po_number`, `customer_po_date`, `production_order_id`; drops `file_name`, `file_type`, `file_path` (moved to Attachment) |
| Material | adds `unit` |
| User | rule: `role = Worker` needs `department` in (`Sales`, `Factory`) |

### Unique keys

| Table | Unique |
|---|---|
| Supplier | code |
| SupplierMaterial | (supplier_id, material_id) |
| PurchaseOrder | po_number |
| PurchasePayment | po_id |
| QtReference | qt_number, production_order_id |

### Lifecycle rules that touch several tables

| Event | Tables written | Rule |
|---|---|---|
| Create PO | PurchaseOrder, PurchaseOrderLine | Status `Draft`. Only materials of the chosen supplier (`SupplierMaterial`) can be picked. Unit price starts from `SupplierMaterial.unit_price`, the user can change it. `total` = sum of line amounts |
| Edit PO | PurchaseOrderLine | Lines change only in `Draft` |
| Change PO status | PurchaseOrder | `Draft` -> `Sent` -> `Received`, one step forward, by hand |
| Receive PO | PurchaseOrder.received_at, MaterialLot, StockChange | Adds each line to a lot as a stock change `Add` linked by `purchase_order_id`. **Once only**: a second `Received` does not add again |
| Pay PO | PurchasePayment | Needs status `Received`. One payment per PO |
| Upload file | Attachment | Kinds `PO_FILE`, `QUOTATION`, `EVIDENCE`, `OTHER`. PDF, PNG or JPG, up to 10 MB. A new `PO_FILE` replaces the old one |
| Confirm QT | QtReference.status, ProductionOrder, OrderLine, QtReference.production_order_id | Needs a customer and at least one line. Creates one Draft Factory Order from the QT lines. Once only. The customer PO file is attached to the order. Locks the QT lines |
| Start production | as before | Unchanged |

### Chain of the new flows

```text
Purchase: Supplier -> SupplierMaterial -> PurchaseOrder -> PurchaseOrderLine
                                              |-> PurchasePayment
                                              |-> Attachment
                                              '-> StockChange -> MaterialLot   (on Received)

Sale:     Customer -> QtReference -> QtLine -> (Confirm) -> ProductionOrder -> OrderLine -> ...
                          '-> Attachment (QT form, customer PO)
```
