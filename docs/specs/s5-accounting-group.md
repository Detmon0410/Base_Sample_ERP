# S5 - The Accounting group: Invoices and Receipts as two pages

Status: **DONE.** Asked by the user: "add Accounting"; the answers: a menu group **Accounting**, and in it only **Invoices** and **Receipts** as two separate pages.
Base: S1 and the requirements (5.5 Invoice, 5.6 Payment and Receipt, 7 pages: "Invoices and Receipts").

## What changed

| Before | After |
|---|---|
| one menu entry "Invoices and receipts" and one page that held the invoice, the payment and the receipt | the menu group **Accounting** (経理) with **Invoices** (請求書) and **Receipts** (領収書) |
| the receipt was a block under the payment on the page of the invoice | the receipt has its **own pages**: the list `/receipts` and one receipt `/receipts/:id` |
| the receipt was not found anywhere else | the list of all the receipts, searchable; the order page and the invoice page link to the receipt |

The access does not change: Accounting is for the **Admin** only (the requirements, 3: accounting staff use the Admin role; the department is only a field). A Worker does not see the group.

## The pages

| Page | Route | What it is |
|---|---|---|
| Invoices | `/invoices`, `/invoices/new`, `/invoices/:id` | as before, but the page of an invoice no longer holds the receipt: after the full payment it shows the payment made and a **link to the receipt** |
| Receipts (new) | `/receipts` | the list of every receipt, newest first, 20 a page: number, date, customer, invoice, amount, payment method. Search by receipt number, customer name or invoice number. A click on any cell of a row opens it. No "New": a receipt is made by the payment of an invoice |
| One receipt (new) | `/receipts/:id` | the paper of the receipt, **Download PDF**, **Print**, and the link back to its invoice |

`GET /receipts` and `GET /receipts/:id` (Admin) are new; a receipt now has an `id` and an `invoiceId`. A receipt is never changed or deleted (there is no `POST`, `PUT` or `DELETE`). See [receipts.md](../api/receipts.md).

## Tests

`invoices.test.js` (the receipt calls), `InvoicesFlow.test.jsx` (the invoice page and then the receipt page), `ReceiptsPage.test.jsx` (the list, the search, a click on a row), `navigation.test.js` and `MainLayout.test.jsx` (the menu), `e2e/smoke.spec.js` (every page), and the acceptance case (the receipt is reached from the invoice, downloaded and printed there, found in the list, and linked from the order).
