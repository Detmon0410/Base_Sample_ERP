# API — Invoices and payment

Pages: `/invoices`, `/invoices/new`, `/invoices/:id` (the group Accounting of the menu; the receipts have their own pages: [receipts.md](receipts.md)) · Frontend: `frontend/src/pages/invoices`, `services/invoices.service.js`, `utils/print.js` · Mock: `services/mock/invoices.js`
Conventions: [README.md](README.md) · Admin only (others: `403 FORBIDDEN`) · No tax anywhere · JPY, whole yen

| Method | Path | Notes |
|---|---|---|
| `GET` | `/invoices` | query `q` (invoice number, customer name, order number), `status` (`Unpaid`, `Paid`), `page`, `pageSize` |
| `GET` | `/invoices/:id` | the invoice with its payment and receipt |
| `POST` | `/invoices` | `201`. Body `{ "orderId": 4, "invoiceDate": "2026-10-04" }` |
| `POST` | `/invoices/:id/payment` | the full payment. Body `{ "paymentDate": "2026-10-10", "amount": 9000 }` |

There is no `PUT` and no `DELETE`: an issued invoice, its payment and its receipt are never changed or deleted.

## The invoice

`{ id, invoiceNumber, invoiceDate, orderId, orderNumber, customerName, customerAddress, lines, total, status, payment, receipt, createdAt }`

* `invoiceNumber` is `INV-yyyy-0001`, unique, given by the server.
* It is a **snapshot** made when it is issued: `lines[]` = `{ productCode, productName, quantity, unitPrice, amount }` and the customer name and address are copied, so later changes of the customer or the products do not change it. `total` = the sum of the `amount`s.
* `status` is `Unpaid` until the payment, then `Paid`. `payment` is `null` or `{ date, amount }`.
* `receipt` is `null` until the payment, then (the same object as `GET /receipts/:id`, see [receipts.md](receipts.md)) `{ id, invoiceId, receiptNumber, receiptDate, customerName, customerAddress, invoiceNumber, amount }`, with `receiptNumber` = `RC-yyyy-0001` (unique) and `receiptDate` = the payment date.

## Rules and errors

| HTTP | `error` | When |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | `orderId`, `invoiceDate`, `paymentDate` missing or not a real date (`REQUIRED`, `INVALID_DATE`); `amount` not a number (`INVALID`); `amount` different from `total` (`MUST_EQUAL_TOTAL`) |
| 409 | `ORDER_NOT_COMPLETED` | The order is not `Completed` |
| 409 | `INVOICE_EXISTS` | The order has an invoice already (one invoice per order) |
| 409 | `ALREADY_PAID` | The invoice is paid already (one full payment per invoice) |

Issuing the invoice locks the order: a progress update of the order answers `409 ORDER_INVOICED` ([orders.md](orders.md)). A payment has no method and no reference or notes.

## Print and PDF

The frontend makes the PDF files itself, so no PDF endpoint is needed: **Download PDF** draws the document of the page in the browser (`html2canvas-pro` and `jsPDF`, loaded only when the button is used) onto A4 pages and saves it as `INV-2026-0001.pdf` or `RC-2026-0001.pdf`. Japanese text is drawn by the browser, so the file needs no font; the text inside the PDF is a picture (it cannot be selected or searched). **Print** opens the print dialog of the browser for the same document. A real backend may later answer `GET /invoices/:id/pdf` and `GET /invoices/:id/receipt/pdf` with a PDF that has real text.

```text
Invoice(id, invoice_number UNIQUE, invoice_date, order_id UNIQUE, customer_name, customer_address, total, status)
InvoiceLine(invoice_id, product_code, product_name, quantity, unit_price, amount)
Payment(invoice_id UNIQUE, payment_date, amount)
Receipt(id, receipt_number UNIQUE, invoice_id UNIQUE, receipt_date, customer_name, customer_address, amount)
```
