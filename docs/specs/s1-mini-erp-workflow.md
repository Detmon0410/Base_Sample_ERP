# S1 — Mini ERP: the simplified workflow

Status: **ACCEPTED, waiting for the look (S2) and the order of work** (updated with the answers of the second and third round) · Branch: `mini-erp` · Source: [BaseRequirement_md/simplified_factory_system_requirements.md](../../BaseRequirement_md/simplified_factory_system_requirements.md)

This is the first step of the new direction: the workflow and the data first, the look (a 2013 style) later in its own spec (S2). Nothing is built or deleted until this page is accepted.

## 1. Decisions already made

| # | Decision | By |
|---|---|---|
| 1 | The simplified system lives on branch `mini-erp`; the big system stays on `jay` | user |
| 2 | **No tax at all**: an invoice total is the sum of quantity × unit price | user |
| 3 | The master data that the new requirements do not list is **cut** (see 5) | user |
| 4 | **Every progress update is kept** as its own history entry (who, when, quantity, date, note) | user |
| 5 | **Traceability is cut** together with the serial numbers | user |
| 6 | ~~The payment method is cut~~ **Restored to follow the requirements (5.6)**: a payment is a date, an amount, a payment method and an optional reference or notes; the receipt shows the method | user, then the requirements |
| 7 | The **sidebar moves to the header**: a menu in the top bar, links in one row, the sub-menus as dropdowns | user |
| 8 | There is **one simple summary page** (numbers only, no charts, no tabs) as the first page | user |
| 9 | "Not for real use": **keep the business rules of the requirements, but do not polish** (no extra edge-case care: long explanations, many messages, second confirmations) | user |
| 10 | **Only two roles: Admin and Worker.** No Manager, anywhere (no approval, no "Manager" text, no Manager user) | user |
| 11 | **A click opens a page, not a side sheet.** The detail and the form of a record are full pages with a way back to the list | user |
| 12 | **No icons at all**: not in the menu, the buttons, the statuses or the header, and also **no role hat, no sort arrows, no calendar icon**. Everything is a word or a plain character | user |
| 12b | The **Refresh button is cut** from the header | user |
| 13 | **No "status steps" on the pages** (the row of steps above every list) and no button to hide or show them | user |
| 14 | The language button is **text only, no flags** | user |
| 15 | The header has **no date, no time and no "Online" mark** | user |
| 16 | The new look is **old-fashioned (2013) and a little harder to use**. This **changes the earlier goal** of "easy for users of 40–50+ and older": the 18 px text, 48 px controls and the accessibility checklist stop being hard rules. Details in S2 | user |

## 2. The workflow

| Step | Who | Page | What happens |
|---|---|---|---|
| 1 | Admin | QT references | Saves a quotation reference: QT number, QT date, customer, notes, the QT file attached. The quotation itself is made outside this system |
| 2 | Admin | Production orders → New | Opens a production order from a QT reference: order number, order date, customer, notes. Adds **product lines** (product, quantity, agreed unit price; the product price is the default) and, for each line, the ordered list of **processes** (sequence, name, instructions) |
| 3 | Admin | Production order | Starts the production (needs at least one line and one process per line) |
| 4 | Worker | Production order | Records progress of each process: status, completed quantity, work date, note. A process is Completed only when its completed quantity equals the required quantity |
| 5 | system | Production order | The order becomes **Completed** when every process of every line is Completed |
| 6 | Admin | Invoices | Issues **one invoice** for a Completed order (a snapshot of the lines, no tax). Status Unpaid |
| 7 | Admin | Invoice | Records the **full payment**: date, amount (= the invoice total), payment method and an optional reference or notes. The invoice becomes **Paid** and **one receipt** is issued. Invoice and receipt can be printed / saved as PDF |
| 8 | Admin | Stock | At any time and by hand: add material stock (material, lot, quantity), deduct it when used, adjust after a count. The production never changes the stock by itself |

An order can be Completed with its invoice still Unpaid: the two statuses are separate.

## 3. Users and access

Department (Sales, Factory, Accounting, Administration) is only a field of the user. There are **two roles**:

| Role | Can |
|---|---|
| **Admin** | everything: master data, QT references, production orders and processes, stock, invoices, payments, receipts, users |
| **Worker** | see production orders, record progress of processes, see the products and materials needed for production |

There is no Manager role, no approval, no menu per department and no permission matrix page.

## 4. Data

| Record | Fields |
|---|---|
| Customer | name, address, email, telephone |
| Product | code (unique), name, price, **BOM** (lines: material + quantity for one product; reference only) |
| Material | code (unique), name; **lots**: lot number + quantity (a material may have several) |
| User | name, department, email (unique), password (stored as a hash), role |
| QT reference | QT number, QT date, customer, notes, attached file |
| Production order | order number (unique), QT reference, customer, order date, notes, status (New / In Progress / Completed) |
| Order line | product, quantity, agreed unit price (0 or more) |
| Process | line, sequence, name, instructions, status (Not Started / In Progress / Completed), completed quantity |
| Progress entry | process, status, completed quantity, work date, note, **who, when** (kept for every update) |
| Stock change | material, lot, quantity change (+ or −), reason, user, date, optional production order |
| Invoice | number (unique), date, order, customer name and address, lines as issued, total, status (Unpaid / Paid) |
| Payment | invoice, date, amount |
| Receipt | number (unique), date, invoice, customer details, amount |

## 5. What is cut from the big system

| Cut | Kept or changed |
|---|---|
| Customer POs, Sale Orders, Delivery Notes, price lists, Traceability | Quotations → **QT references** |
| Work Orders with routing from the product, machines, scheduling, material issue; Production tracking board; FG Transfer; serial numbers; Traceability | → **Production orders** with manual processes and progress |
| Stock ledger with reserved / available / on order, warehouses, finished goods stock, adjustment approval | → **Stock by material and lot**, manual changes with a history |
| The whole Purchase group (stock status board, purchase orders, goods receipts, approval log); suppliers and their materials | – |
| Supplier bills, supplier payments, journal entries, Accounting master (accounts, tax rates, bank accounts) | Customer invoices and receipts → **Invoice, payment and receipt** |
| Suppliers, warehouses, units of measure, machines, employees, price lists, routing steps of a product | Customers, products with BOM, materials with lots, users **stay** (reduced fields) |
| Manager role, every approval, per-department menus, the permission matrix, tax, the stock rules NOT_READY / reserve | – |

## 6. Rules

- Order, invoice and receipt numbers are unique; product and material codes are unique.
- Quantities entered are positive; a stock adjustment may be + or −; a stock change that would make a lot negative is refused.
- The completed quantity of a process cannot exceed the required quantity; it is Completed only when equal.
- Order prices are 0 or more.
- No record has a status Active / Inactive (changed by the user; see S3). Used records are protected by refusing the delete, from step S3-C on.
- An issued invoice and receipt cannot be edited or deleted.
- After an invoice is issued the product quantities and the process lists of the order cannot change.
- One invoice per order; one full payment per invoice; the payment equals the invoice total.
- The order status is **computed** from its processes (New until a process has started → In Progress when one has → Completed when all are completed); nobody sets it by hand.
- The invoice keeps the data as issued: later changes of the customer or product do not change it.

## 7. Pages (10) and the menu in the header

| Page | Route (proposal) | Admin | Worker |
|---|---|---|---|
| Login | `/login` | yes | yes |
| **Summary** (the first page): numbers of production orders by status (New / In Progress / Completed), the number and total of Unpaid invoices | `/` | yes | yes (orders only) |
| QT references | `/qt` | yes | no |
| Production orders (list, search, status filter) | `/orders` | yes | yes |
| New order | `/orders/new` | yes | no |
| Order details and progress (a page) | `/orders/:id` | yes | yes (records progress) |
| Invoices and receipts (the payment is recorded on the invoice) | `/invoices` | yes | no |
| Materials and stock (lots, manual changes, history) | `/stock` | yes | read only |
| Customers | `/customers` | yes | no |
| Products and BOM | `/products` | yes | read only |
| Users | `/users` | yes | no |

**The menu** is one row in the top bar (the sidebar is removed):

Summary · Orders ▾ (QT references, Production orders) · Invoices · Master ▾ (Customers, Products, Stock, Users)` (the four master data of the requirements, section 4) and, at the right, the user (name and role as text), the language (text, no flag) and Log out. No icons, no clock, no "Online" mark, no Refresh button, no status-steps button.

A Worker sees only `Summary · Production orders · Master ▾ (Products, Stock)`. The user can also move the menu to a list on the left (one button in the bar). On a narrow screen the row becomes one "Menu" button with the same list. Lists search by document number, customer name, product code or material code where it applies.

## 7b. What the decisions of the look mean for the code

These come from the user now and are only noted here; the rest of the look is S2.

| Decision | What changes in the code |
|---|---|
| A page instead of a sheet | every `...Sheet` / `DetailSheet` / `DocumentSheet` / `RecordSheet` becomes a route page (`/orders/new`, `/orders/:id`, `/customers/:id` ...) with a "Back to the list" link and the Save / Cancel at the bottom; a row of a list is a link to its page; the "unsaved changes" warning stays |
| No icons | the icon library is no longer used anywhere; menu, buttons and badges are words; the role is the word Admin / Worker; a sortable column header is a plain link ("Name", with a word or a plain character such as ^ / v for the direction); a date is an input field (YYYY-MM-DD), no calendar |
| No status steps | `StatusStepper` and the "hide / show the steps" setting are deleted; the status is a filter (a select) and a column |
| Text language button | `LanguageFlag` is deleted; the button shows "EN" / "日本語" |
| No clock, no Online mark | `HeaderClock` is deleted |
| No Manager | the role list is Admin / Worker; every Manager rule of the old code is deleted with the modules in P0 |

## 8. How it is built (phases, each ends with the checks of section 9)

| Phase | Work | Result |
|---|---|---|
| P0 | **Prune**: delete the cut pages, mock modules, services, config, tests, i18n keys and docs; the menu and the routes reduced to section 7; roles reduced to Admin / Worker | the app builds and signs in, with the 9 pages empty |
| P1 | The shell (header menu, language, user) and master data: customers, products + BOM, materials + lots, users | records can be made, changed, made inactive |
| P2 | QT references with the file | a QT can be saved and opened |
| P3 | Production orders, product lines, processes, progress history, computed status | steps 2–5 of the workflow |
| P4 | Stock changes and history | step 8 |
| P5 | Invoice, payment, receipt, print / PDF | steps 6–7 |
| P6 | English and Japanese texts reduced to what is used; the guides (README, API docs of the 3–4 modules left) rewritten | docs match the code |
| P6b | The summary page (a few numbers from the orders and the invoices) | the first page |
| P7 | Playwright: the example of the requirements (section 10) as one case, plus smoke | the acceptance test |

The 2013 look (S2) comes after P7, or between P5 and P6 if it is better to see the real pages first.

## 9. Acceptance

The ten steps of section 10 of the requirements, as one Playwright case: customer, product, material lot, BOM and users → QT reference with file → order of 10 units linked to the QT → processes → Worker completes 10 units on every process → order Completed → Admin deducts material stock and reads the history → invoice issued and downloaded → full payment, invoice Paid, receipt downloaded → the order shows QT, progress, invoice and receipt.

## 10. Open questions (with the proposed answer)

Answered in the second round: the Dashboard (one simple summary page), Traceability (cut), the payment method (cut at first, restored later to follow the requirements), the number of rules (keep, do not polish), the menu (header, dropdowns).

| # | Question | Proposal |
|---|---|---|
| Q4 | Number formats | orders `ORD-yyyy-0001`, invoices `INV-yyyy-0001`, receipts `RC-yyyy-0001`; the QT number is typed by the user (it comes from Sales) |
| Q5 | May a Worker change a completed process? | no; only Admin can reopen it (with a note, kept in the history) |
| Q6 | Progress of one process | each update adds a history entry; the completed quantity is the **latest total**, not a sum of the entries |
| Q7 | Unit of a quantity (pcs, kg) | no units: product quantities are pieces, material quantities are plain numbers (up to 3 decimals) |
| Q8 | Where is the QT file kept | in the browser mock as a data URL (max 10 MB, PDF / PNG / JPG), like the old customer PO file |
| Q9 | Inactive records | not used: there is no inactive record (S3); a used record cannot be deleted |
| Q10 | The old big system | stays on branch `jay`; this branch drops its code (P0) and starts a new mock |
| Q11 | The mock and the backend | like before: everything runs on the mock in the browser; the API contract is written for the few modules left, the backend comes later |
