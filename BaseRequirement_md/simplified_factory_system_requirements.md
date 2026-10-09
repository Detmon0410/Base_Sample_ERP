# Simplified Factory System Requirements

## 1. Purpose

Provide a simple system to keep quotation references, create production orders, record manual production progress, manage stock, and issue invoices and receipts.

This is a reduced-scope system. Users enter and update information manually. The priority is a clear workflow and usable records.

## 2. Main Workflow

1. Sales provides a quotation (QT).
2. The factory saves the QT as a reference and opens a production order.
3. The factory manually adds the processes required for that order.
4. Workers record progress for each process until all processes are completed.
5. Accounting issues an invoice for the completed order.
6. Accounting records full payment, marks the invoice as Paid, and issues a receipt.

**Expected result:** Users can follow an order from its QT reference to production completion, invoice, and receipt.

## 3. Users and Access

Department and role are separate fields. Departments identify Sales, Factory, Accounting, or Administration. Only two roles are required.

| Role | Access |
| --- | --- |
| Admin | Manage master data, QT references, production orders, processes, stock, invoices, receipts, and user accounts. |
| Worker | View production orders and record process progress. View product and material information needed for production. |

Sales, factory office staff, and accounting staff use the Admin role in this simple version. Separate department permissions are outside this version.

## 4. Master Data

### 4.1 Customer

| Field | Description |
| --- | --- |
| Name | Customer name. |
| Address | Customer address for invoice and receipt. |
| Email | Contact email. |
| Telephone | Contact telephone number. |

**Expected result:** Users can select an existing customer when recording a QT reference or creating an order.

### 4.2 Product

| Field | Description |
| --- | --- |
| Name | Product name. |
| Code | Unique product code. |
| Price | Default selling price per unit. |
| BOM | List of materials and quantities required for one product. |

Each BOM line contains a material and its required quantity. BOM is a reference only; it does not automatically deduct stock or create production processes.

**Expected result:** Users can select products and view their prices and material requirements.

### 4.3 Material

The input label “math” is interpreted as “Material.”

| Field | Description |
| --- | --- |
| Name | Material name. |
| Code | Unique material code. |
| Lot | Lot number used to identify a stock batch. |
| Quantity | Available quantity for that material lot. |

A material may have several lots. Each lot has its own quantity.

**Expected result:** Users can see the available quantity of each material lot.

### 4.4 User

| Field | Description |
| --- | --- |
| Name | Staff name. |
| Department | Staff department. |
| Email | Unique login email. |
| Password | Login password, stored securely as a password hash. |
| Role | Admin or Worker. |

**Expected result:** Staff can log in and access functions allowed by their role.

## 5. Functional Requirements

### 5.1 Sales: QT Reference

- Save the QT number, QT date, customer, and optional notes.
- Attach the QT file received from Sales.
- Keep the QT reference linked to the production order.
- QT creation, quotation approval, and quotation calculations remain outside this system.

**Expected result:** The factory can open the original QT reference from the order.

### 5.2 Factory: Production Order

- Create an order with an order number, QT reference, customer, order date, and notes.
- Manually add product lines with product, quantity, and agreed unit price.
- Use the product price as a default; Admin can enter the agreed price for the order.
- Manually add an ordered process list for each product line.
- Each process contains a sequence number, process name, and optional instructions.
- Require at least one product line and one process per product line before starting production.
- Show order details and the progress of all processes on one order page.

**Expected result:** The factory has a production order with clear product quantities and a manual process list.

### 5.3 Factory: Process Progress

- Use three process statuses: Not Started, In Progress, and Completed.
- Workers can update status, enter completed quantity, work date, and notes.
- Record who made the update and when it was made.
- Show completed quantity against the required product quantity.
- A process can be completed only when its completed quantity equals the required quantity.
- An order becomes Completed when every process on every product line is Completed.

**Expected result:** Users can identify the current process and see whether production is complete.

### 5.4 Stock: Manual Management

- Admin can add material stock by material, lot, and quantity.
- Admin can manually deduct stock when materials are used.
- Admin can manually adjust stock after a physical count.
- Every stock change records the material, lot, quantity change, reason, user, and date.
- A production order reference may be added to a stock change.
- Show current stock quantities and stock movement history.
- Prevent a stock change that would make a lot quantity negative.

**Expected result:** Stock quantities reflect the changes entered by Admin. Production progress does not automatically change stock.

### 5.5 Accounting: Invoice

- Issue an invoice only after the production order is Completed.
- Use one invoice per production order in this version.
- Include invoice number, date, order reference, customer name and address, product lines, quantities, unit prices, and total amount.
- Calculate each line amount as quantity × unit price and sum the lines for the invoice total.
- Keep invoice details as issued so later master-data changes do not change the invoice.
- Show invoice status as Unpaid or Paid.
- Allow users to print or download the invoice as PDF.

**Expected result:** Accounting can issue a simple invoice using the completed order information.

### 5.6 Accounting: Payment and Receipt

- Record one full payment per invoice: payment date, amount, payment method, and optional reference or notes.
- The payment amount must equal the invoice total in this version.
- After payment is recorded, mark the invoice as Paid and issue one receipt linked to it.
- Include receipt number, receipt date, invoice reference, customer details, payment amount, and payment method.
- Allow users to print or download the receipt as PDF.

**Expected result:** Users can verify that the invoice has been paid and open the related receipt.

## 6. Simple Statuses

Production and payment statuses are tracked separately.

| Record | Status | Meaning |
| --- | --- | --- |
| Production order | New | Order created; production has not started. |
| Production order | In Progress | At least one process has started. |
| Production order | Completed | Every required process is completed. |
| Process | Not Started | No work has started. |
| Process | In Progress | Work is underway. |
| Process | Completed | Required quantity has been completed. |
| Invoice | Unpaid | Invoice issued; payment has not been recorded. |
| Invoice | Paid | Full payment recorded and receipt issued. |

**Expected result:** A completed production order can still have an unpaid invoice without confusing the two statuses.

## 7. Minimum Pages

| Page | Main Result |
| --- | --- |
| Login | Staff can access the system. |
| Customer Master | Admin can maintain customer information. |
| Product and BOM Master | Admin can maintain products, prices, and material references. |
| Material and Stock | Admin can maintain materials, lots, and manual stock movements. |
| User Management | Admin can maintain staff accounts and roles. |
| QT References | Admin can save and view QT references. |
| Production Orders | Users can find orders and view their current status. |
| Order Details and Progress | Users can view processes and record production progress. |
| Invoices and Receipts | Admin can issue invoices, record payments, and access receipts. |

Lists should support simple search by document number, customer name, product code, or material code where relevant. The order list should also support a status filter.

## 8. Basic Rules

- Order, invoice, and receipt numbers must be unique.
- Product and material codes must be unique.
- Product and material quantities must be positive when entered; stock adjustments may increase or decrease the balance.
- Completed process quantity cannot exceed the required quantity.
- Order prices must be zero or greater.
- Master records already used in transactions must be kept; they may be made inactive instead of deleted.
- Issued invoices and receipts cannot be deleted or edited in this version.
- Production quantities and process lists cannot be changed after an invoice is issued.

## 9. Scope Limits

This version does not include automatic scheduling, machine or line capacity planning, automatic BOM stock deduction, purchasing, shipping, separate QC forms, serial-number tracking, barcode or QR workflows, accounting ledgers, tax calculations, discounts, partial invoices, partial payments, or external integrations.

Production dates, process setup, stock movements, and payment confirmation are entered manually. Production order quantities are not automatically added to finished-goods stock.

## 10. Acceptance Criteria

The system is ready when users can complete the following example:

1. Create a customer, product, material lot, BOM reference, and staff accounts.
2. Save a QT reference and attach its file.
3. Create a production order linked to that QT for 10 units of a product.
4. Manually add the required processes.
5. Have a Worker record progress and complete 10 units for every process.
6. Confirm that the order becomes Completed.
7. Have Admin manually deduct material stock and review the movement history.
8. Issue and download an invoice for the completed order.
9. Record the full payment, confirm the invoice becomes Paid, and download the receipt.
10. Open the order and view its QT reference, production progress, invoice, and receipt.
