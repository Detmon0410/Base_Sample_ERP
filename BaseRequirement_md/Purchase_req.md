# Purchase Requirement

## Flow

1. User checks remaining material quantities in Stock.
2. If a material is near shortage, the user decides the refill quantity and reviews open Purchase Orders (POs).
3. Choose a supplier and create a PO to refill stock.
4. Send the PO to the supplier and track its expected delivery.
5. Record goods received against the PO; Stock increases the material balance for accepted quantities.
6. Close the PO when all lines are received, or close the remaining quantity with a reason.

## Flow Diagram

```text
User checks stock -> Near shortage -> Choose refill quantity and supplier
                                                       |
                                                       v
                                                Create and send PO
                                                       |
                                                       v
                                             Receive goods against PO
                                                       |
                                                       v
                                           Stock receipt -> Material stock
```

## Master Data

- **Supplier** — code, name, contact, address, tax ID, payment terms, active status
- **Supplier Material** — which materials a supplier sells, unit price, currency, lead time
- **Material / Unit of Measure** — purchased item and quantity unit
- **Warehouse** — destination for received materials
- **Document Numbering** — running numbers for PO and goods receipt

## Documents

### Purchase Order (PO)

- PO No., date, supplier, buyer, expected delivery date, destination warehouse
- Lines: material, ordered quantity, unit of measure, unit price, amount, received quantity
- Total amount and currency; supplier contact and delivery address
- Status: Draft -> Sent -> Partially Received -> Received -> Closed / Cancelled
- The user can create a PO directly after reviewing stock; no Material Request is required

### Goods Receipt (GR)

- GR No., receipt date, reference PO No., supplier, receiving warehouse, received by
- Lines: PO line, material, quantity delivered, quantity accepted, quantity rejected, rejection reason
- Status: Draft -> Posted / Cancelled
- Only accepted quantity on a posted receipt increases stock. Multiple receipts may fulfill one PO line; cumulative accepted quantity cannot exceed ordered quantity without an approved PO change

## Rules and Relations

- A PO must use an active supplier that supplies the selected material.
- Quantities must be positive; prices cannot be negative. Record the unit and currency used for the order.
- Prevent duplicate posting of the same goods receipt. A cancelled PO cannot receive goods.
- Partial deliveries leave the outstanding PO quantity open. Show open PO quantities beside stock balances to help users avoid duplicate purchases.
- Keep supplier invoices and payment processing in Accounting; the PO and goods receipt provide their references.

```text
User checks Stock -> Purchase Order -> Goods Receipt -> Stock Movement
                         |
                         v
               Accounting supplier invoice
```
