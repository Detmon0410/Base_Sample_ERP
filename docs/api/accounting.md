# API — Accounting (C1–C6 and the links with Sale, Purchase, Master data and the Dashboard)

Frontend: [specs/f10-accounting.md](../specs/f10-accounting.md) · mock: `frontend/src/services/mock/accounting.js` · services: `frontend/src/services/accounting.service.js`.
Envelope, auth, paging and error format: see [README.md](README.md). **Every status change is an explicit action called by a person.** The only changes that follow another document: confirming or cancelling a receipt (payment) moves its invoice (bill) between *issued / approved*, *partially paid* and *paid*. **Overdue is never stored**: it is shown (`status = "overdue"`) while `storedStatus` keeps the real one. Every posted money document writes one balanced **journal entry** with the accounts of the system roles.

## Access

| Who | Can |
|---|---|
| Accounting **Worker** | create / edit / delete **their own draft** invoices, bills, receipts, payments and manual entries; cancel their own drafts; **confirm customer receipts**; read everything in Accounting and the master lists |
| Accounting **Manager** and **Admin** | all of the above on anybody's documents, plus `issue` (invoice) and `approve` (bill) — the approval, **confirm supplier payments**, cancel an issued / approved document or a confirmed receipt / payment (reason), `revert`, `post` and `reverse` manual entries, **change the master lists** |
| Anyone else (Sale, Purchase, Factory) | `403 FORBIDDEN` on every `/accounting/*` call and on `/master/accounts`, `taxRates`, `paymentMethods`, `bankAccounts` (the menu is hidden too). Sale and Purchase sheets show the number of the invoice / bill, as a link only for Accounting users |

## Numbers

`INV-2026-0001`, `RC-2026-0001`, `BILL-2026-0001`, `PAY-2026-0001`, `JE-2026-0001`: prefix, year of the document date, 4 digits, per type and year, created by the server on the first save.

## Master lists — C6

The same six calls as every master resource ([master-data.md](master-data.md)): `GET list`, `GET :id`, `POST`, `PUT :id` (the code is fixed), `PATCH :id/status`, `DELETE :id` (`409 IN_USE` when used). **Reading is open to every Accounting user; writing is for the Manager and Admin.**

| Path | Fields (besides `code`, `name`, `status`) | Rules |
|---|---|---|
| `/master/accounts` | `type` (`asset \| liability \| equity \| income \| expense`), `role` (`""` or `cash \| receivable \| raw_stock \| input_tax \| payable \| output_tax \| sales`) | one **active** account per role (`409 ROLE_TAKEN`); an account with a role, in a journal line or as the GL account of a bank account cannot be deleted |
| `/master/taxRates` | `kind` (`vat \| wht`), `rate` (whole %, 0–100), `isDefault` (`yes \| no`) | exactly one default VAT rate (saving a default clears the others); a WHT rate cannot be the default; a rate used by a document cannot be deleted |
| `/master/paymentMethods` | `type` (`cash \| bank \| cheque`) | used by a receipt / payment → cannot be deleted |
| `/master/bankAccounts` | `bankName`, `branch`, `accountNo`, `glAccountCode` (the code of an **Asset** account) | `400` `INVALID` / `REQUIRED` on `glAccountCode`; used → cannot be deleted |

## Invoices (C1) and supplier bills (C3)

`/accounting/invoices` and `/accounting/bills` have the same calls and rules, for customers and suppliers.

| Method | Path | Notes |
|---|---|---|
| GET | `…/` | list; params `q` (number, party code / name, delivery note / sale order — or PO / goods receipt / supplier's invoice no.), `status` (`draft, issued (approved), partially_paid, paid, overdue, cancelled`), `party` (id), `from`, `to` (document date), `dueFrom`, `dueTo`, `open` (any value = only documents that can still be paid), `sort` (`number, date, dueDate, partyCode, total, paid, balance, status`, default `-date`), `page`, `pageSize`. `meta = { page, pageSize, total, statusCounts, sums: { total, paid, balance } }` (`statusCounts` counts the **shown** status, so an overdue invoice is in `overdue`) |
| GET | `…/sources` | what a new document can be made from: delivered delivery notes without a live invoice (bills: **posted** goods receipts without a live bill): `[{ id, number, date, partyId, partyName, ref, lines: [{ itemId, code, name, uom, qty, maxQty, unitPrice }] }]` |
| GET | `…/:id` | one |
| POST | `…/` | create a **draft**: `{ sourceId, date, dueDate?, taxRateId, remarks, supplierInvoiceNo? (bills), lines?: [{ itemId, qty, unitPrice }] }`. Lines default to the source's (delivered quantities at the sale order price; accepted quantities at the PO price); `qty` > 0 and **≤ the quantity of the source** (`TOO_MANY`), `unitPrice` a whole number ≥ 0; the tax rate is an **active VAT** rate; `dueDate` empty = date + the payment terms of the customer / supplier (NET_15 / 30 / 45 / 60 days, COD = same day); `409`-like `ALREADY_USED` on `sourceId` when the source has another live document (R2) |
| PUT | `…/:id` | change a **draft** (author or Manager): `{ date, dueDate, taxRateId, remarks, lines, supplierInvoiceNo? }`; the source cannot change |
| DELETE | `…/:id` | delete a **draft** |
| POST | `…/:id/:action` | body `{ note? }`: **`issue`** (invoices) / **`approve`** (bills) — draft → issued / approved, Manager; writes the entry; `409 ACCOUNT_ROLE_MISSING` (nothing changes) when a system role has no active account. `cancel` — a draft (author or Manager) or an issued / approved document (Manager, **note required**, only while **no receipt / payment is confirmed**, `409 INVALID_STATUS` otherwise): reverses the entry, cancels its draft receipts / payments, frees the source. `revert` — cancelled → the status before (Manager, **note required**; a document that was issued is posted again; `409 ALREADY_USED` when the source got another document meanwhile) |

Response: `{ id, number, date, dueDate, status (shown), storedStatus, overdueDays, partyId, partyCode, partyName, taxRateId, taxRatePercent, remarks, createdById, createdBy, lines[], subtotal, tax, total, totals, paid, balance, payments[], history[], links[], journalEntryId }` and, for an invoice, `customerCode, customerName, deliveryId, deliveryNumber, saleOrderId, saleOrderNumber, customerAccount { openBalance, creditLimit, overLimit }, payTo`; for a bill `supplierCode, supplierName, receiptId, receiptNumber, poId, poNumber, supplierInvoiceNo`.
- `lines[]`: `{ itemId, productId | materialId, code, name, uom, qty, maxQty, unitPrice, amount }`. **Money rules (R1)**: `amount = round(qty × unitPrice)`, `subtotal = Σ amount`, `tax = floor(subtotal × rate / 100)`, `total = subtotal + tax`.
- **R3** `paid` = Σ confirmed receipts (payments); `balance = total − paid`; stored status *partially paid* when `0 < paid < total`, *paid* when `paid = total`, back to *issued / approved* when nothing is confirmed any more.
- **R9** `overdueDays` > 0 (and `status = "overdue"`) when the stored status is issued / approved / partially paid, `balance` > 0 and `dueDate` is before today.
- `customerAccount.openBalance` = Σ balance of the customer's issued / partially paid invoices; `overLimit` is only a warning flag (nothing is blocked).
- Posting: **invoice** Dr Accounts receivable (total) / Cr Sales revenue (subtotal) / Cr Output tax (tax); **bill** Dr Raw material stock (subtotal) / Dr Input tax (tax) / Cr Accounts payable (total). Zero lines are left out.

## Receipts (C2) and payments (C4)

`/accounting/receipts` (money in, against an invoice) and `/accounting/payments` (money out, against a bill): the same list / get / create / update / delete as above, and `POST …/:id/:action`.

- `POST`: `{ docId, date, amount, methodId, bankAccountId?, reference?, remarks }`. The document is **issued / approved or partially paid** (`INVALID_STATUS` on `docId`); `amount` is a whole number > 0 and **≤ the balance** (`TOO_MANY`); `bankAccountId` is required unless the method is **cash** (`REQUIRED`) and is dropped for cash. Params of the list: `q`, `status` (`draft \| confirmed \| cancelled`), `party`, `method`, `doc` (id), `from`, `to`, `sort` (`number, date, docNumber, partyCode, amount, status`); `meta.sums.amount`.
- Actions: **`confirm`** — draft → confirmed (**receipts: any Accounting user; payments: Manager only**); the **amount is checked again** against the balance (two drafts cannot pay the same money), writes the entry, moves the invoice / bill. `cancel` — a draft (author or Manager) or a **confirmed** one (Manager, **note required**): reverses the entry and reopens the amount on the invoice / bill.
- Posting: **receipt** Dr the GL account of the bank account (the Cash account for cash) / Cr Accounts receivable; **payment** Dr Accounts payable / Cr bank (cash).
- Response: `{ id, number, date, status, docId, docNumber, docStatus, docTotal, docBalance, partyId, partyCode, partyName, amount, methodId, methodName, methodType, bankAccountId, bankAccountName, reference, remarks, createdById, createdBy, history[], links[], journalEntryId }`.

## Journal — C5 — `/accounting/journal`

| Method | Path | Notes |
|---|---|---|
| GET | `/accounting/journal` | list; params `q` (number, document number, memo, reference), `status` (`draft \| posted \| reversed`), `source` (`auto \| manual`), `account` (id: the entries that touch it), `from`, `to`, `sort` (`number, date, debit, credit, status`, default `-date`), `page`, `pageSize`. With `account`, `meta.account = { id, code, name, debit, credit, balance }` — the ledger totals of that account (balance = debit − credit for Asset / Expense, credit − debit otherwise) |
| GET | `/accounting/journal/:id` | one: `{ id, number, date, memo, reference, source, status, docType, docId, docNumber, reversalOf, reversalOfNumber, debit, credit, createdBy, lines: [{ accountId, accountCode, accountName, debit, credit, memo }], history[], links[] }` |
| POST | `/accounting/journal` | create a **manual draft**: `{ date, memo, reference?, lines: [{ accountId, debit, credit, memo? }] }` — at least two lines, active accounts, each line **either a debit or a credit** (`ONE_SIDE`), whole yen |
| PUT | `/accounting/journal/:id` | change a manual **draft** (author or Manager) |
| DELETE | `/accounting/journal/:id` | delete a manual **draft** |
| POST | `/accounting/journal/:id/:action` | Manager: `post` (manual draft → posted; `409 NOT_BALANCED` unless debit = credit and > 0), `reverse` (manual posted → reversed, **note required**, writes the reversing entry). An entry that the system wrote cannot be edited, deleted or reversed by hand |

**R6/R10**: the entries of invoices, bills, receipts and payments are **posted at once** and never edited; cancelling the document (or cancelling a confirmed receipt / payment) writes a **reversing entry** (same lines, debit and credit swapped, memo `Reversal of JE-…`) and marks the original `reversed`.

## Other API changes

- `GET /sale/orders/:id` and `GET /sale/deliveries/:id` `links` include the invoices (`type: "invoice"`, `to: "/accounting/invoices/:id"`); until the first invoice exists a delivered order keeps the "not recorded" placeholder.
- `GET /purchase/orders/:id` and `GET /purchase/receipts/:id` `links` include the bills (`type: "supplierBill"`) the same way.
- `DELETE /master/customers|suppliers|products|materials/:id` answer `409 IN_USE` when an invoice or a bill uses them.
- `GET /dashboard`: `kpis.overdueInvoices = { count, amountJpy (the balances) }`, `kpis.unpaidSupplierBills = { count, amountJpy, dueWithin7Days }`; the `approvals` of an Accounting Manager list the **Draft** invoices and bills (`type "INVOICE"` / `"BILL"`).

## Errors used (besides the common ones)

| `error` | Where | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | documents, money, entries | field codes `REQUIRED`, `INVALID`, `TOO_MANY`, `TOO_LONG`, `DATE_ORDER`, `ALREADY_USED`, `INVALID_STATUS` (on `docId`), `ONE_SIDE`; `note` `REQUIRED` for the actions that need a reason |
| `ACCOUNT_ROLE_MISSING` | issue, approve, confirm | `409`: `errors = [{ path: ["role"], message: "ACCOUNT_ROLE_MISSING", role }]` — set the account in the Accounting master |
| `NOT_BALANCED` | post an entry | `409` |
| `ROLE_TAKEN` | accounts | `409` |
| `ALREADY_USED` | revert | `409` |
| `INVALID_STATUS`, `FORBIDDEN`, `NOT_FOUND`, `IN_USE`, `CODE_ALREADY_EXISTS` | all | as in the other modules |

## Backend checklist

- [ ] Tables: accounts, tax rates, payment methods, bank accounts; invoices + lines, bills + lines, receipts, payments (each with status history); journal entries + lines (append only once posted)
- [ ] Posting accounts come from the **system roles** of the chart and from the bank account of the receipt / payment; refuse with `ACCOUNT_ROLE_MISSING` before anything is written
- [ ] One transaction per action: the status change, the journal entry and (for money) the status of the invoice / bill
- [ ] A delivery note is invoiced once and a goods receipt billed once (unique among non-cancelled documents); a cancelled document frees its source
- [ ] Receipt / payment amount ≤ balance, checked again at confirm; `paid` and the status always follow the confirmed money documents
- [ ] **Overdue** computed from the due date when listing and in the dashboard, never stored
- [ ] Reversing entries for cancelled documents and money; posted entries never updated or deleted
- [ ] Journal balance check on `post` (debit = credit, > 0); ledger totals for an `account` filter
- [ ] Invoice and bill links on the Sale and Purchase documents; delete rules for customers, suppliers, products and materials
- [ ] Turn off `VITE_USE_MOCK` and re-run the test list in the spec
