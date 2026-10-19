# Test Plan: errors and the workflow, from the start to the end

What this plan checks: whether the system has **errors in the code**, and whether it **works as the workflow says, from the master data to the receipt** (and the purchase side). It is a plan; nothing here is run yet. The size of the screen (responsive) is **not** tested.

Related: [README](../README.md) (the workflow, 9 steps), [Version 2.0 Plan](Version%202.0%20Plan.md), [Usability Plan](Usability%20Plan.md), [docs/api](api/README.md) (the rules).

## 1. What there is to test

| Part | What it is | State at the last run |
|---|---|---|
| Frontend unit and page tests | vitest + Testing Library, on the mock API: 35 files, 222 tests | all pass; `pnpm lint` and `pnpm build` are clean |
| End-to-end tests | Playwright, 5 specs (`acceptance`, `master`, `purchase`, `smoke`, `rawscan`), the app on the mock API | **not run since the usability work** (U1 to U6 and the later changes); some will fail for a known reason (section 3) |
| Backend tests | `node --test`, 153 tests on MySQL, branch `mini-ohm` | all pass (run once, on that branch only) |
| Frontend on the real backend | `VITE_USE_MOCK=false` | never checked by us; the backend branch does not have the later frontend changes |

## 2. The workflow that is checked (the order of the checks)

The check follows one job from the start to the end, as each person does it, and then the side roads.

| # | Step | Who | The rules that must hold |
|---|---|---|---|
| W1 | Master data: customer, material with a lot and a minimum level, product with a BOM, supplier with the materials it sells, users | Admin | codes unique; a record that is used cannot be deleted (`IN_USE`); a Worker has a department |
| W2 | QT: new, lines, the price starts from the product, customer PO number, date and file | Sale | QT number required and unique; no duplicate product on a QT; the total is computed; Download PDF and Print at the top |
| W3 | Confirm QT | Sale | needs a line; once only; the QT locks (customer and lines); one Draft order with the lines and the prices; the PO file is copied to the order; a warning when there is no PO file |
| W4 | Processes on the same page, then Start production | Sale adds, Factory starts | processes only before the start; Start needs a process on every line; the BOM is deducted, oldest lot first; `STOCK_SHORT` changes nothing and lists the short materials; a second start is refused; the order locks |
| W5 | Progress | Factory | the quantity is the latest total; `Completed` needs the full quantity; Not started has 0; a completed process is changed only by an Admin with a note; the status of the order is computed (Draft, In progress, Completed); evidence files |
| W6 | Invoice | Admin | only a Completed order, one per order; it is a copy (a snapshot); it locks the progress |
| W7 | Payment and receipt | Admin | the full total, once; the invoice becomes Paid; one receipt; no payment method |
| W8 | Purchase: low stock, PO, Sent, Received, payment | Factory, Admin | only the materials of an active supplier; Sent locks the PO; Received adds the stock **once** into the lot typed for each line; payment only after Received, once, equal to the total |
| W9 | The same facts seen from the other pages | all | the stock and the movements after W4 and W8; the Dashboard numbers; the Accounting page lists (to invoice, waiting, paid, to pay suppliers, paid out) and the step of the QT after every change |
| W10 | Who may do what | all three | the table in `docs/api/auth.md`: menus, pages (403) and calls (403) agree |

## 3. Plan, in order

### T1. The baseline (small)

`pnpm lint`, `pnpm build`, `pnpm exec vitest run`, and a count of the tests by area. Goal: a clean start and a list of which rule of section 2 has **no test yet** (a table "rule -> the test that covers it").

### T2. Bring the end-to-end tests up to date, then run them (desktop only)

The specs were written for the pages as they were in Version 2.0. Known places that will fail, by reading them (to be confirmed by the run):

| Where | Why |
|---|---|
| `helpers.js` PAGES and MENU_OF | Accounting is one entry now (`/accounting`), no Invoices and Receipts menu; the Factory Worker's first page is a Dashboard with the work cards |
| `acceptance.spec.js` step 8 and 9 | "New invoice" and the invoice and receipt lists are the Accounting work list (Issue invoice and Record payment are dialogs) |
| `acceptance.spec.js` QT steps | Confirm does not go to the order page any more (the order and its processes are on the QT page); the QT form is not shown (Download PDF and Print at the top); labels lost "(YYYY-MM-DD)" |
| `acceptance.spec.js`, `master.spec.js`, `purchase.spec.js` | the status filter of the lists is tabs, not a select; fields have example placeholders; the file chooser is a button |
| `smoke.spec.js` | the language is two flags (the buttons are named English and 日本語, no "EN" text); the user menu is a card; the menu opens on hover |
| `rawscan.spec.js` | new texts (examples, papers, dashboard tiles) must have a key in both languages |

Work: fix each spec to the new pages (keeping what it proves: the 10 steps of the requirements, the roles, the old addresses, no raw keys); then run with `--project=desktop`. The `tablet` and `phone` projects are skipped. Every failure is sorted as **test is stale** (fix the test) or **system is wrong** (a finding, section 5).

### T3. The workflow walk, as a new end-to-end spec

One spec that does W1 to W9 in order with the real clicks (no API shortcuts) on a clean mock: it records, after every step, what the **other** pages say (stock, movements, Dashboard, Accounting lists, the step of the QT). The existing `acceptance.spec.js` is the base; it gets the purchase side (W8) and the two sides of Accounting. Negative cases inside the same run: a short stock at Start (then add stock and start), a wrong payment amount, a second Confirm, a locked QT, an order that cannot be invoiced before it is Completed, a Factory Worker on an Admin page.

### T4. The hunt for errors in the code

Not by reading everything: by looking at the places where errors usually are, each with a small test that **fails first** if the error is real.

| Area | What is looked at |
|---|---|
| Data seen by two pages | the lists that are cut: the Dashboard of a Factory Worker takes at most 20 open orders; Accounting asks 200 per list; the stock list asks 200 materials; what happens at the 21st or 201st |
| Money and numbers | totals of a QT, an invoice and a PO agree (rounding of `quantity x price` with decimals such as 0.001 kg); `¥` format in both languages; the "paid this month" number at the turn of the month |
| Dates | `todayIso` is the local day of the computer; the required date, the payment date, the date filter of the movements (both ends included) |
| States | the QT step after every change of the order; an order started with no process; reopening a completed process after an invoice (must be refused); deleting a draft QT, a draft PO with files |
| Forms | double click on Save, Confirm, Start, Pay (is the call made twice); the server error shown on the right field; a select whose options arrive late (the bug found in the QT lines); a field that keeps the old value after Cancel |
| Files | a wrong type, over 10 MB, replacing the PO file on the QT after Confirm (the copy on the order follows) |
| i18n | both languages have every key (`keysParity`), no raw key on any page (`rawscan`), the Japanese text of the new pages is read once |
| Console and network | the browser console and the failed requests on every page of every role (the smoke spec does this; it is run again) |

### T5. The backend, against the same workflow

The backend is on the branch `mini-ohm` (someone else's branch; it is not changed). Steps:

1. Make a scratch copy of the merge of `mini-erp` into `mini-ohm` (a worktree, never on the branch itself) so that the backend is tested with the **later** frontend and contract (the merge has no conflict).
2. Run the backend tests (`node --test "test/*.test.js"`; the `pnpm test` script fails on Node 24 because it passes a folder).
3. Start the backend with the demo data and the frontend with `VITE_USE_MOCK=false`; run the workflow spec of T3 against it. A difference between the mock and the backend is a finding: which one is right is decided by `docs/api`.
4. Check the contract by a diff of the answers (the shape of the QT, order, invoice, PO rows) with the existing `frontend-payloads.test.js` extended.

This step writes to a test database `kanou_sim_test` (it exists from the last run) and the demo database in the scratch copy only.

## 4. Order, size and what comes out

| Step | Size | Output |
|---|---|---|
| T1 baseline and the coverage table | small | the table of the rules with the test that covers each, and the gaps |
| T2 end-to-end tests updated and run | medium (the most work) | green specs on the desktop, a list of findings |
| T3 workflow spec | medium | one spec W1 to W9 with the negative cases |
| T4 hunt for errors | medium | a test for every real error found, then the fix |
| T5 backend and the real backend run | medium | a list of differences between the mock, the backend and the documents |
| Report | small | `docs/Test Report.md`: what was run, what passed, every finding with its severity and its fix or its reason to wait |

## 5. How a finding is handled

| Kind | What is done |
|---|---|
| The test is stale (the page changed on purpose) | fix the test; no change of the system |
| The system is wrong (a rule of section 2 or `docs/api` is broken) | a failing test first, then the fix, one commit per fix (the category: pages, mock, tests, docs) |
| The mock and the backend differ | reported with both answers; the fix goes to the one that disagrees with `docs/api`; the backend branch is not changed without the owner |
| A rule is unclear or two documents disagree | asked, not guessed |

## 6. Decisions needed before the start

| # | Question | Default |
|---|---|---|
| Q1 | Include the real backend (T5), which uses the MySQL of this computer (the `_test` database and a scratch demo database)? | Yes, on a scratch copy, never on `mini-ohm` itself |
| Q2 | Fix the errors as they are found, or report all first and fix after you read the report? | Fix the clear ones (with a test), report the ones that need a decision |
| Q3 | Run Playwright only on the desktop project (the screen sizes are out of scope)? | Yes |
| Q4 | Is the mock (`services/mock`) still the reference where `docs/api` is silent? | Yes |
