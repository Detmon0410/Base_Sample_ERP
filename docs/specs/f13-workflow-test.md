# F13 — Workflow test branch (`test/workflow`)

Status: **BUILT** (all answers ★ accepted) · Purpose: test the whole system from start to finish **by hand**: the master data is ready to use, and the tester makes every quotation, order and document, department by department.

## What the branch changes

| Part | What it does |
|---|---|
| **Empty start** | `frontend/.env.development` sets `VITE_MOCK_SEED=empty`. The mock then has **no documents and no stock**: no quotations, customer POs, orders, delivery notes, work orders, transfers, purchase orders, receipts, invoices, bills, payments, journal entries, stock movements, adjustments or serial numbers. Numbers start at 0001, and every material starts with 0 in stock (put stock in with a Stock adjustment, reason *Opening balance*, or with a goods receipt). The dashboard shows only real figures. Demo mode (without the variable) and the tests are unchanged. |
| **Master data that exists** | Ordinary records that can be **added to, changed, deactivated and deleted** like any other (a record can be deleted until a document uses it, then it is refused with "in use"): 3 customers, 3 suppliers, 6 materials with their supplier prices and lead times, 2 products with BOM and routing, price lists, 3 production lines, 3 employees (the operators of production). Add your own next to them, or delete them and make your own. |
| **Settings that exist** | What the system needs to work: units of measure (pcs, kg, m, set, box), the two warehouses (Raw Material `WH-R`, Finished Goods `WH-F`), the chart of accounts with its system roles, the 10 % VAT rate, payment methods and the bank account of Accounting. |
| **Users** | An Admin and a Manager and a Worker of each department (see below). They have never signed in. |
| **Data is kept** | Everything the tester makes is kept in the browser, so a reload or a closed browser loses nothing. The browser keeps a **log of every change** (who, what, when) and plays it again on an empty mock when the page opens, with the clock set to the time of each change, so numbers, history and times are exactly as they were. **Reset all test data** (user menu) deletes the log and starts again from nothing. |
| **One sign-in per tab** | In this mode the sign-in lives in the tab, not in the browser. Open one tab per user (Sale in one, Accounting in another) and a change in one tab is played in the others at once (the log is shared), so the requests can be followed from tab to tab. |
| **Request counters** | In the menu, a red **dot** on a group (Sale, Factory ...) and a red **number** on an entry show how many documents **wait now** for the user's department (hover the number to read what it counts; it can be higher than the rows of the page because it also counts what has no document yet, for example goods received that still have no bill). Only what the user can act on is counted (a Worker does not see what needs a Manager). It updates after any change, every 10 seconds, and when the user comes back to the tab. API: `GET /notifications`. |
| **Work that has no row yet** | A number can count work that is not a row of the page yet. So the pages show it: **Customer invoices** has a panel *Waiting for an invoice* (delivered delivery notes with no invoice) and **Supplier bills** a panel *Waiting for a bill* (posted goods receipts with no bill), **Goods receipt** a panel *Waiting for goods* (purchase orders sent and not fully received), each row with a button that opens the new document already made from it. Factory has *Waiting for a work order* the same way. The panels are not drawn when nothing waits. |
| **New rows in the tables** | In every list, a small red **dot** before the first column marks a row that is **new for this user**: a document that arrived or changed (its newest history entry, else its updated time) after the user first appeared in this browser or after the user last opened that row. **Opening the row (clicking it) makes its dot go away.** What the user does to a row while its sheet is open (save, approve, post ...) does not make it new for that user. If it changes again later, the dot comes back. What each user has seen is kept per user in the browser (Reset all test data forgets it). A user's first appearance is the first time they sign in on this browser, so sign in as each user once before the test starts and the requests that come later show up as new. |

## Thai names

The people, the master data (customers, suppliers, materials, products and their production steps, machines, employees, units, warehouses) and the accounting settings (chart of accounts, tax rates, payment methods, bank accounts) have **Thai names** (`frontend/src/services/mock/thai.js`). Codes stay the same (C001, RF-2D, WH-R ...). Screen texts stay English; Thai screen texts are a translation task. What the tester types in Thai is kept as typed.

## Test users

Password `test1234` for all, except the Admin (`admin`).

| User | E-mail | Role |
|---|---|---|
| อภิชาติ รักษ์ระบบ (Admin) | `admin@gmail.com` (password `admin`) | all departments, Users, Master data |
| สมชาย ใจดี / สมหญิง สุขสันต์ (Sale Manager / Worker) | `sale.manager@kanou.test` / `sale.worker@kanou.test` | Sale |
| วิชัย มั่นคง / ประสิทธิ์ ขยันงาน (Factory Manager / Worker) | `factory.manager@kanou.test` / `factory.worker@kanou.test` | Factory and Stock |
| สุดา พิทักษ์ / มานี มีสุข (Purchase Manager / Worker) | `purchase.manager@kanou.test` / `purchase.worker@kanou.test` | Purchase and Stock |
| วรรณา ศรีสุข / นภา ใจเย็น (Accounting Manager / Worker) | `accounting.manager@kanou.test` / `accounting.worker@kanou.test` | Accounting |

## What the counters count

A request is a document that waits for somebody of the department. *Worker* = anyone of the department; *Manager* = needs a Manager (or Admin), who sees both.

| Menu group | Menu entry | Counts | Who |
|---|---|---|---|
| Sale | Sale Orders | orders waiting for confirmation | Manager |
| | Sale Orders | orders ready to deliver | Worker |
| | Delivery Notes | draft delivery notes | Worker |
| Factory | Work Orders | order lines waiting for a work order, scheduled work orders to start | Worker |
| | Work Orders | draft work orders to schedule, running ones with every step done to finish | Manager |
| | FG Transfer | finished work orders with units not transferred yet | Worker |
| | FG Transfer | draft transfers to post | Manager |
| Stock | Stock Adjustment | adjustments waiting for approval | Manager |
| Purchase | Stock Status | materials short or near short and not on order | Worker |
| | Purchase Orders | rejected orders to correct | Worker |
| | Purchase Orders | orders waiting for approval, approved orders to send | Manager |
| | Goods Receipt | purchase orders waiting for goods, draft receipts to post | Worker |
| Accounting | Invoices | delivered delivery notes with no invoice | Worker |
| | Invoices | draft invoices to issue | Manager |
| | Bills | goods received with no bill | Worker |
| | Bills | draft bills to approve | Manager |
| | Receipts | draft receipts of money to confirm | Worker |
| | Payments | draft payments to confirm | Manager |
| | Journal | draft journal entries to post | Manager |

The number of a group is the sum of its entries. An Admin sees every group.

## How to start

```bash
pnpm --filter frontend dev     # or: node node_modules/vite/bin/vite.js  (inside frontend/)
```

Open the address it prints, sign in as the Admin (only the Admin changes master data: menu *Master Data*), look at the master data and change it as you like, then follow the flow: quotation → sale order → work order → purchase → goods receipt → production → transfer → delivery → invoice → payment.

## Limits (it is still a mock, there is no server)

* The data lives in **this browser only** (one browser = one set of data; another browser or computer starts empty). Clearing the site data or **Reset all test data** deletes it.
* Files attached to a customer PO are not kept after a reload.
* Two tabs that change data at the very same moment can end with slightly different data; reload both to get back in line.
* A change that the mock refused (an error) is not kept, which is what you want.
