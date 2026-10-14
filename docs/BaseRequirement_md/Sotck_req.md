# Stock Requirement

## Flow

1. Record opening quantities for materials and finished products by warehouse.
2. Show current material quantities by warehouse so users can check what is left.
3. When a user sees that a material is near shortage, they decide whether and how much to buy through Purchase.
4. Receive purchased materials into the raw material warehouse after goods receipt.
5. Issue materials to the WO and record finished products received from Factory.
6. Issue finished products for Sale delivery.

## Flow Diagram

```text
User checks material stock -> Near shortage -> Purchase Order -> Goods receipt
                                                              |
                                                              v
                                                    Raw material stock
                                                              |
                                                              v
                                                  WO material issue
                                                              |
                                                              v
                         Factory output -> Finished goods stock -> Sale delivery
```

## Master Data

- **Material / Product** — code, name, unit of measure, active status
- **Warehouse** — raw material or finished goods location
- **BOM** — material quantity required per product
- **Reorder level** — optional reference quantity to help users spot low stock; it does not create a purchase automatically

## Documents

### Stock Balance

- Item, item type (material or product), warehouse, quantity on hand
- Available quantity = quantity on hand minus quantity reserved for open WOs or deliveries
- Show balances in each item's unit of measure; do not allow negative stock

### Stock Movement

- Movement No., date, item, quantity, unit of measure, from/to warehouse, movement type, source document, recorded by
- Types: Opening Balance, Purchase Receipt, WO Material Issue, Factory Finished Goods Receipt, Sale Delivery, Adjustment
- Each posted movement updates the relevant warehouse balance once; draft or cancelled documents do not change stock
- Keep movement history for traceability. Corrections use a reversing movement or adjustment with a reason

## Rules and Relations

- Users review current quantities and decide when to refill; low stock does not automatically create a request or Purchase Order.
- Goods receipt increases material stock; WO material issue decreases material stock; finished goods receipt increases product stock; Sale delivery decreases product stock.
- Partial receipts and issues update quantities actually moved, leaving the remainder open.
- Purchase owns supplier ordering; Stock confirms received quantities and records the stock movement.

```text
User checks Material Stock -> Purchase Order -> Goods Receipt -> Material Stock
WO -> Material Issue -> Factory -> Finished Goods Receipt -> Product Stock -> Sale Delivery
```
