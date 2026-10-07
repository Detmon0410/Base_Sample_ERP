# F10 Spec — Accounting module (C1–C6 and the links with Sale, Purchase and the Dashboard)

Status: **APPROVED with the suggested answers (★) for Q1–Q14. BUILT with mock data** (differences: section 10) · Rule as before: spec → review → build with mock data → API doc (`docs/api/accounting.md`) → tests.
Sources: `BaseRequirement_md/Accounting_req.md` (flow, documents, master data) · `Overall_ERP.md` ("Issue invoice", "Basic accounting") · `user_account_req.md` (a Manager approves an invoice) · `Sale_req.md` / `Purchase_req.md` (the invoice and the bill refer to the sale / purchase documents; supplier invoices and payments stay in Accounting) · `master_data_req.md` (customer and supplier payment terms, credit limit) · `docs/frontend-plan.md` §3.7 (C1–C6) · `docs/test.txt` section 6 · `docs/specs/f6-sale.md`, `f9-purchase.md` (the documents Accounting refers to).

Carried-over decisions: JPY only, whole yen · desktop (≥ 1280px) · EN first, JA keys empty with EN fallback · no visible page title · details open as the **side sheet** · **manual first** (a status moves only when a person presses a button, with a history line; the exceptions are the ones that follow a money document: confirming a receipt / payment moves its invoice / bill to Partially paid or Paid, and the Overdue mark, which is only shown) · tables 15px `#666`, status stepper above the lists (the header eye hides it), quiet header buttons · shared parts reused (`DocumentListPage`, `DocumentSheet`, `DocumentActions namespace="accounting"`, `StatusStepper`, `DocumentTotals`, `EntitySelect`, `DateField`, `HistoryCard` / `LinksCard`, `useRecordForm`, print for documents, the simple master list / form pattern of Master data).

---

## 1. The main idea

Accounting turns what Sale and Purchase did into money documents and keeps the books in a general ledger (GL):

```text
Sale   Delivery note (delivered) ──▶ Customer invoice (C1) ──▶ Customer receipt (C2) ─┐
                                      Dr Accounts receivable                             │
Purchase Goods receipt (posted)  ──▶ Supplier bill (C3) ────▶ Supplier payment (C4) ──┤──▶ Journal entries (C5)
                                      Dr Raw material stock                              │       (auto, or manual)
Master data (C6): chart of accounts · tax rates · payment methods · bank accounts ──────┘
```

- **Invoice and bill are the documents with lines and tax**, built from what really happened: delivered quantities for the invoice, accepted quantities of a posted receipt for the bill.
- **Receipts and payments are the money**: each is against one invoice (or bill), has a method and a bank account, and cannot be more than the balance.
- **Every posted document writes a journal entry by itself** (balanced, with a link back to the document). A person can also write a manual entry. The journal is the ledger: it can be filtered by account.
- **The balance is always the invoice total minus the confirmed receipts** (same for bills), so the numbers can be explained and are never typed.

## 2. Pages (build in this order)

| # | Page | Route | What it is |
|---|---|---|---|
| A0 | Foundation | – | `services/mock/accounting.js` (all documents, the journal and the master lists), `accounting.service.js`, `config/accounting.js`, `accounting` texts, status keys and colours, two demo users (Accounting Manager and Worker), then the links of section 5 |
| C6 | Accounting master | `/accounting/master` | four lists in one page with tabs: **Chart of accounts · Tax rates · Payment methods · Bank accounts** — the same list + sheet pattern as the other master data (search, active switch, deactivate, no hard delete once used) |
| C1 | Customer invoices | `/accounting/invoices`, `/new`, `/:id` | list with stepper, one sheet for the form and the detail, print |
| C2 | Customer receipts | `/accounting/receipts`, `/new`, `/:id` | list with stepper (Draft, Confirmed, Cancelled), one sheet |
| C3 | Supplier bills | `/accounting/bills`, `/new`, `/:id` | the same as invoices, for suppliers |
| C4 | Supplier payments | `/accounting/payments`, `/new`, `/:id` | the same as receipts, for suppliers |
| C5 | Journal entries | `/accounting/journal`, `/new`, `/:id` | list with filters (by account, date, document), one sheet; manual entries with a visible balance check |

### C6 Accounting master

| List | Fields | Notes |
|---|---|---|
| Chart of accounts | Code, Name, **Type** (Asset, Liability, Equity, Income, Expense), **System role** (optional: Accounts receivable, Accounts payable, Sales revenue, Raw material stock, Input tax, Output tax, Cash), Active | the posting rules use the *system role*, never a hard-coded code; each role has exactly one active account; a seeded chart of ~16 accounts (Cash 1100, Bank 1110, Accounts receivable 1200, Raw material stock 1300, Input tax 1400, Accounts payable 2100, Output tax 2200, Capital 3000, Sales revenue 4100, Purchases and expenses 5100 …) |
| Tax rates | Code, Name, **Kind** (VAT or WHT), **Rate %**, Default, Active | seed: Standard 10 % (default), Reduced 8 %, Exempt 0 %, WHT 3.063 %. A document uses **one VAT rate** chosen from the active VAT rates; WHT is kept in the master for later and is not applied now |
| Payment methods | Code, Name, **Type** (Cash, Bank transfer, Cheque), Active | seed: Cash, Bank transfer, Cheque |
| Bank accounts | Code, Name, Bank, Branch, Account no., **GL account** (an Asset account), Active | seed: two bank accounts of the company; cash needs no bank account |

Rules: a record that a document or an entry uses cannot be deleted, only deactivated; a code is unique; exactly one default tax rate.

### C1 Customer invoices

- **List**: Invoice No. · Date · Customer · Delivery note · Due date · Total · Paid · **Balance** · Status. Footer: rows, total, balance. **Stepper** with counts: Draft · Issued · Partially paid · Paid · Overdue · Cancelled. Filters: customer, date range, due date range; search by number, customer, SO / DN number. Newest first.
- **New invoice** (Accounting Worker, Manager, Admin): step 1 choose a **delivered delivery note that has no invoice yet** (a picker of those notes with customer and sale order); the sheet fills the customer, the sale order, the invoice date (today), the **due date** (invoice date + the customer's payment terms: NET_30 → 30 days, COD → the same day), the tax rate (default) and the **lines = the delivered lines** at the price of the sale order. A delivery note can be invoiced once (Q1).
- **Sheet** (Draft editable): header (customer, references, dates, tax rate, remarks), the lines table (product, quantity, unit price, amount: **price and remarks can be corrected in a draft; quantity cannot exceed what was delivered**), totals (Subtotal, Tax at the chosen rate rounded down, Total). Read only after Issued.
- **Cards** (after issue): **Payments** (the receipts of this invoice with status and amount, a progress bar "¥300,000 of ¥1,166,000 paid"), **Customer account** (open balance of the customer and the credit limit with an amber line when the balance is over the limit — a warning, nothing is blocked, Q10), Status history, Linked documents (sale order, delivery note, receipts, the journal entry).
- **Buttons**: Draft: Save · Delete · **Issue** (Manager, Admin: the approval) · Cancel. Issued: **Receive payment** (opens a new receipt for the balance) · **Cancel** (Manager, reason required, only while no receipt is confirmed) · **Print**. Partially paid / Paid: Receive payment (while there is a balance) · Print. Cancelled: Revert (Manager, reason).
- **Issue** writes the journal entry: Dr Accounts receivable (total) / Cr Sales revenue (subtotal) / Cr Output tax (tax).
- **Overdue**: an Issued or Partially paid invoice whose due date is before today is shown as **Overdue** (badge, stepper count, list filter) with "N days overdue"; its stored status is unchanged and a receipt still works (Q3).

### C2 Customer receipts (Payment in)

- **List**: Receipt No. · Date · Customer · Invoice · Amount · Method · Bank account · Status; stepper Draft · Confirmed · Cancelled; filters customer, method, date.
- **Sheet**: Invoice (picked from Issued / Partially paid / Overdue invoices, or prefilled by **Receive payment**), customer (from the invoice), date, **amount** (default the balance; 1 … balance; an amount above the balance is refused, Q6), **payment method**, **bank account** (required for Bank transfer and Cheque, not for Cash), reference text (transfer no. / cheque no.), remarks.
- **Confirm** (Accounting Worker, Manager, Admin; Q2): moves the invoice to **Partially paid** or **Paid** and writes the entry: Dr Bank (the GL account of the bank account; Cash account for cash) / Cr Accounts receivable. **Cancel**: a draft by its author or a Manager; a **confirmed** receipt only by a Manager with a reason: it writes the reversing entry and gives the amount back to the invoice balance.

### C3 Supplier bills (AP)

- Same screens and rules as the invoices, for suppliers. A bill is made from a **posted goods receipt that has no bill yet** (Q5): lines = the **accepted** quantities at the price of the purchase order line, the supplier's own **invoice number** (text, optional), bill date (today), due date = bill date + the supplier's payment terms.
- Statuses: Draft · **Approved** (the Manager's approval, like Issue) · Partially paid · Paid · Overdue (shown) · Cancelled. Buttons: Draft: Save · Delete · **Approve** (Manager, Admin) · Cancel. Approved: **Pay supplier** (opens a new payment for the balance) · **Cancel** (Manager, reason, only while no payment is confirmed). Print.
- **Approve** writes: Dr Raw material stock (subtotal) / Dr Input tax (tax) / Cr Accounts payable (total).
- Cards: **Payments**, Status history, Linked documents (purchase order, goods receipt, payments, journal entry).

### C4 Supplier payments (Payment out)

- Same as the customer receipts, for bills. **Confirm is for a Manager or Admin only** (money leaves the company, Q2). Entry: Dr Accounts payable / Cr Bank (or Cash).

### C5 Journal entries

- **List**: JE No. · Date · Reference (the document, a link) · Memo · Debit total · Credit total · Source (Auto / Manual) · Status (Posted · Draft · Reversed). Filters: **account** (the entries that touch it, so the list is also the ledger of that account, with a running total in the sheet of the account — Q14), source, date range; search by number, document number, memo.
- **Entries made by the system** (invoice issued, receipt confirmed, bill approved, payment confirmed) are **Posted** at once, cannot be edited or deleted, and show the document they came from. When a document is cancelled or a receipt / payment is cancelled, a **reversing entry** is written (the same lines with debit and credit swapped, memo "Reversal of JE-…") and the original is marked Reversed.
- **Manual entry** (Accounting Worker saves a draft, Manager or Admin posts it): date, memo, reference text, lines (account, debit, credit, line memo; at least two lines). **The balance check is always visible**: totals of debit and credit, the difference in red and "Post" disabled until they are equal and not zero; each line has either a debit or a credit. Only active accounts. A posted manual entry is reversed (Manager, reason), never edited.
- The sheet shows the lines with the account code and name, the totals and the link to the source document.

## 3. Rules

| # | Rule |
|---|---|
| R1 | Money is whole yen; tax = floor(subtotal × rate), the total = subtotal + tax (the Sale rule). |
| R2 | A delivery note is invoiced once; a goods receipt is billed once. A cancelled invoice / bill frees its document. |
| R3 | Paid = Σ confirmed receipts (payments) of the document; Balance = Total − Paid; Partially paid when 0 < Paid < Total, Paid when Paid = Total. The status follows the confirmed money documents; nobody types it. |
| R4 | A receipt / payment amount is > 0 and ≤ the balance (checked again at confirm, so two drafts cannot pay the same money twice). |
| R5 | An invoice / bill with a confirmed receipt / payment cannot be cancelled or sent back; cancel the money document first. |
| R6 | Every posted document writes **one balanced journal entry** using the accounts of the system roles (R7); an entry is balanced (debit = credit) before it is posted. |
| R7 | Posting accounts come from the **system roles** of the chart and from the bank account of the receipt / payment; if a role has no active account the action is refused with a clear message ("Set the Accounts receivable account in the Accounting master"). |
| R8 | Due date = document date + payment terms of the customer / supplier (NET_15 / 30 / 45 / 60 days, COD = same day); it can be changed in a draft. |
| R9 | **Overdue** (shown, not stored) = Issued / Approved or Partially paid, Balance > 0 and due date before today. |
| R10 | A posted entry is never edited or deleted; a correction is a reversing entry. A customer, supplier, product or account used by a document cannot be deleted. |
| R11 | Document numbers `INV-2026-0001`, `RC-2026-0001`, `BILL-2026-0001`, `PAY-2026-0001`, `JE-2026-0001` (prefix, year of the document date, 4 digits, per type and year). |

## 4. Roles

| Who | May |
|---|---|
| Accounting **Worker** | create / edit / delete **their own draft** invoices, bills and manual entries, create and **confirm customer receipts**, create (not confirm) supplier payments, print, read everything in Accounting |
| Accounting **Manager** and **Admin** | all of the above on anybody's documents, plus **Issue** an invoice, **Approve** a bill, **Confirm** a supplier payment, **post** and reverse a manual entry, cancel an issued invoice / approved bill / confirmed receipt or payment (reason), revert, edit the Accounting master |
| Accounting **Worker** and the master | read the master lists; **changing** the master is for the Manager and Admin |
| Anyone else | no Accounting menu; `403` on every `/accounting/*` call. Sale and Purchase people see the numbers of the invoice or bill of their documents (read only text and a link only for Accounting users) |

Two demo users are added: **Accounting Manager** `mika@kanou.test` and **Accounting Worker** `sora@kanou.test`.

## 5. Links with the other modules (the second half of the build)

1. **Sale**: the delivery note sheet and the sale order sheet show the **invoice** (number, status, balance; a link for Accounting users) in the linked documents instead of "Not recorded"; the sale order of a fully paid invoice is not changed (no new status).
2. **Purchase**: the PO sheet and the goods receipt sheet show the **supplier bill** the same way.
3. **Master data**: customers show their **open balance** next to the credit limit (read only text in the sheet); a customer, supplier or product used by an invoice / bill cannot be deleted; the chart, banks, taxes and methods of C6 follow the same rule.
4. **Dashboard**: KPIs **Overdue invoices** (count and amount) and **Unpaid supplier bills** (count, amount, due within 7 days) come from the real documents; the approvals block of an Accounting Manager lists **Draft invoices and bills waiting for approval**.
5. **Print**: an invoice and a bill print with the shared print dialog (header, parties, lines, totals, bank account for the customer to pay into) — Q9.
6. **Navigation**: the Accounting group already has the six entries; no new menu items.

## 6. Mock data

- The **chart of accounts** (16 accounts with the system roles), 4 tax rates, 3 payment methods and 2 bank accounts.
- **Invoices from the three delivered delivery notes** (DN-2026-0001, 0002, 0004), so that the numbers match Sale: one **Paid** (with a confirmed receipt), one **Partially paid and overdue** (the NET_30 invoice of September), one **Issued** (not yet due), and one **Cancelled** (a first invoice of the same note that was cancelled and made again). There is no delivered note left for a Draft one: a test and the demo create it.
- **Supplier bills from the posted goods receipts** (GR-2026-0001 … 0004): Paid, Approved (unpaid), Partially paid (overdue), Draft.
- Receipts and payments for the paid and partly paid ones (one extra draft receipt), and **the journal entries of all of them** (generated by the same code that the buttons use, so the seed and the buttons agree) plus one manual entry (the company capital at the start) so that the ledger of the bank account and of accounts receivable / payable has a sensible balance.
- Latency, error simulation (`?mock=…`) and the 403 for other departments as in the other mocks.

## 7. Parts

| Part | New / reused |
|---|---|
| `services/mock/accounting.js`, `accounting.service.js`, `config/accounting.js` | new |
| `pages/accounting/master/` (tabs of four lists, same pattern as `master/simple`) | new, reuse `SimpleMasterPage` parts |
| `pages/accounting/invoices/`, `bills/` (list, sheet, schema; one shared **MoneyDocumentSheet** for lines, totals, payments card) | new, reuse `DocumentListPage` with `stepper`, `DocumentSheet`, `DocumentTotals`, print |
| `pages/accounting/receipts/`, `payments/` (one shared component for both directions) | new |
| `pages/accounting/journal/` | new: list, sheet, manual entry form with the balance check |
| `components/accounting/` (`PaymentsCard`, `BalanceBar`, `OverdueBadge`, `JournalLines`) | new, small |
| `i18n` `accounting` namespace; status keys `issued`, `partially_paid`, `paid`, `overdue`, `confirmed` (exists), `approved` (exists), `reversed`; stepper units | new |
| Changes in `services/mock/routes.js` (users), `sale.js` and `purchase.js` (links), `dashboard.js`, `masterData.js` (deletion rules, customer balance) | the links of section 5 |
| Tests | rule tests (R1–R11), mock route tests as `stock.test.js` and `purchase.test.js` (who may do what, balances, journal balance, reversal, 403), component tests, a browser check as Accounting Worker, Manager, a Purchase user and a Sale user |
| Docs | `docs/api/accounting.md`, updates of `api/sale.md`, `purchase.md`, `master-data.md`, `dashboard.md`, ticks of section 6 in `docs/test.txt`, `pages-progress.md` |

## 8. Out of scope for now

Cost of goods sold and stock valuation (needs a unit cost; the delivery and the goods receipt book **no** journal entry) · credit notes and returns · invoicing several delivery notes in one invoice or part of a note · supplier invoices without a goods receipt · withholding tax calculation (WHT is only in the master) · foreign currency · bank reconciliation and statement import · period closing and fiscal years · financial statements (trial balance, profit and loss, balance sheet) and an aging report · e-invoicing / qualified invoice number · reminders to customers · payment by several methods in one receipt.

## 9. Questions (★ = my suggestion)

| # | Question | Options |
|---|---|---|
| Q1 | What an invoice is made from | ★ one **delivered delivery note**, once · a whole sale order (all its delivered notes) · free lines |
| Q2 | Who does what | ★ Worker drafts; **Manager issues invoices and approves bills**; Worker confirms customer receipts; **Manager confirms supplier payments** · Manager does every approval · Worker does all |
| Q3 | Overdue | ★ **shown** from the due date (badge, stepper, filter), not stored, no automatic action · a stored status that a button sets |
| Q4 | Tax | ★ **one VAT rate per document** from the Tax master (default 10 %); WHT only listed in the master · a rate per line · WHT applied now |
| Q5 | What a bill is made from | ★ one **posted goods receipt**, once, at the PO price, with the supplier's invoice no. · a whole PO · free lines |
| Q6 | Receipt / payment amount | ★ partial amounts allowed, never above the balance · an overpayment becomes a credit on the account |
| Q7 | Journal | ★ the system writes balanced entries for the four money documents; **no** COGS / stock valuation entries; manual entries are Draft → Posted by a Manager; corrections are reversing entries · also entries for deliveries and goods receipts |
| Q8 | Which accounts are posted | ★ the **system roles** of the chart + the GL account of the bank account · the account typed on every document |
| Q9 | Print | ★ invoice and bill print with the shared print dialog · invoice only · none now |
| Q10 | Credit limit | ★ an amber warning on the invoice sheet (open balance of the customer vs the limit), nothing is blocked · block the issue |
| Q11 | Dashboard | ★ the two KPIs and the approvals of an Accounting Manager are real · only the KPIs |
| Q12 | Numbers | ★ `INV-`, `RC-`, `BILL-`, `PAY-`, `JE-` + year + 4 digits · other format |
| Q13 | Demo users | ★ add an Accounting Manager and Worker (`mika@…`, `sora@…`) · use Admin only |
| Q14 | Reports | ★ none now; the journal filtered by account is the ledger, with a running balance in the account's view · build a trial balance and an aging list now |

When you answer (or say "take the suggestions"), the build starts with A0, then C6 → C1 → C2 → C3 → C4 → C5 and the links of section 5, each page checked in the browser, then the API doc, the tests and the ticks in `test.txt`.

---

## 10. Differences between this draft and what was built

- The seeded **bills** have no overdue one: a supplier's bill date cannot be before its goods receipt (September 10 at the earliest), so no bill is past its due date on 7 October; the overdue demo is the invoice **INV-2026-0001** (NET_30, due 5 October, partly paid).
- The seeded draft invoice is missing, as announced: all three delivered delivery notes have an invoice. Cancel the invoice of DN-2026-0002 to make a new one.
- **Ledger of an account**: the journal list filtered by account shows a panel with the account's **debit, credit and balance** (not a running balance on every line).
- **Customer open balance** is shown on the invoice sheet (with the credit limit and the warning), not in the customer's master data sheet.
- The accounting master lists use the same list and sheet pattern as the other flat master data, under four tabs; a Worker sees the lists and has no New button (the sheet of a record still opens read only for them; the server refuses any change with 403).
- The tax rate of a WHT (withholding) kind is only kept in the master; the rate is a whole percent.
- A receipt or payment that is confirmed on a bill / invoice whose amount no longer fits answers a short message ("the amount is more than the balance now") instead of the field errors.
- Two history keys were added to tell the Sale statuses from the accounting ones: `issue`, `bill-approve`, `money-confirm`, `entry-post`, `pay`, `reverse`.
