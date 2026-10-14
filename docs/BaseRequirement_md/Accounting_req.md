# Accounting Requirement

## Flow

1. Issue Invoice to Customer (from SO / Delivery)
2. Receive Payment from Customer (Accounts Receivable)
3. Pay PO to Supplier (from Purchase)
4. Basic Accounting — record transactions (Accounts Payable, GL)

## Flow Diagram

```text
Sale SO / Delivery              Purchase PO / Receipt
        |                                |
        v                                v
  Issue Customer Invoice         Issue Supplier Bill
        |                                |
        v                                v
  Receive Payment (AR)           Pay Supplier (AP)
        |                                |
        v                                v
            General Ledger (GL)
```

## Master Data (basic data required, like every ERP)

- **Customer** — billing address, tax id, payment terms, credit limit
- **Supplier** — billing address, tax id, payment terms
- **Chart of Accounts** — GL accounts (Asset, Liability, Equity, Income, Expense)
- **Tax** — VAT / WHT rates
- **Payment Method** — cash, bank transfer, cheque
- **Bank Account** — company bank accounts for receipts/payments

## Documents

### Customer Invoice (AR)

- Invoice No., Date, Customer, reference SO / Delivery No.
- Lines: Product, Qty, Unit Price, Amount, Tax
- Status: Draft -> Issued -> Partially Paid -> Paid -> Overdue / Cancelled

### Customer Receipt (Payment In)

- Receipt No., Date, Customer, reference Invoice No.
- Amount, Payment Method, Bank Account
- Status: Draft -> Confirmed

### Supplier Bill (AP)

- Bill No., Date, Supplier, reference PO / Receipt No.
- Lines: Product, Qty, Unit Price, Amount, Tax
- Status: Draft -> Approved -> Partially Paid -> Paid -> Overdue / Cancelled

### Supplier Payment (Payment Out)

- Payment No., Date, Supplier, reference Bill No.
- Amount, Payment Method, Bank Account
- Status: Draft -> Confirmed

### Journal Entry (GL)

- JE No., Date, Reference document
- Lines: Account, Debit, Credit
- Auto-generated from Invoice / Receipt / Bill / Payment, or manual entry

## Relations

```text
Sale SO ---> Customer Invoice ---> Customer Receipt ---> GL
Purchase PO ---> Supplier Bill ---> Supplier Payment ---> GL
```
