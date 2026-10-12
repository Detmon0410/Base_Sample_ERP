# API - Receipts

Pages: `/receipts`, `/receipts/:id` (the group Accounting of the menu, [S5](../specs/s5-accounting-group.md)) · Frontend: `frontend/src/pages/receipts`, `pages/invoices/Documents.jsx`, `services/invoices.service.js` (`receiptsApi`) · Mock: `services/mock/invoices.js`
Conventions: [README.md](README.md) · Admin only (others: `403 FORBIDDEN`) · The payment that makes a receipt: [invoices.md](invoices.md)

A receipt is made **by the full payment of an invoice** (`POST /invoices/:id/payment`), once per invoice. It is never changed or deleted, so there is no `POST`, `PUT` or `DELETE` on `/receipts`.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/receipts` | query `q` (receipt number, customer name, invoice number; contains, case-insensitive), `page`, `pageSize` (20 in the frontend). Newest first. `meta`: `{ page, pageSize, total }` |
| `GET` | `/receipts/:id` | one receipt; `404 NOT_FOUND` when there is none |

The receipt: `{ id, invoiceId, receiptNumber, receiptDate, customerName, customerAddress, invoiceNumber, amount }`

* `receiptNumber` is `RC-yyyy-0001`, unique, given by the server; `receiptDate` is the payment date; `amount` is the payment (= the total of the invoice).
* The customer name and address are the copy kept in the invoice, so later changes of the customer do not change the receipt.
* The same object is `receipt` inside `GET /invoices/:id` (`null` until the payment). `GET /orders/:id` has `invoice.receiptId` and `invoice.receiptNumber` so the order page can link to it.

```text
Receipt(id, receipt_number UNIQUE, invoice_id UNIQUE, receipt_date, customer_name, customer_address, amount)
```

The PDF and the print are made by the frontend ([invoices.md](invoices.md#print-and-pdf)).
