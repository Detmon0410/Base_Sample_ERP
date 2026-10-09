# T1 — Playwright test plan

Status: **IN PROGRESS** — smoke test ([report](../reports/e2e-smoke-2026-10-09.md)) and B1 ([report](../reports/e2e-b1-2026-10-09.md)) are done; next B2 · Purpose: find out (1) whether the system follows the workflow from start to finish, (2) whether the code has bugs, (3) where the UX should be changed. Flow of the system: [../api/README.md](../api/README.md) and [f13-workflow-test.md](f13-workflow-test.md).

**Deliverable:** a report in three lists — *Bugs*, *Workflow differences*, *UX suggestions* — with the video / trace of every case that failed. The result is not known yet: the system has never been run end to end by a script.

## 1. How the tests run

| Rule | Why |
|---|---|
| Run on the **mock** with `VITE_MOCK_SEED=empty` | No backend yet; every case starts from no documents |
| **Reset all data before every case** (clear `localStorage` and `sessionStorage`) | Documents would pile up between cases |
| **Several users = several tabs of one browser context** | The data lives in `localStorage` (shared by the context); the sign-in lives in `sessionStorage` (one per tab) |
| A case **fails on any console error or failed request** | Finds hidden bugs while a test passes |
| Video and trace only for failed cases; the two long end-to-end cases (B1, B2) always | Size of the files; the long ones are used to explain the flow |
| Projects: desktop 1280, tablet 820, phone 375 | The three layouts of f15 / f16 |
| Find elements by role and label (`getByRole`, `getByLabel`), not by CSS | The screen texts are English and labelled |

## 2. Data to prepare

**Already there** (empty seed): the 9 test users (Admin and a Manager and a Worker of each department), customers, suppliers with prices and lead times, products RF-2D and RF-1D with BOM and routing steps, machines, production employees, the two warehouses, units, the chart of accounts, VAT 10 %.

**To prepare:**

1. **Opening stock of every material** (all start at 0, so nothing can be produced): a helper where a Worker makes a stock adjustment (opening balance) and a Manager approves it, for every material of the BOM of both products.
2. **Step helpers**, reused by every case: `signInAs(role)`, `makeQuotationToOrder()`, `sendToFactory()`, `produceUnits(n)`, `receivePurchaseOrder()` — so a short case does not start from zero.
3. **Snapshots of a middle state** (optional): save the browser's change log (`kanou.testlog.v1`) after a stage and load it as the start of the next case. Faster than clicking through; **not proven yet**, to be tried first.
4. **Bad data for the negative cases:** a duplicate code, a quantity over what is left, a customer already used by a document, a purchase order whose maker tries to approve it.

## 3. Test list

### A. Access and permissions
1. Sign in as each of the 9 users: the menu shows only the user's departments (Admin all).
2. Open a page of another department by its URL: the 403 page.
3. Worker and Manager see different buttons (Approve, Schedule, Post, Close ...) as in the permission matrix.
4. Log out, wrong password, inactive account, no token.

### B. The workflow from start to finish (long cases, video)
1. **Sale to cash:** quotation → send → accept → Sale Order → request confirm → Manager approves → send to factory → Work Order → schedule → start each step → finish → make S/N → transfer to the warehouse → mark ready → delivery note (with S/N) → confirm → invoice → issue → receipt → Paid.
2. **Purchase to payment:** material short → Create PO → pending approval → Manager approves → send → goods receipt → post → stock in → bill → approve → payment.
3. **Stock adjustment:** Worker makes it, Manager approves / rejects; the balance and the movements change.
4. **Unusual paths:** reject a quotation, cancel an order in production, revert a status, a rejected PO corrected and sent again, a cancelled Work Order gives its quantity back.
5. **Hand-over between departments:** what one department finishes appears in the *Waiting* panel of the next (waiting for an invoice, for a bill, for goods, for a Work Order).

### C. Business rules (negative cases: must be refused)
- Mark ready before the goods are in the warehouse → `NOT_READY`.
- Deliver more than the stock → `NOT_ENOUGH_STOCK`.
- The maker approves their own PO → `CANNOT_APPROVE_OWN`.
- Start a production step out of order (Worker); finish a Work Order with steps not done.
- A Work Order or transfer quantity over what is left; the quantity field cannot be typed.
- Delete a used record → `IN_USE`; duplicate code; overlapping price periods.
- An action that does not fit the status → `INVALID_STATUS`; an S/N used twice; a journal entry that does not balance.

### D. Invariants (checked after every case)
Stock never below zero · document numbers run without gaps or duplicates · totals and tax equal the lines · balance = total − paid · status equals the last entry of the history · the status of an S/N agrees with its documents.

### E. Lists and forms
Search, filters, sort, paging, the status stepper counts, the red dot of a new row goes away when the row is opened, validation messages, confirmation dialogs, leaving an unsaved form asks first.

### F. Master data and Users
Add / change / deactivate / delete for all 10 kinds, BOM and routing, a user in several departments, reset password, the last Admin cannot be removed.

### G. Dashboard
The tabs of each role, the numbers of the cards equal the lists, the charts equal their tables, the shortcut boxes open the right page, no made-up numbers on empty data.

### H. Traceability
Search an S/N: the timeline is complete (Work Order, materials, transfer, delivery, invoice).

### I. Responsive and accessibility
- At 1280 / 820 / 375: no horizontal scroll, the menu closes after a page is chosen, cards and stacked tables on the phone.
- **axe-core** on every page; Tab through the main pages; screenshots at 200 % zoom for a person to look at.
- Switch EN / JA: the name of the system changes, no raw translation keys on screen.

### J. Data kept and several tabs
A reload keeps the data; two tabs of different users see each other's changes; *Reset all test data* really clears.

## 4. Order of work

1. Install, config, helpers, opening stock, **smoke test of every page** (A, part of I).
2. **B1** (the longest; shows most problems first).
3. B2, B3, C, D.
4. E to H.
5. Full I, J.
6. The report and a proposal of what to change.

## 5. Limits

- On the mock this finds bugs of the **frontend and the mock**, not of a backend that does not exist. The same scripts can run again against the real API later.
- Look and feel, readability and how it feels to use cannot be judged by a script; it gives screenshots for a person.
- The long cases are slow and their videos are big, so most cases are short, per module.

## 6. Decisions needed

| # | Question | Suggested |
|---|---|---|
| 1 | Where to begin | smoke of every page, then B1 |
| 2 | A bug found | collect in the report first, then choose what to fix |
| 3 | Videos | failed cases only, plus B1 and B2 always |
