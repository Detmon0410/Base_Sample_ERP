# Additional Requirement

## 1. Sale — Check Material Availability to Produce

When creating a QT/SO, Sale needs to know if there is enough Material in stock to produce the requested Product (based on [[master_data_req]] BOM).

```text
SO Line (Product, Qty requested)
   |
   v
Explode BOM (Product -> Material, qty_per_unit)
   |
   v
Required Qty = qty_per_unit x Qty requested
   |
   v
Compare vs Stock.qty_on_hand (per Material, Raw Material Warehouse)
   |
   v
Result: Can Produce (Yes/No) + Shortfall list (Material, Missing Qty)
```

Example: SO requests 10x RF-2D. BOM needs 10x COMP, 20x DOOR, 35kg FOAM. If Stock has only 8 COMP available, result = "Cannot fully produce — short 2 COMP".

## 2. Purchase — Stock Shortage / Near-Shortage Status

Purchase needs visibility of stock levels to decide what to reorder, using a **Reorder Point** per Material.

### Master Data addition

| Material | reorder_point | reorder_qty |
|----------|----------------|-------------|
| COMP     | 50             | 100         |
| STEEL    | 500 kg         | 1000 kg     |

### Status Rule

```text
qty_on_hand <= reorder_point           -> Shortage
reorder_point < qty_on_hand <= 1.2x reorder_point -> Near Shortage
qty_on_hand > 1.2x reorder_point       -> Normal
```

### Example Dashboard

| Material | qty_on_hand | reorder_point | status        |
|----------|-------------|----------------|----------------|
| COMP     | 40          | 50             | Shortage       |
| STEEL    | 520         | 500            | Near Shortage  |
| DOOR     | 300         | 100            | Normal         |

Purchase uses this list to decide which PO to create next, and for which Supplier (via SupplierMaterial).

## 3. Traceable Product History by Product ID

Every finished Product unit (or batch) should be traceable back through its full chain: which WO produced it, which Materials/batches went into it, which SO it was delivered against, and its Invoice.

```text
Product (by id / batch no.)
   |
   v
WO (which Work Order produced it, qty, plan/actual date)
   |
   v
Material consumed (per BOM, with batch/lot no. if tracked)
   |
   v
Production Tracking (process steps, operator, machine used)
   |
   v
Finished Goods Transfer (to Sale)
   |
   v
SO / Delivery Note (which customer received it)
   |
   v
Invoice (Accounting)
```

### Example Trace Table

| product_id | wo_id | material_consumed         | delivered_to (SO) | invoice_no |
|------------|-------|----------------------------|--------------------|------------|
| RF-2D #0012| WO-005| COMP(lot A), DOOR(lot B)   | SO-0031 (C001)     | INV-0041   |

Given a Product ID, the system should answer: "which WO made it, what materials/lots went in, who worked on it, which customer received it, and which invoice it was billed on."
