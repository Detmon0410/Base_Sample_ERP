# Factory Requirement

## Flow

1. Receive Sale SO
2. Create WO (Work Order) — referencing the SO
3. Schedule Plan Date (planned start / finish)
4. Track Process (production progress / stages)
5. Send Finished Goods to Sale for Delivery

## Flow Diagram

```text
Receive Sale SO
   |
   v
Create WO
   |
   v
Schedule Plan Date
   |
   v
Track Process
   |
   v
Send Finished Goods to Sale Delivery
```

## Master Data (basic data required, like every ERP)

- **Product / BOM (Bill of Materials)** — materials & qty needed per finished product
- **Routing / Process Step** — production stages (e.g. Cutting, Assembly, QC, Packing)
- **Machine / Line** — production resource used for scheduling
- **Employee / Operator** — who works on each process step
- **Warehouse** — raw material source / finished goods destination

## Documents

### WO (Work Order)

- WO No., Date, reference SO No., Product, Qty to produce
- Plan Start Date, Plan Finish Date
- Status: Draft -> Scheduled -> In Process -> Finished -> Cancelled

### Production Tracking

- WO reference, Process Step, Start Time, End Time, Qty Completed, Qty Defect
- Status per step: Pending -> In Progress -> Done

### Finished Goods Transfer

- Reference WO No., Product, Qty transferred
- From: Factory -> To: Sale / Finished Goods Warehouse
- Status: Draft -> Transferred

## Relations

```text
Sale SO ---> WO ---> Production Tracking (per process step) ---> Finished Goods Transfer ---> Sale Delivery
              |
              v
        Stock (consume Material / produce Finished Goods)
```
