# DB Relations

Table-by-table list of keys, relations and delete rules. The diagram is in [ER Diagram.md](ER%20Diagram.md). Source: [docs/api](../docs/api/README.md) (`master-data.md`, `stock.md`, `qt.md`, `orders.md`, `invoices.md`, `receipts.md`).

## Foreign keys

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

## Unique keys

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

## Lifecycle rules that touch several tables

| Event | Tables written | Rule |
|---|---|---|
| Start production (`POST /orders/:id/start`) | ProductionOrder.started_at, MaterialLot, StockChange | Deducts the BOM of every line, oldest lot first. `409 STOCK_SHORT` if a material is short. Locks products and processes |
| Progress entry | ProgressEntry, OrderProcess | Updates the status and completed quantity of the process. An order is Completed when all processes are |
| Issue invoice | Invoice, InvoiceLine | Only for a Completed order, once. Copies the data (snapshot). Locks the progress of the order |
| Pay invoice | Payment, Invoice.status, Receipt | Payment date and amount must equal the total (`MUST_EQUAL_TOTAL`). Sets `Paid` and issues one receipt |
| Manual stock change | MaterialLot, StockChange | `Add`, `Deduct` or `Adjust` a lot at any time. The history is never changed or deleted |

## Chain of one sale

```text
Customer -> QtReference -> ProductionOrder -> OrderLine -> OrderProcess -> ProgressEntry
                                  |                |
                                  |                +-> Product -> ProductBom -> Material -> MaterialLot / StockChange
                                  v
                               Invoice -> InvoiceLine
                                  |
                                  +-> Payment -> Receipt
```
