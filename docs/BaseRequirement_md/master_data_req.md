# Master Data Requirement

Example domain: **Refrigerator Factory**

## Entities

- **Customer** — e.g. "ABC Appliance Store"
- **Supplier** — e.g. "Compressor Co.", "Steel Sheet Co."
- **Product (Finished Good)** — e.g. "Refrigerator 2-Door 15Q", "Refrigerator 1-Door 7Q"
- **Material (Component / Raw Material)** — e.g. Compressor, Door Panel, Shelf, Insulation Foam, Thermostat, Steel Sheet
- **BOM (Bill of Materials)** — which Materials + Qty make 1 Product
- **Unit of Measure (UoM)** — pcs, kg, m, set
- **Warehouse** — Raw Material Warehouse, Finished Goods Warehouse
- **Stock** — Qty on hand per Product/Material per Warehouse
- **Machine / Line** — Pressing Line, Assembly Line, Foaming Line, QC Station
- **Employee** — Operator, QC Inspector
- **Department / Role** — see [[user_account_req]]

## Relationship Types

### 1-to-N (one record relates to many)

```text
Customer (1) -----> (N) SO
Supplier (1) -----> (N) PO
Product  (1) -----> (N) SO Line
Warehouse(1) -----> (N) Stock
WO       (1) -----> (N) Production Tracking (per process step)
```

One customer can have many Sale Orders. One warehouse holds many stock records (one per product/material).

### N-to-N (many relate to many, needs a bridge table)

```text
Product  (N) <--- BOM ---> (N) Material      [bridge: BOM, with Qty per unit]
Supplier (N) <--- SupplierMaterial ---> (N) Material  [bridge: with Price, Lead Time]
User     (N) <--- UserDepartmentRole ---> (N) Department  [bridge: with Role]
Machine  (N) <--- RoutingStep ---> (N) Product  [bridge: which machine used for which product's process step]
```

A Refrigerator (Product) needs many Materials (Compressor, Door, Shelf...), and a Material (e.g. Steel Sheet) can be used in many Refrigerator models — that's N-to-N, resolved by the **BOM** bridge table carrying `qty_per_unit`.

A Material (e.g. Compressor) can be bought from many Suppliers, and a Supplier can supply many Materials — resolved by **SupplierMaterial**, carrying `price`, `lead_time_days`.

## Example Tables

### Customer

| id | code | name              | tax_id      | payment_terms |
|----|------|-------------------|-------------|----------------|
| 1  | C001 | ABC Appliance Store | 1234567890 | Net 30         |
| 2  | C002 | Best Home Mart    | 9876543210  | Net 15         |

### Supplier

| id | code | name       | tax_id     | payment_terms |
|----|------|------------|------------|----------------|
| 1  | S001 | CompCo     | 1112223334 | Net 30         |
| 2  | S002 | SteelCo    | 5556667778 | Net 15         |
| 3  | S003 | BackupCo   | 9990001112 | Net 30         |

### Unit of Measure (UoM)

| id | code | name     |
|----|------|----------|
| 1  | pcs  | Piece    |
| 2  | kg   | Kilogram |
| 3  | m    | Meter    |
| 4  | set  | Set      |

### Warehouse

| id | code | name                      | type           |
|----|------|---------------------------|----------------|
| 1  | WH-R | Raw Material Warehouse    | raw_material   |
| 2  | WH-F | Finished Goods Warehouse  | finished_goods |

### Product

| id | code  | name                      | uom |
|----|-------|---------------------------|-----|
| 1  | RF-2D | Refrigerator 2-Door 15Q   | pcs |
| 2  | RF-1D | Refrigerator 1-Door 7Q    | pcs |

### Material

| id | code | name            | uom |
|----|------|-----------------|-----|
| 1  | COMP | Compressor      | pcs |
| 2  | DOOR | Door Panel      | pcs |
| 3  | FOAM | Insulation Foam | kg  |
| 4  | STEEL| Steel Sheet     | kg  |

### BOM (bridge: Product <-> Material)

| product_id | material_id | qty_per_unit |
|------------|--------------|--------------|
| 1 (RF-2D)  | 1 (COMP)     | 1            |
| 1 (RF-2D)  | 2 (DOOR)     | 2            |
| 1 (RF-2D)  | 3 (FOAM)     | 3.5          |
| 2 (RF-1D)  | 1 (COMP)     | 1            |
| 2 (RF-1D)  | 2 (DOOR)     | 1            |

Notice Material `COMP` (Compressor) is used by both products — this is why Product<->Material is N-to-N, not 1-to-N.

### SupplierMaterial (bridge: Supplier <-> Material)

| supplier_id | material_id | price | lead_time_days |
|-------------|-------------|-------|-----------------|
| 1 (CompCo)  | 1 (COMP)    | 45.00 | 14              |
| 2 (SteelCo) | 4 (STEEL)   | 1.20  | 7               |
| 3 (BackupCo)| 1 (COMP)    | 48.00 | 10              |

Compressor can be sourced from more than one supplier — also N-to-N.

### Stock (1 record per Product/Material per Warehouse)

| id | item_type | item_id     | warehouse_id | qty_on_hand |
|----|-----------|-------------|--------------|-------------|
| 1  | material  | 1 (COMP)    | 1 (WH-R)     | 120         |
| 2  | material  | 4 (STEEL)   | 1 (WH-R)     | 800         |
| 3  | product   | 1 (RF-2D)   | 2 (WH-F)     | 35          |
| 4  | product   | 2 (RF-1D)   | 2 (WH-F)     | 50          |

### Machine / Line

| id | code  | name            | capacity_per_day |
|----|-------|-----------------|-------------------|
| 1  | LN-01 | Pressing Line   | 200 pcs           |
| 2  | LN-02 | Assembly Line   | 150 pcs           |
| 3  | LN-03 | Foaming Line    | 180 pcs           |
| 4  | QC-01 | QC Station      | 300 pcs           |

### RoutingStep (bridge: Product <-> Machine, process sequence)

| product_id | step_no | process_name | machine_id   |
|------------|---------|---------------|--------------|
| 1 (RF-2D)  | 1       | Pressing      | 1 (LN-01)    |
| 1 (RF-2D)  | 2       | Foaming       | 3 (LN-03)    |
| 1 (RF-2D)  | 3       | Assembly      | 2 (LN-02)    |
| 1 (RF-2D)  | 4       | QC            | 4 (QC-01)    |

### Employee

| id | code | name        | position       |
|----|------|-------------|----------------|
| 1  | E001 | Somchai     | Operator       |
| 2  | E002 | Suda        | QC Inspector   |
| 3  | E003 | Alice       | Sales Manager  |

### Department

| id | name       |
|----|------------|
| 1  | Sale       |
| 2  | Factory    |
| 3  | Purchase   |
| 4  | Accounting |

### Role

| id | name    |
|----|---------|
| 1  | Admin   |
| 2  | Manager |
| 3  | Worker  |

### UserDepartmentRole (bridge: User <-> Department, with Role)

| user_id       | department_id | role_id     |
|---------------|----------------|-------------|
| 3 (Alice)     | 1 (Sale)       | 2 (Manager) |
| 3 (Alice)     | 3 (Purchase)   | 3 (Worker)  |
| 1 (Somchai)   | 2 (Factory)    | 3 (Worker)  |

### SO (Sale Order) + SO Line

| id | customer_id | so_date    | status    |
|----|-------------|------------|-----------|
| 1  | 1 (C001)    | 2026-10-01 | Confirmed |

| so_id | product_id   | qty | unit_price |
|-------|--------------|-----|------------|
| 1     | 1 (RF-2D)    | 10  | 350.00     |
| 1     | 2 (RF-1D)    | 20  | 250.00     |

### PO (Purchase Order) + PO Line

| id | supplier_id | po_date    | status  |
|----|-------------|------------|---------|
| 1  | 1 (CompCo)  | 2026-09-20 | Approved|

| po_id | material_id | qty | unit_price |
|-------|-------------|-----|------------|
| 1     | 1 (COMP)    | 50  | 45.00      |

## Summary Diagram

```text
Customer --1:N-- SO --1:N-- SO Line --N:1-- Product
Supplier --1:N-- PO --1:N-- PO Line --N:1-- Material
Supplier --N:N-- Material   (via SupplierMaterial)
Product  --N:N-- Material   (via BOM, qty_per_unit)
Warehouse--1:N-- Stock --N:1-- Product / Material
User     --N:N-- Department (via UserDepartmentRole, with Role)
```
