# Overall Requirement — ERP

## Modules & Flow

### Sale

- Create Quotation (QT) and Sale Order (SO) from customer
- Deliver the product

### Factory

- Create Work Order (WO) from Sale SO
- Send finished product to Sale for delivery

### Stock

- Manage Product and stock quantities (Math)

### Purchase

- Buy Math (materials) to refill stock

### Accounting

- Basic accounting
- Issue Invoice, paid when Purchase succeeds

## Flow Diagram

```text
Customer
   |
   v
Sale (QT -> SO)
   |
   v
Factory (WO from SO)
   |
   v
Stock (Product / Math)
   |
   v
Purchase (refill Math)
   |
   v
Accounting (Invoice on Purchase success)
   |
   v
Sale (Delivery)
```
