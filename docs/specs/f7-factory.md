# F7 Spec — Factory module (F1–F5)

Status: **APPROVED with the suggested answers (★) for Q1–Q14. BUILT (F1–F5) with mock data** · API: [../api/factory.md](../api/factory.md) · the differences from this draft are in section 9
Rule as before: spec → review → build with mock data → API doc → tests.

Sources: `BaseRequirement_md/Factory_req.md` (flow and documents) · `docs/frontend-plan.md` §3.4 (pages F1–F5) · `docs/test.txt` section 3 (the checklist: F1, F2–F3, F4, F5, all still open) · `docs/pages-progress.md` (Factory 0 / 5).

Why now: everything Factory needs already exists as master data (products with **BOM** and **routing steps**, machines / lines, employees, warehouses) and Sale can already send an order to the factory by hand. The shared parts exist too (detail sheet, status stepper, status history stepper, availability card, document actions, print, lists with filters, tests).

Carried-over decisions: JPY only · desktop (≥ 1280px, reflows at 200% zoom) · EN first, JA keys empty with EN fallback · no visible page title (breadcrumb only) · details open as a sheet from the right · **manual first** (no status changes by itself: every step is a button a person presses, with a history line) · tables 15px `#666`, quiet header buttons, plain cells that look like text until hovered, red bin icons.

---

## 1. The main idea of this module: progress you can see

Factory people (and Sale people who wait for the goods) want to know **how far each job is**, not read a table. So the Work Order list is a **board of cards**, each card shows the progress of one Work Order at a glance:

```text
┌───────────────────────────────────────────┐
│ WO-2026-0003                  [In process] │
│ RF-2D · Refrigerator 2-Door 15Q   × 20 pcs │
│ for SO-2026-0001 · ABC Appliance Store     │
│                                            │
│  (✓)──(✓)──(●)──( )──( )         3 of 5    │  ← the routing steps of the product
│  Cut  Press Foam Asm  QC                   │
│                                            │
│  Now: Foaming · LN-02 Foaming Line         │
│  ████████░░░░  12 / 20 pcs   (60 %)        │  ← quantity of the step that is running
│  Plan 10-08 → 10-14        ⚠ 2 days late   │
└───────────────────────────────────────────┘
```

- the **step row** is a mini stepper: ✓ green = done, ● blue = running now, ○ grey = waiting (same icons and colours everywhere);
- **"Now"** names the step that is running, its machine / line and the operator; the bar shows completed / planned quantity of that step;
- a **late** WO (plan finish passed, not finished) gets an amber line, nothing changes by itself (same as the expired quotation);
- the same card look is used on the shop-floor page (F4), only bigger, with the **Start / Done** buttons.

Above the board: the **status stepper** that Sale uses (Draft → Scheduled → In process → Finished, + Cancelled) with the number of Work Orders in each; pressing a step filters the cards. Filters bar (Filters menu: product, sales order, date range) and search are the same as the Sale lists. A **Cards | Table** switch lets people who prefer a table use the same list.

---

## 2. Scope and flow

| ID | Page | Route | Pri |
|---|---|---|---|
| F1 | Work Orders (board of cards, or table) | `/factory/work-orders` | P1 |
| F2 | Work Order form (new / edit a draft) | `/factory/work-orders/new`, `/:id` | P1 |
| F3 | Work Order detail | `/factory/work-orders/:id` | P1 |
| F4 | Production tracking (shop floor) | `/factory/tracking` | P1 |
| F5 | Finished Goods Transfer (list + sheet) | `/factory/transfers`, `/new`, `/:id` | P1 |

```text
Sale sends an SO to the factory ─► Create WO (from an SO line) ─► Schedule plan dates ─► Start
   ─► steps: Start step → Done (qty completed / defect) … ─► Finish WO ─► Finished Goods Transfer ─► Sale delivers
```

Form and detail of one WO are **one sheet** (F2 + F3), like the Sale documents: a draft opens editable, other statuses read-only with the actions of that status.

Build order: **shared progress parts → F1 Work Orders list → F2–F3 sheet → F4 tracking → F5 transfers → Sale links (the SO sheet shows its WOs).**

---

## 3. Who can do what

| Who | Can |
|---|---|
| Factory **Worker** | create and edit WO **drafts**, Start / Done the steps in tracking, create a transfer draft |
| Factory **Manager** | everything a Worker can, **plus** Schedule, Start / Finish a WO, Cancel after scheduling, Revert, confirm a transfer (Q2) |
| Sale people | **read only**: the Factory menu is hidden, but the SO sheet shows the WO number, status and progress (Q11) |
| **Admin** | everything |
| Anyone else | 403 page (already built) |

Buttons that a user may not press are not shown (never an enabled button that fails); the API enforces the same.

---

## 4. Documents, statuses and actions

Numbers: `WO-2026-0001`, `FT-2026-0001` (Finished goods Transfer), made by the server on the first save (Q13).

### 4.1 Work Order (F1–F3)

Fields: WO No., date, **sales order + line** (one WO per SO line, Q3), product (from the line), quantity to produce, **plan start**, **plan finish**, remarks.
The **steps** are copied from the routing of the product when the WO is created (step no., process name, machine); each step has its own tracking (4.2). The **materials** are the BOM × quantity (read only).

| Status | Meaning | Buttons (who) |
|---|---|---|
| **Draft** | being prepared | Save · Delete · **Schedule** (needs both plan dates) (Manager) · Cancel |
| **Scheduled** | dates agreed | **Start** (Manager / Worker, Q2) · Back to Draft (edit dates) · Cancel (Manager, reason) |
| **In process** | at least one step started | **Finish** (when every step is Done, Q4) · Cancel (Manager, reason) |
| **Finished** | produced quantity known | Create transfer · Revert (Manager, reason) |
| **Cancelled** | stopped | Revert (Manager, reason) |

Every button asks to confirm (with an optional note, or a required reason for Cancel / Revert) and writes a **status history line** (the history stepper that Sale uses).

### 4.2 Production tracking (F4)

One row per step of a WO: step no. and name, **machine** (default from the routing, can be changed), **operator** (an employee, chosen when the step starts, Q7), start time, end time, quantity completed, quantity defect, status **Pending → In progress → Done**.

- **Start** (step): choose / confirm operator and machine; time = now. A step can start when the step before it is Done (Q5); the first Start moves a Scheduled WO to In process.
- **Done** (step): enter quantity completed and defect (defaults: completed = WO quantity, defect = 0); time = now.
- The produced quantity of the WO = quantity completed of the **last** step (Q6).
- A wrong click is undone by a Manager (**Reopen step**, with a reason).

### 4.3 Finished Goods Transfer (F5)

Fields: FT No., date, WO (Finished only), product, quantity, **to warehouse** (a finished-goods warehouse), remarks. Quantity ≤ produced − already transferred; several partial transfers are possible (Q10).

| Status | Buttons |
|---|---|
| **Draft** | Save · Delete · **Transfer** (Manager, Q2) |
| **Transferred** | Revert (Manager, reason) |

When the last piece is transferred the WO card shows "All transferred". Sale then presses its own **Mark ready** (manual, Q11).

---

## 5. Pages in detail

### F1 Work Orders — `/factory/work-orders`
Status stepper (5 steps with counts) · search (WO no., product, SO) · Filters menu (status is the stepper, product, sales order, plan date range) · **Cards | Table** switch · New Work Order button.
- **Cards**: the card of section 1, 3 per row at 1280px, 2 below, 1 on a narrow window; the whole card opens the sheet. Sorted by plan finish (soonest first); late ones show a small amber label.
- **Table**: WO No., product, quantity, SO, plan start, plan finish, progress (steps done / total), status. Same table rules, last row "Total N items".
- Beside the board, a panel **"Waiting for a Work Order"**: the sales orders that Sale sent to the factory and that still have SO lines without a WO, each with a **Create WO** button (it opens the form with the line filled). This is how Factory "receives" an SO (Q11).

### F2–F3 Work Order sheet — `/factory/work-orders/new`, `/:id`
Header: title "New Work Order" / "Edit Work Order" (read-only: "Work Order"), quiet icons (print, delete), status buttons, Save. Cards, in this order:
1. **Work order** (number + status at the card title's right end): sales order and line (picker of lines of orders sent to the factory), product (read only), quantity, plan start / plan finish (calendar pickers), remarks.
2. **Progress**: the routing steps as a big stepper with, under every step, machine · operator · start–end time · completed / defect. Pending, running and done steps look different. The running step has its **Done** button, the next one its **Start** button (same as F4).
3. **Materials**: the availability card (Needed / In stock / Left after use, green and red rows) for the quantity of the WO.
4. **Production tracking** table (step, machine, operator, times, completed, defect, status).
5. **Linked documents**: the sales order, the transfers.
6. **Status history** (stepper, newest on top).

### F4 Production tracking — `/factory/tracking`
For the shop floor: **large cards**, one per step that is running or can start now, grouped in three columns **Waiting · Running · Done today** (a simple board). Each card: WO, product, step name, machine, operator, planned quantity, big **Start** / **Done** buttons (≥ 48px). Pressing opens a small dialog (operator, machine, quantities). A filter by machine / line. Auto refresh is not needed; the header Refresh button reloads it.

### F5 Finished Goods Transfer — `/factory/transfers`
List (FT No., date, WO, product, quantity, to warehouse, status) with the status stepper (Draft, Transferred) and the same filters; sheet with the fields of 4.3, **Transfer** button, history, linked WO.

---

## 6. Reused parts (nothing new if it exists)

`DetailSheet`, `DocumentSheet` (print icon, delete, status buttons), `DocumentActions` + `ActionDialog`, `StatusStepper` (+ colours in `STATUS_COLORS`), `ListToolbar` (Filters menu), `DataTable` (+ summary row), `DateField` calendar, `EntitySelect`, `AvailabilityCard`, `HistoryCard`, `LinksCard`, `ListEmpty`, `RouteLoading` (lazy pages), the plain-cell table of the quotation lines (`LineItemsCard` style) for tracking, `PrintDocument` (WO print: a job card with the steps and signature boxes).
**New shared parts** (made once, used by F1, F3 and F4): `StepProgress` (the mini stepper of steps, three sizes), `ProgressBar`, `WorkOrderCard`, and a generic `CardBoard` (the grid of cards with the empty state and loading skeletons) that Stock and Purchase can reuse later.

---

## 7. Mock data and links with the other modules

- Seed: 6 Work Orders covering every status, on the seeded sale orders (one *In production* order has a WO that is 2 of 4 steps done, one *Ready to deliver* order has a finished WO with a transferred FT, one late WO, one cancelled), a few tracking rows with operators from the employees master, 2 transfers.
- Steps come from the **routing** of the product (master data), materials from the **BOM**, machines and operators from **machines / employees**, destination from **warehouses** (type finished goods).
- The mock reads the Sale orders through a small accessor (`getOrders`), so the SO sheet can list its WOs; today it shows "Work order — not recorded" and that placeholder becomes a real link with the WO status.
- No stock movement yet: Stock module is later (materials are only *shown* against the stock on hand, like the Sale availability check).

---

## 8. Questions (suggested answer ★ for each)

| # | Question | Options |
|---|---|---|
| Q1 | The main look of the WO list | ★ cards board with a Cards / Table switch · only cards · only a table |
| Q2 | Who presses what | ★ Worker: drafts, step Start / Done, transfer draft · Manager: Schedule, Finish, Cancel after scheduling, Revert, Transfer · or: everything for both roles |
| Q3 | One WO per … | ★ one WO per **SO line** (quantity can be lowered for a partial run) · one WO per whole SO (several products) |
| Q4 | Finish a WO | ★ only when every step is Done (a Manager may finish early with a reason) · always allowed |
| Q5 | Order of the steps | ★ a step starts only after the previous one is Done (Manager may skip with a reason) · any order |
| Q6 | Produced quantity | ★ = completed quantity of the last step; defects are recorded per step · typed by hand at Finish |
| Q7 | Operator | ★ chosen from the active employees when a step starts · the signed-in user · typed free text |
| Q8 | Machine of a step | ★ default from the routing, can be changed at Start · fixed from the routing |
| Q9 | Materials | ★ show needed / in stock only, no stock movement now · also reserve stock |
| Q10 | Transfers | ★ several partial transfers per WO, total ≤ produced · one transfer for the whole WO |
| Q11 | Link with Sale | ★ Sale keeps its manual **Send to factory** and **Mark ready**; Factory shows "Waiting for a Work Order" and the SO sheet shows its WOs · WO status moves the SO status by itself |
| Q12 | Late jobs | ★ amber "N days late" on the card and the sheet, nothing changes by itself · also a Dashboard alert |
| Q13 | Numbers | ★ `WO-2026-0001`, `FT-2026-0001` like Sale · other format |
| Q14 | Progress number on a card | ★ steps done of total (3 of 5) plus a quantity bar for the running step · a single percentage |

When you answer (or say "take the suggestions"), the build starts in the order of section 2 and each page is tested in the browser as Factory Manager, Factory Worker, a Sale user and a user outside Factory (like Sale). Then `docs/api/factory.md`, automated tests, and the boxes of section 3 in `test.txt` are ticked.

---

## 9. Differences between this draft and what was built

- **The bar on a card shows the steps done of the total** (e.g. 2 of 4 steps, 50 %), not a quantity of the running step: a step only has its completed quantity when it is finished, so a running step has no number to show yet. The produced quantity appears when the work order is finished ("Produced 29 of 30 pcs, all transferred").
- The list is sorted so that the **work in progress comes first** (running, scheduled, draft, finished, cancelled; soonest plan finish inside each), because "soonest plan finish first" put old finished jobs on top.
- The three shop-floor columns and the Cards | Table switch are as drafted; the choice of Cards or Table is remembered in the browser.
- New demo user **Yuki Tanaka** (Factory Manager, `yuki@kanou.test` / `yuki1234`); Ken Suzuki is the Factory Worker.
- **Not built yet:** printing a Work Order (the job card with signature boxes) and the "Late" alert on the Dashboard (Q12 asked only for the label on the card and the sheet).
