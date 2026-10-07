# API — Factory (F1–F5)

Frontend: [specs/f7-factory.md](../specs/f7-factory.md) · mock: `frontend/src/services/mock/factory.js` · services: `frontend/src/services/factory.service.js`.
Envelope, auth, paging and error format: see [README.md](README.md). **Every status change is an explicit action called by a person; the server never moves a status by itself** (a step Start also starts the work order, that is the only side effect, and it is written to the history).

## Access

| Who | Can |
|---|---|
| Factory **Worker** | create / edit / delete **draft** work orders, `start` a scheduled work order, `cancel` a draft or scheduled one, Start / Done a step (a step after a finished one), create / edit / delete **draft** transfers |
| Factory **Manager** and **Admin** | all of the above, plus `schedule`, `back-to-draft`, `finish`, `cancel` a running work order (reason), `revert` (reason), start a step **early** (reason), `reopen` a step (reason), `transfer` and revert a transfer |
| Anyone else | `403 FORBIDDEN` on every `/factory/*` call (the menu is hidden too). Sale people see the work orders of a sales order through the **links** of the sale order, not through this API |

Master data reads (products, routing steps, machines, employees, warehouses, BOM, materials) are open to every signed-in user (see [sale.md](sale.md)).

## Numbers

`WO-2026-0001` (work order) and `FT-2026-0001` (finished goods transfer): prefix, year of the document date, 4 digits, running per type and year, created by the server on the first save.

## Work orders — `/factory/work-orders`

| Method | Path | Notes |
|---|---|---|
| GET | `/factory/work-orders` | list; params `q` (number, product code / name, sales order number, customer), `status`, `product` (id), `saleOrder` (id), `from`, `to` (**plan finish** range), `sort` (`number, planStart, planFinish, qty, status, productCode`, or `board` = running first, then scheduled, draft, finished, cancelled, soonest plan finish first; **default `board`**), `page`, `pageSize`. `meta = { page, pageSize, total, statusCounts }`; `statusCounts` is counted with every filter except `status` (it feeds the status stepper) |
| GET | `/factory/work-orders/:id` | one |
| POST | `/factory/work-orders` | create a **draft**: `{ saleOrderId, productId, qty, planStart?, planFinish?, remarks }`. The order must be **in production** (sent to the factory), the product must be on it and `qty` ≤ the order line quantity − the quantity of its other work orders that are not cancelled (`400` `TOO_MANY` on `qty`). The steps are copied from the **routing of the product**; a product without steps gives `409 NO_ROUTING` |
| PUT | `/factory/work-orders/:id` | change a **draft**: `{ qty, planStart, planFinish, remarks }` (`409 INVALID_STATUS` otherwise); order and product cannot change |
| DELETE | `/factory/work-orders/:id` | delete a **draft** |
| POST | `/factory/work-orders/:id/:action` | `schedule` (draft → scheduled, Manager, **both plan dates required**), `back-to-draft` (scheduled → draft, Manager), `start` (scheduled → in process), `finish` (in process → finished, Manager: when a step is **running** → `409 STEPS_NOT_DONE`; when steps are not done a **note is required**), `cancel` (draft / scheduled: anyone; in process: Manager, **note required**; `409` while transfers exist), `revert` (Manager, **note required**; not a finished order that has a transferred transfer). Body `{ note? }`. Answers the updated work order |
| POST | `/factory/work-orders/:id/steps/:stepId/:action` | `start`: body `{ operatorId, machineId?, note? }`; the step must be pending and the step **before it done** (`409 STEP_ORDER` for a Worker; a Manager may start early with a **note**); the operator is an active employee; the machine defaults to the routing's; the first start moves a scheduled work order to in process. `done`: body `{ qtyDone, qtyDefect }` whole numbers 0 … work order quantity. `reopen` (Manager, **note required**): done → in progress, only while the next step is still pending. Answers the updated work order |
| POST | `/factory/availability` | `{ lines: [{ productId, qty }] }` → the same answer as `POST /sale/availability` (BOM × quantity against the stock on hand; advice only) |
| GET | `/factory/waiting-orders` | the sales orders that are **in production** and still have quantity without a work order: `[{ id, number, customerCode, customerName, deliveryDate, lines: [{ productId, productCode, productName, uom, qty, planned, remaining }] }]` (only lines with `remaining > 0`). A cancelled work order gives its quantity back |

Work order response (besides the stored fields): `saleOrderNumber, customerCode, customerName, productCode, productName, uom, steps[], progress, history[], links[]`.

- `steps[]`: `{ id, stepNo, processName, machineId, machineCode, machineName, operatorId, operatorName, status ("pending" | "in_progress" | "done"), startAt, endAt, qtyDone, qtyDefect, canStart }` (`canStart` = the work order is scheduled / in process, the step is pending and the step before is done).
- `progress`: `{ stepsDone, stepsTotal, currentStep (the running step, else the first step that is not done; null when finished / cancelled), producedQty (completed quantity of the **last** step when it is done), transferredQty (transferred transfers), remainingToTransfer (produced − all transfers, drafts included), late, lateDays }`. `late` = scheduled or in process and `planFinish` is before today; nothing changes by itself.
- `links[]`: the sales order and the transfers (`{ id, type, number, status, to }`).
- The **sale order** response gets `links` of type `workOrder` for every work order of that order (replacing the "not recorded" placeholder).

## Production tracking — `GET /factory/tracking`

The shop-floor board. Param `machine` (id) keeps the steps of one machine / line. Answer: a list of cards `{ column, workOrderId, workOrderNumber, productCode, productName, uom, qty, planFinish, late, stepsTotal, step }` where `step` is the step object above and `column` is
- `running`: the step is in progress;
- `waiting`: the step can start now (`canStart`);
- `done`: the step was finished **today**.
Only scheduled, in process and finished work orders appear.

## Finished goods transfers — `/factory/transfers`

| Method | Path | Notes |
|---|---|---|
| GET | `/factory/transfers` | list; params `q` (number, work order, sales order, product, warehouse), `status`, `from`, `to` (date), `sort` (`number, date, workOrderNumber, qty, status`, default `-date`), `page`, `pageSize`; `meta.statusCounts` like the work orders |
| GET | `/factory/transfers/:id` | one |
| POST | `/factory/transfers` | create a **draft**: `{ workOrderId, qty, date, warehouseId, remarks }`. The work order must be **finished**, the warehouse a **finished goods** warehouse and `qty` ≤ produced − the other transfers (drafts count): `400` `TOO_MANY` on `qty`. Several partial transfers are possible |
| PUT | `/factory/transfers/:id` | change a **draft** |
| DELETE | `/factory/transfers/:id` | delete a **draft** |
| POST | `/factory/transfers/:id/:action` | `transfer` (draft → transferred, Manager), `revert` (Manager, **note required**) |

## Stock (since the Stock module)

`start` of a work order (and the first step's `start`) books the materials out of the raw material warehouse, the transfer `transfer` books the finished goods into the warehouse, and the reverts / `cancel` of a running work order book the opposite movements. Any of them can answer `409 NOT_ENOUGH_STOCK` and then nothing changes. Details: [stock.md](stock.md).

## Errors used (besides the common ones)

| Code | Where | Meaning |
|---|---|---|
| `INVALID_STATUS` (409) | all actions | not possible in the current status |
| `NO_ROUTING` (409) | create a work order | the product has no production steps |
| `STEP_ORDER` (409) | start a step | the step before is not done (Worker) |
| `STEPS_NOT_DONE` (409) | finish | a step is still running |
| `VALIDATION_ERROR` (400) | forms and actions | field codes `REQUIRED`, `INVALID`, `DATE_ORDER` (`planFinish` before `planStart`), `TOO_MANY` (quantity above what is left) |
| `FORBIDDEN` (403) | everywhere | wrong department or role |

## Data model sketch (Prisma)

```prisma
model WorkOrder {
  id           Int      @id @default(autoincrement())
  number       String   @unique
  date         DateTime @db.Date
  saleOrderId  Int
  productId    Int
  qty          Int
  planStart    DateTime? @db.Date
  planFinish   DateTime? @db.Date
  remarks      String   @default("")
  status       String   // draft | scheduled | in_process | finished | cancelled
  steps        WorkOrderStep[]
  transfers    FinishedGoodsTransfer[]
  history      DocumentHistory[]
}

model WorkOrderStep {
  id          Int      @id @default(autoincrement())
  workOrderId Int
  stepNo      Int
  processName String
  machineId   Int?
  operatorId  Int?     // employee
  status      String   // pending | in_progress | done
  startAt     DateTime?
  endAt       DateTime?
  qtyDone     Int?
  qtyDefect   Int?
  @@unique([workOrderId, stepNo])
}

model FinishedGoodsTransfer {
  id          Int      @id @default(autoincrement())
  number      String   @unique
  date        DateTime @db.Date
  workOrderId Int
  qty         Int
  warehouseId Int
  remarks     String   @default("")
  status      String   // draft | transferred
  history     DocumentHistory[]
}
```

`DocumentHistory` is the same table as for the Sale documents (`action`, `status?`, `actor`, `at`, `note?`); the step actions write `step-start`, `step-done`, `step-reopen` lines with no status.

## Backend checklist

- [ ] Factory-department middleware (Worker / Manager / Admin) on `/factory/*`; the rules in the access table
- [ ] Numbering per type and year in a transaction
- [ ] Copy the routing steps into the work order when it is created (later changes to the routing do not change an existing work order)
- [ ] One action endpoint per document type that checks `from` status, the role, the required note and writes `DocumentHistory` in the same transaction
- [ ] Quantity checks: work order ≤ order line − other work orders; transfer ≤ produced − other transfers (in a transaction, so two users cannot both take the last pieces)
- [ ] `GET /factory/waiting-orders` and `GET /factory/tracking` as described
- [ ] `meta.statusCounts` on both lists; the sale order's `links` include its work orders
- [ ] Availability service shared with Sale and Purchase
- [ ] Turn off `VITE_USE_MOCK` and re-run the test list in the spec
