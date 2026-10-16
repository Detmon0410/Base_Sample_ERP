# ER Diagram

Entities of the Mini ERP (branch `mini-erp`). Source: the `Table(...)` sketches in [docs/api](../docs/api/README.md). Only `User` exists in the backend today; the rest is the contract the backend has to build.

```mermaid
erDiagram
    USER {
        int id PK
        string name
        string department
        string email UK
        string password_hash
        string role "Admin | Worker"
        datetime last_login_at
    }
    CUSTOMER {
        int id PK
        string name
        string address
        string email
        string telephone
    }
    PRODUCT {
        int id PK
        string code UK
        string name
        int price
    }
    MATERIAL {
        int id PK
        string code UK
        string name
        decimal min_level "optional"
    }
    PRODUCT_BOM {
        int product_id FK
        int material_id FK
        decimal quantity
    }
    MATERIAL_LOT {
        int material_id FK
        string lot_number "UK with material_id"
        decimal quantity
    }
    STOCK_CHANGE {
        int id PK
        int material_id FK
        string lot_number
        string kind "Add | Deduct | Adjust"
        decimal change
        decimal balance
        date change_date
        string note
        bool initial
        int order_id FK "optional"
        int user_id FK
        datetime at
    }
    QT_REFERENCE {
        int id PK
        string qt_number UK
        date qt_date
        int customer_id FK
        string notes
        string file_name
        string file_type
        string file_path
    }
    PRODUCTION_ORDER {
        int id PK
        string order_number UK
        int qt_id FK
        int customer_id FK
        date order_date
        string notes
        datetime started_at "null until started"
    }
    ORDER_LINE {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
        int unit_price
    }
    ORDER_PROCESS {
        int id PK
        int line_id FK
        int sequence
        string name
        string instructions
        string status "Not Started | In Progress | Completed"
        int completed_quantity
    }
    PROGRESS_ENTRY {
        int id PK
        int process_id FK
        string status
        int completed_quantity
        date work_date
        string note
        int user_id FK
        datetime at
    }
    INVOICE {
        int id PK
        string invoice_number UK
        date invoice_date
        int order_id FK,UK
        string customer_name "snapshot"
        string customer_address "snapshot"
        int total
        string status "Unpaid | Paid"
    }
    INVOICE_LINE {
        int invoice_id FK
        string product_code "snapshot"
        string product_name "snapshot"
        int quantity
        int unit_price
        int amount
    }
    PAYMENT {
        int invoice_id FK,UK
        date payment_date
        int amount
    }
    RECEIPT {
        int id PK
        string receipt_number UK
        int invoice_id FK,UK
        date receipt_date
        string customer_name "snapshot"
        string customer_address "snapshot"
        int amount
    }

    CUSTOMER ||--o{ QT_REFERENCE : "has"
    CUSTOMER ||--o{ PRODUCTION_ORDER : "orders"
    QT_REFERENCE ||--o{ PRODUCTION_ORDER : "origin of"
    PRODUCTION_ORDER ||--|{ ORDER_LINE : "contains"
    PRODUCT ||--o{ ORDER_LINE : "ordered as"
    ORDER_LINE ||--|{ ORDER_PROCESS : "is made by"
    ORDER_PROCESS ||--o{ PROGRESS_ENTRY : "records"
    USER ||--o{ PROGRESS_ENTRY : "writes"
    PRODUCT ||--o{ PRODUCT_BOM : "needs"
    MATERIAL ||--o{ PRODUCT_BOM : "used in"
    MATERIAL ||--o{ MATERIAL_LOT : "kept in"
    MATERIAL ||--o{ STOCK_CHANGE : "history"
    USER ||--o{ STOCK_CHANGE : "makes"
    PRODUCTION_ORDER o|--o{ STOCK_CHANGE : "start deducts"
    PRODUCTION_ORDER ||--o| INVOICE : "billed by"
    INVOICE ||--|{ INVOICE_LINE : "contains"
    INVOICE ||--o| PAYMENT : "paid by"
    INVOICE ||--o| RECEIPT : "proved by"
```

## Notes

- `Invoice` and `Receipt` copy the customer name, address and product data when they are issued (a **snapshot**), so later changes to master data do not change them.
- An order is billed once (`order_id` unique on `Invoice`), and an invoice has at most one payment and one receipt.
- `Order status` (New, In Progress, Completed) is **computed** from the processes. It is not a column.
- Stock status (`Normal`, `Low`, `Out`) is computed from the lot totals and `min_level`.
