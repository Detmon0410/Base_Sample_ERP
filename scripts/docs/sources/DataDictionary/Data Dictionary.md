# Data Dictionary

Every table and column of the database of Refrigerator Factory (Version 2.0), as built. The names, types, keys and defaults are read from `backend/prisma/schema.prisma`; the descriptions say what each one is for. The relations between the tables are in the [ER Diagram](../ERDiagram/ER%20Diagram.md) and the keys and delete rules in the [DB Relations](../DBRelations/DB%20Relations.md).

## How to read it

| Item | Meaning |
|---|---|
| Table, column | The names in the database, as the Prisma model gives them (a column is written in camel case, for example `passwordHash`) |
| Type | The MySQL type: `varchar(191)` text, `text` long text, `int` whole number, `decimal(14,3)` quantity with 3 decimals, `date`, `datetime(3)`, `boolean` |
| Null | `yes` when the column may be empty |
| Key | `PK` primary key, `FK` foreign key (the table it points to is in the description), `UK` unique |
| Default | The value used when none is given: `auto` is given by the database, `now` is the current time |
| Money | Whole yen in an `int`; no tax, no decimals |
| Quantity | `decimal(14,3)` for materials; whole `int` for products |

## Value lists

These columns hold text, but only the values listed here.

| Column | Values | Meaning |
|---|---|---|
| `User.role` | `Admin`, `Worker` | Admin does everything. A Worker works by department. |
| `User.department` | `Sales`, `Factory`, `Accounting`, `Administration` | A Worker must be `Sales` or `Factory`; the department decides the access. |
| `QtReference.status` | `Draft`, `Confirmed` | Draft can be changed and deleted; Confirmed is locked and has one production order. |
| `OrderProcess.status` | `Not Started`, `In Progress`, `Completed` | Not Started means quantity 0, Completed means the full quantity of the line. |
| `Invoice.status` | `Unpaid`, `Paid` | Paid after one full payment, which also issues the receipt. |
| `PurchaseOrder.status` | `Draft`, `Sent`, `Received` | Moved by hand, one step forward. Received adds the stock once. |
| `StockChange.kind` | `Add`, `Deduct`, `Adjust` | Add and Deduct move a lot by a quantity; Adjust is a signed correction and needs a reason. |
| `Attachment.kind` | `PO_FILE`, `QUOTATION`, `EVIDENCE`, `OTHER` | What the file is. A new `PO_FILE` replaces the old one. |
| `Attachment.ownerType` | `QtReference`, `ProductionOrder`, `PurchaseOrder` | The table the file belongs to (with `ownerId`). |
| `PurchasePayment.method` | `Cash`, `Bank transfer`, `Cheque`, `Credit card`, `Other` | How the purchase order was paid. |

## Tables

23 tables in 5 groups.

| Group | Tables |
|---|---|
| Users and files | User, Attachment |
| Master data | Customer, Product, Material, ProductBom, MaterialLot, Supplier, SupplierMaterial |
| Sale | QtReference, QtLine, ProductionOrder, OrderLine, OrderProcess, ProgressEntry |
| Accounting | Invoice, InvoiceLine, Payment, Receipt |
| Purchase and stock | PurchaseOrder, PurchaseOrderLine, PurchasePayment, StockChange |

## Users and files

### User

A person who signs in: Admin, Sale Worker or Factory Worker.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `name` | varchar(191) | no |  |  | Display name. |
| `department` | varchar(191) | no |  | Administration | Department of the user; decides the access of a Worker. |
| `email` | varchar(191) | no | UK |  | Sign-in name, stored in lower case. Unique. |
| `passwordHash` | varchar(191) | no |  |  | Hash of the password (bcrypt). The password itself is never stored. |
| `role` | varchar(191) | no |  | Worker | `Admin` or `Worker`. |
| `tokenVersion` | int | no |  | 0 | Grows with every new password; a token with an older number is refused, so old sessions end. |
| `lastLoginAt` | datetime(3) | yes |  |  | Time of the last sign-in. |
| `createdAt` | datetime(3) | no |  | now | When the row was created. |
| `updatedAt` | datetime(3) | no |  | auto | When the row was last changed. |

### Attachment

A file kept with a QT, a production order or a purchase order.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `ownerType` | varchar(191) | no |  |  | Table of the owner. There is no database key to it; the service checks it. |
| `ownerId` | int | no |  |  | Id of the owner row. |
| `kind` | varchar(191) | no |  |  | What the file is. |
| `fileName` | varchar(191) | no |  |  | Original name of the file. |
| `fileType` | varchar(191) | no |  |  | Media type: PDF, PNG or JPG. |
| `size` | int | no |  |  | Size in bytes (up to 10 MB). |
| `filePath` | varchar(191) | no |  |  | Name of the stored file in the upload folder. |
| `uploadedBy` | int | no | FK |  | The user who uploaded it. Points to `User`. |
| `at` | datetime(3) | no |  | now | When the row was written. |

- No foreign key from `ownerType` + `ownerId`; the service checks the owner.

## Master data

### Customer

A company that buys from the factory.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `name` | varchar(191) | no |  |  | Company name. |
| `address` | text | no |  |  | Postal address, printed on the QT, invoice and receipt. |
| `email` | varchar(191) | no |  |  | Contact e-mail (may be empty). |
| `telephone` | varchar(191) | no |  |  | Contact telephone (may be empty). |
| `createdAt` | datetime(3) | no |  | now | When the row was created. |
| `updatedAt` | datetime(3) | no |  | auto | When the row was last changed. |

### Product

A product the factory makes and sells.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `code` | varchar(191) | no | UK |  | Product code. Unique. |
| `name` | varchar(191) | no |  |  | Product name. |
| `price` | int | no |  | 0 | Default unit price in yen; copied to a QT line and then editable there. |
| `createdAt` | datetime(3) | no |  | now | When the row was created. |
| `updatedAt` | datetime(3) | no |  | auto | When the row was last changed. |

### Material

A raw material or part kept in stock.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `code` | varchar(191) | no | UK |  | Material code. Unique. |
| `name` | varchar(191) | no |  |  | Material name. |
| `unit` | varchar(191) | no |  | pcs | Unit of measure (pcs, kg, ...). |
| `minLevel` | decimal(14,3) | yes |  |  | Minimum stock level. Empty means no level, so the material is never Low or Out. |
| `createdAt` | datetime(3) | no |  | now | When the row was created. |
| `updatedAt` | datetime(3) | no |  | auto | When the row was last changed. |

### ProductBom

Bill of materials: how much of a material one product needs. One row per product and material.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `productId` | int | no | PK, FK |  | The product. The row goes with the product when it is deleted. Points to `Product`. |
| `materialId` | int | no | PK, FK |  | The material. Points to `Material`. |
| `quantity` | decimal(14,3) | no |  |  | Quantity of the material for one product. |

### MaterialLot

A lot of a material in stock. The total of the lots is the stock of the material.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `materialId` | int | no | FK |  | The material. The lot goes with the material when it is deleted. Points to `Material`. |
| `lotNumber` | varchar(191) | no |  |  | Lot number, unique inside the material. |
| `quantity` | decimal(14,3) | no |  | 0 | Quantity left in the lot. Production takes from the oldest lot first. |
| `createdAt` | datetime(3) | no |  | now | When the row was created. |

- Unique together: `materialId` + `lotNumber`.

### Supplier

A company the factory buys materials from.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `code` | varchar(191) | no | UK |  | Supplier code. Unique. |
| `name` | varchar(191) | no |  |  | Supplier name. |
| `contact` | varchar(191) | no |  |  | Contact person or telephone (may be empty). |
| `address` | text | no |  |  | Postal address, printed on the purchase order. |
| `active` | boolean | no |  | true | False hides the supplier from new purchase orders; old ones stay. |
| `createdAt` | datetime(3) | no |  | now | When the row was created. |
| `updatedAt` | datetime(3) | no |  | auto | When the row was last changed. |

### SupplierMaterial

A material a supplier sells, with its price. One row per supplier and material.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `supplierId` | int | no | PK, FK |  | The supplier. The row goes with the supplier when it is deleted. Points to `Supplier`. |
| `materialId` | int | no | PK, FK |  | The material. Points to `Material`. |
| `unitPrice` | int | no |  |  | Initial unit price in yen; copied to a purchase order line, where it can be changed. |

## Sale

### QtReference

A quotation (QT). Confirming it makes one production order.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `qtNumber` | varchar(191) | no | UK |  | QT number. Unique. |
| `qtDate` | date | no |  |  | Date of the QT. |
| `customerId` | int | no | FK |  | The customer. Points to `Customer`. |
| `notes` | text | no |  |  | Free notes. |
| `customerPoNumber` | varchar(191) | no |  |  | Number of the customer's purchase order (may be empty). |
| `customerPoDate` | date | yes |  |  | Date of the customer's purchase order. |
| `status` | varchar(191) | no |  | Draft | `Draft` or `Confirmed`. |
| `productionOrderId` | int | yes | FK, UK |  | The production order made by Confirm. Unique, so a QT makes only one order. Points to `ProductionOrder`. |
| `createdAt` | datetime(3) | no |  | now | When the row was created. |
| `updatedAt` | datetime(3) | no |  | auto | When the row was last changed. |

### QtLine

A product line of a QT. One row per QT and product.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `qtId` | int | no | FK |  | The QT. The line goes with the QT when it is deleted. Points to `QtReference`. |
| `productId` | int | no | FK |  | The product. Points to `Product`. |
| `quantity` | int | no |  |  | Quantity quoted. |
| `unitPrice` | int | no |  |  | Unit price in yen. The amount (quantity x unit price) is computed, not stored. |

- Unique together: `qtId` + `productId`.

### ProductionOrder

The factory order made by Confirm QT. Its status (Draft, In Progress, Completed) is computed from its processes.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `orderNumber` | varchar(191) | no | UK |  | Order number (ORD-yyyy-0001), given by the server. Unique. |
| `qtId` | int | no | FK |  | The QT it was made from. Points to `QtReference`. |
| `customerId` | int | no | FK |  | The customer, copied from the QT. Points to `Customer`. |
| `orderDate` | date | no |  |  | Date of the order. |
| `notes` | text | no |  |  | Free notes. |
| `startedAt` | datetime(3) | yes |  |  | When production started. Empty before the start; after it the products and processes are locked. |
| `createdAt` | datetime(3) | no |  | now | When the row was created. |
| `updatedAt` | datetime(3) | no |  | auto | When the row was last changed. |

### OrderLine

A product line of a production order, copied from the QT line.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `orderId` | int | no | FK |  | The order. The line goes with the order when it is deleted. Points to `ProductionOrder`. |
| `productId` | int | no | FK |  | The product. Points to `Product`. |
| `quantity` | int | no |  |  | Quantity to make. |
| `unitPrice` | int | no |  |  | Agreed unit price in yen. |

### OrderProcess

One manual step of making a line (cutting, assembly, testing, ...), in order.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `lineId` | int | no | FK |  | The order line. The process goes with the line when it is deleted. Points to `OrderLine`. |
| `sequence` | int | no |  |  | Position of the step, from 1. |
| `name` | varchar(191) | no |  |  | Name of the step. |
| `instructions` | text | no |  |  | How to do the step (may be empty). |
| `status` | varchar(191) | no |  | Not Started | `Not Started`, `In Progress` or `Completed`. |
| `completedQuantity` | int | no |  | 0 | Quantity finished so far, from 0 up to the quantity of the line. |

### ProgressEntry

History of progress: every time a process is updated. Never changed or deleted.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `processId` | int | no | FK |  | The process. Points to `OrderProcess`. |
| `status` | varchar(191) | no |  |  | Status set by this entry. |
| `completedQuantity` | int | no |  |  | Quantity finished at that time. |
| `workDate` | date | no |  |  | Date of the work. |
| `note` | text | no |  |  | Note (needed when a Completed process is reopened). |
| `userId` | int | no | FK |  | Who recorded it. Points to `User`. |
| `at` | datetime(3) | no |  | now | When the row was written. |

## Accounting

### Invoice

An invoice for a Completed order: a copy of the order as it was. One per order.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `invoiceNumber` | varchar(191) | no | UK |  | Invoice number (INV-yyyy-0001). Unique. |
| `invoiceDate` | date | no |  |  | Date of the invoice. |
| `orderId` | int | no | FK, UK |  | The order. Unique, so an order is billed once. Points to `ProductionOrder`. |
| `customerName` | varchar(191) | no |  |  | Customer name, copied when issued. |
| `customerAddress` | text | no |  |  | Customer address, copied when issued. |
| `total` | int | no |  |  | Total in yen. |
| `status` | varchar(191) | no |  | Unpaid | `Unpaid` or `Paid`. |
| `createdAt` | datetime(3) | no |  | now | When the row was created. |

### InvoiceLine

A line of an invoice, with the product data copied when it was issued.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `invoiceId` | int | no | FK |  | The invoice. The line goes with the invoice. Points to `Invoice`. |
| `productCode` | varchar(191) | no |  |  | Product code, copied. |
| `productName` | varchar(191) | no |  |  | Product name, copied. |
| `quantity` | int | no |  |  | Quantity billed. |
| `unitPrice` | int | no |  |  | Unit price in yen. |
| `amount` | int | no |  |  | Quantity x unit price. |

### Payment

The one full payment of an invoice.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `invoiceId` | int | no | FK, UK |  | The invoice. Unique: one payment per invoice. Points to `Invoice`. |
| `paymentDate` | date | no |  |  | Date of the payment. |
| `amount` | int | no |  |  | Amount in yen. Must equal the total of the invoice. |

### Receipt

The receipt issued when an invoice is paid.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `receiptNumber` | varchar(191) | no | UK |  | Receipt number (RC-yyyy-0001). Unique. |
| `invoiceId` | int | no | FK, UK |  | The invoice. Unique: one receipt per invoice. Points to `Invoice`. |
| `receiptDate` | date | no |  |  | Date of the receipt. |
| `customerName` | varchar(191) | no |  |  | Customer name, copied. |
| `customerAddress` | text | no |  |  | Customer address, copied. |
| `amount` | int | no |  |  | Amount received in yen. |

## Purchase and stock

### PurchaseOrder

A purchase order (PO) to a supplier.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `poNumber` | varchar(191) | no | UK |  | PO number (PO-yyyy-0001). Unique. |
| `supplierId` | int | no | FK |  | The supplier. Points to `Supplier`. |
| `department` | varchar(191) | no |  |  | Department the purchase is for (a plain list, not a permission). |
| `requiredDate` | date | no |  |  | Date the goods are needed. |
| `notes` | text | no |  |  | Free notes. |
| `status` | varchar(191) | no |  | Draft | `Draft`, `Sent` or `Received`. |
| `total` | int | no |  | 0 | Sum of the line amounts, in yen. |
| `receivedAt` | datetime(3) | yes |  |  | When the status became Received; the stock was added then, once. |
| `createdBy` | int | no | FK |  | The user who made the PO. Points to `User`. |
| `createdAt` | datetime(3) | no |  | now | When the row was created. |
| `updatedAt` | datetime(3) | no |  | auto | When the row was last changed. |

### PurchaseOrderLine

A material on a purchase order. Lines change only while the PO is Draft.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `poId` | int | no | FK |  | The PO. The line goes with the PO when it is deleted. Points to `PurchaseOrder`. |
| `materialId` | int | no | FK |  | The material (one the supplier sells). Points to `Material`. |
| `quantity` | decimal(14,3) | no |  |  | Quantity ordered. |
| `unit` | varchar(191) | no |  |  | Unit of the material, copied. |
| `unitPrice` | int | no |  |  | Unit price in yen; starts from the supplier's price. |
| `amount` | int | no |  |  | Quantity x unit price. |
| `lotNumber` | varchar(191) | yes |  |  | Lot typed for this line when the PO is received; the received quantity goes into it. |

### PurchasePayment

The one payment of a received purchase order. It does not go through the Accounting tables.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `poId` | int | no | FK, UK |  | The PO. Unique: one payment per PO. Points to `PurchaseOrder`. |
| `paymentDate` | date | no |  |  | Date of the payment. |
| `amount` | int | no |  |  | Amount in yen. Must equal the total of the PO. |
| `method` | varchar(191) | no |  |  | How it was paid. |
| `referenceNo` | varchar(191) | no |  |  | Reference number of the payment (may be empty). |
| `note` | text | no |  |  | Free note. |

### StockChange

History of every change of a lot: by hand, by the start of an order, or by receiving a PO. Never changed or deleted.

| Column | Type | Null | Key | Default | Description |
|---|---|---|---|---|---|
| `id` | int | no | PK | auto | Primary key, given by the database. |
| `materialId` | int | no | FK |  | The material. Points to `Material`. |
| `lotNumber` | varchar(191) | no |  |  | The lot that changed. |
| `kind` | varchar(191) | no |  |  | `Add`, `Deduct` or `Adjust`. |
| `change` | decimal(14,3) | no |  |  | Signed quantity added to the lot (negative for a deduction). |
| `balance` | decimal(14,3) | no |  |  | Quantity of the lot after the change. |
| `changeDate` | date | no |  |  | Date of the change. |
| `note` | text | no |  |  | Reason (needed for Adjust). |
| `initial` | boolean | no |  | false | True for the first stock of a material; a material with a later change cannot be deleted. |
| `orderId` | int | yes | FK |  | The production order whose start took the stock (if any). Points to `ProductionOrder`. |
| `purchaseOrderId` | int | yes | FK |  | The PO whose receiving added the stock (if any). Points to `PurchaseOrder`. |
| `userId` | int | no | FK |  | Who made the change. Points to `User`. |
| `at` | datetime(3) | no |  | now | When the row was written. |
