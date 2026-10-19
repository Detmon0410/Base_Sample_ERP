# Test Report: errors and the workflow, from the start to the end

The result of the [Test Plan](Test%20Plan.md). Date of the run: 2026-10-19. Branch `mini-erp` (commit `a95af0d` and the test commits after it). The size of the screen was not tested.

## 1. Result in one table

| What | Run | Result |
|---|---|---|
| `pnpm lint`, `pnpm build` | yes | clean (one old warning in `button.jsx`) |
| vitest (frontend, on the mock) | 35 files | 224 tests pass |
| Playwright, desktop, on the mock | 6 specs | 17 tests pass |
| Backend tests (branch `mini-ohm`, MySQL) | yes | 153 of 153 pass (run with `node --test "test/*.test.js"`, see F7) |
| Playwright, desktop, on the **real backend** (the merge of `mini-erp` into `mini-ohm`, on a scratch copy and scratch databases) | acceptance, purchase, negative, smoke, rawscan, master | all pass (17 of 17 checks of those specs); the filter of expected refusals was added to the end of two of them after the run (F6) |
| The merge of `mini-erp` into `mini-ohm` | done on a scratch branch | no conflict; the scratch branch and the copy are deleted |

## 2. The workflow, step by step (W1 to W10 of the plan)

| Step | Checked by | Result |
|---|---|---|
| W1 Master data (customer, material with a lot, product with a BOM, user) | `acceptance`, `master`, vitest | works on the mock and on the real backend |
| W2 QT with lines, PO file, Download PDF and Print at the top | `acceptance` | works; the PDF is a real file named with the QT number |
| W3 Confirm QT: one order on the same page, steps of the job | `acceptance` | works |
| W4 Processes, Start production, BOM deducted | `acceptance`, `negative` | works; a short stock changes nothing, lists the short materials, the "Add stock" link fills the missing quantity, then the start works |
| W5 Progress by a Worker, order Completed, history | `acceptance` | works |
| W6 Invoice from the Accounting page | `acceptance`, `negative` | works; an order that is not Completed is not offered |
| W7 Payment (a wrong amount refused, the full amount accepted) and receipt | `acceptance` | works; invoice and receipt PDFs are real files |
| W8 Purchase: low stock, PO, Sent, Received (stock added once), payment, and the Accounting side "We pay suppliers" | `purchase` | works |
| W9 The same facts on the other pages (stock, movements, Dashboard, deletes with `IN_USE`) | `acceptance` | works |
| W10 Who may do what (3 roles) | `smoke`, `negative`, `master`, backend tests | works; the menus, the pages (403) and the calls agree |

## 3. Findings

| # | Finding | Severity | State |
|---|---|---|---|
| F1 | The Dashboard of a Factory Worker read only the 20 newest open orders, so an order in production could be hidden behind 20 newer orders that had not started | medium | **fixed** (it asks for the orders in production and the started drafts only); test added |
| F2 | An invoiced order still showed Record progress (and Reopen to an Admin); the server refuses it with `ORDER_INVOICED` | low | **fixed** (the buttons are hidden); test added |
| F3 | The real backend limits the sign-in tries (`429 TOO_MANY_REQUESTS`); the frontend had no text for it and said "unknown error" | low | **fixed** (EN and JA text) |
| F4 | End-to-end specs were stale after the usability work (one-page Sales and Accounting, tabs, flags, the file chooser, an empty list with a second "New" button) | test | **fixed**: `acceptance`, `helpers`, `master`; the acceptance case now walks the new pages |
| F5 | `purchase.spec` signed in again before the sign-out had finished (a race that failed in 2 of 5 runs) | test | **fixed** |
| F6 | A real backend logs every refusal (400, 403, 409) as a console error in the browser; the specs that check "no console errors" counted them | test | **fixed**: `withoutRefusals` in `helpers.js` removes the refusals the tests make on purpose; real errors still fail the test |
| F7 | The backend script `pnpm test` fails on Node 24 (`node --test test/` is a folder; Node 24 needs a glob) | low | **open, on the backend branch** (not changed; the fix is `"test/*.test.js"`) |
| F8 | The demo users of the mock were named "Worker" and "Sale"; the backend seed names them "Factory Worker" and "Sale Worker" | low | **fixed**: the mock uses the names of the seed |
| F9 | Lists are cut at a fixed size: 200 rows for each Accounting tab and for the selects of materials and products, 50 purchase orders on the Dashboard | info | **open, by design**; a real company needs paging or a search there |
| F10 | An empty list shows a "New ..." button in the header and another in its body | info | by design; the specs use the first one |

## 3b. After the report: the real backend as a command

`pnpm e2e:real` (in `frontend/`) runs every spec file on the real backend, **one new database for each file** (`kanou_e2e_<time>_<n>`, dropped after it), with a backend on port 3310 and a frontend on port 5330 of its own. It does not touch the developer's database or servers. Result of the first full run: all 6 spec files pass (acceptance, master, negative, purchase, rawscan, smoke). `E2E_ONLY=acceptance.spec.js pnpm e2e:real` runs one file. The mock specs (`pnpm e2e`) always start the app on the mock, whatever `frontend/.env` says.

## 4. What was not covered

* The size of the screen (responsive), as asked.
* The look and the text of the Japanese pages (only that no key is missing, by `keysParity` and `rawscan`).
* The content of a PDF: the tests check that the file is a real PDF with a page of drawing, not its layout. The print dialog is replaced by a stub.
* The `master` spec on the real backend ran to its last check; its end-of-test list of console errors was not run again after the filter was added (the flow passed).
* Two users at the same time, a very large data set, and the speed.
* The backend branch is another person's: it was only read and run, not changed.

## 5. What was left on this computer

* The test and scratch databases in MySQL: `kanou_sim_test` (the backend tests) and `kanou_scratch_e2e`, `kanou_scratch_e2e2` to `kanou_scratch_e2e7` (the runs against the real backend). They can be dropped. The database `kanou_sim` was not touched. (The tool that makes the schema refused to reset a database without the user's consent, so every run used a new database instead.)
* No branch, copy or process of the scratch work remains.
