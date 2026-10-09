# Mini ERP — progress

Plan: [specs/s1-mini-erp-workflow.md](specs/s1-mini-erp-workflow.md) (workflow and data) and [specs/s2-mini-erp-look.md](specs/s2-mini-erp-look.md) (the look). Branch `mini-erp`. The big system (33 pages) is on branch `jay`.

**Legend:** ⬜ not started · 🟦 in progress · ✅ done

| Step | Work | State |
|---|---|---|
| P0 | Prune: the cut pages, mock modules, services, config, tests, texts and docs are deleted; two roles (Admin, Worker); the menu in the header; the 8 menu pages open as "not built yet" | ✅ |
| U1 | The base of the look: tokens, `ui/` parts, the header, the page parts, the login | ✅ |
| P1 | Customers, products + BOM, materials + lots, users (pages, not sheets) | ✅ |
| P2 | QT references with the file | ✅ |
| P3 | Production orders, product lines, processes, progress history | ✅ |
| P4 | Stock changes and history | ✅ |
| P5 | Invoice, payment, receipt, print / PDF | ⬜ |
| P6 | Summary page, texts reduced (English and Japanese), docs rewritten | ⬜ |
| P7 | Playwright: the example of the requirements as one case, plus a smoke test | ⬜ |

## Change log

| Date | Change |
|---|---|
| 2026-10-09 | **P0**: pruned to the shell. Users: Admin and Worker only (`admin@gmail.com` / `admin`, `worker@gmail.com` / `worker`). The sidebar is gone; the menu is a row in the header (a bare structure, the look is U1). Kept as the base of the next steps: `ui/` (alert-dialog, badge, table, textarea and the parts of the sign-in), `services/crud.js`, `utils/format.js`, `utils/dates.js`, `utils/aria.js`, the mock adapter with its persistence log. |
| 2026-10-09 | **U1**: the look base. Theme #7C7BAD, radius 0, flat (no shadows or rings), underline-only fields, bold-header lists with thin lines, grey page-title band with a status word in a square box, purple header bar, teal links (#017E84). No icons left: lucide-react removed, login uses a text "Show password". |
| 2026-10-09 | **P1**: master data. Customers (`/customers`), products with BOM (`/products`), materials with lots (`/stock`, the stock changes come in P4), users (`/users`). Each is a list (search, status filter, 20 rows a page) and a page for a new or an existing record; errors only after Save, after Save the list opens, a record is made inactive after a confirmation (never deleted). A Worker reads products and materials only. Mock: `services/mock/master.js`; shared parts: `RecordList`, `RecordFormPage`, `FormFields`, `useLoad`. Tests: `master.test.js` (6) and `e2e/master.spec.js`. |
| 2026-10-09 | **P2**: QT references (`/qt`, Admin). QT number (unique, typed), QT date (typed YYYY-MM-DD), customer, notes, the QT file (PDF / PNG / JPG up to 10 MB, kept as a data URL in the mock; download link on the record). The list does not carry the file data. Mock: `services/mock/qt.js` (built on the `resource()` helper of `master.js`). Tests: `qt.test.js` (3). Playwright is not run for P2 on request; its case comes later. |
| 2026-10-09 | **P3**: production orders (`/orders`, `/orders/new`, `/orders/:id`). An Admin makes an order from a QT reference (number ORD-yyyy-0001 given on Save, customer of the QT as default), with product lines (the product price is the default agreed price) and the ordered processes of every line (move up / down); **Start production** (after a confirmation, needs a line and a process on every line) locks the products and processes. A Worker or an Admin records progress of a process: status, completed quantity (the latest total), work date, note - every update is kept in the history with who and when; Completed only with the full quantity; only an Admin reopens a completed process, with a note. The status of the order is computed (New -> In Progress when started -> Completed when every process is Completed). Mock: `services/mock/orders.js`. Tests: `orders.test.js` (5) and `OrdersFlow.test.jsx` (the pages driven on the mock). Playwright not run on request. |
| 2026-10-09 | **P4**: stock changes, on the page of a material (`/stock/:id`). Under the fields: the lots with their quantities (read only), the form of a change (Admin) and the history. A change is **Add** (also opens a new lot), **Deduct** (used; optional production order) or **Adjust** after a count (plus or minus, a note is required); quantities have up to 3 decimals; a change that would make a lot negative is refused; the history keeps lot, change, balance of the lot, order, note, who and when. The lots of a material change only through stock changes (a new material starts with its lots as "Initial stock" entries); the production never changes the stock by itself. Mock: `services/mock/stock.js`. Tests: `stock.test.js` (6), `StockFlow.test.jsx`. Playwright not run on request. |
