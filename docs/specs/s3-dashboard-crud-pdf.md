# S3 - Dashboard, full CRUD, readable menu, PDF download

Status: **DONE.** S3-A to S3-F are built and tested (menu names, no status, delete, PDF, Dashboard, the closing tests and docs).
Base: S1 ([s1-mini-erp-workflow.md](s1-mini-erp-workflow.md)) and S2 (the look). The main reference stays
[simplified_factory_system_requirements.md](../../BaseRequirement_md/simplified_factory_system_requirements.md).

## 1. What the user asked for

| # | Request | Answer given in the questions |
|---|---|---|
| 1 | The Summary page becomes a **Dashboard** | numbers + charts + lists |
| 2 | **Master data can be created, read, updated and deleted** | a record that is used cannot be deleted, and the reason is shown |
| 3 | The menu names are **easy to read** | the sidebar is **not** collapsible (the user dropped that idea); the menu stays in the top bar or on the left as now |
| 4 | **Download the invoice and the receipt as a PDF file** | made from the page of the document |
| 5 | "Make inactive instead of deleting" is **not needed** | the status Active / Inactive is removed everywhere (also from QT references) |

## 2. Where this differs from the requirements (to be written down, not hidden)

| Requirement | After S3 |
|---|---|
| 5.5 / 5.6 print **or download** as PDF | met: a real `.pdf` file; the print button stays |
| 8 "records already used in transactions must be kept; they **may** be made inactive instead of deleted" | the records are kept by **refusing the delete** while they are used; nothing is made inactive. "May" is optional, so this still follows the rule |
| 7 nine pages | the Summary page is a Dashboard (still the first page, an extra to the nine) |

## 3. Menu names (request 3)

Words a person from the factory says, shorter, no "and" in the middle. The keys stay; only the texts change (EN and JA).

| Now | New EN | New JA |
|---|---|---|
| Summary | Dashboard | ダッシュボード |
| Orders (group) | Orders | 受注・製造 |
| QT references | Quotations (QT) | 見積書（QT） |
| Production orders | Production orders | 製造指示書 |
| Invoices | Invoices and receipts | 請求書・領収書 |
| Master (group) | Master data | マスターデータ |
| Customers | Customers | 顧客 |
| Products | Products and BOM | 製品・部品表 |
| Stock | Materials and stock | 材料・在庫 |
| Users | Users | ユーザー |

The page titles use the same words, so the menu and the page say the same thing. The icons stay. No collapsing.

## 4. Dashboard (request 1)

One call `GET /dashboard` (replaces `GET /summary`). What each role sees:

| Block | Admin | Worker |
|---|---|---|
| Number tiles: orders New / In progress / Completed | yes | yes |
| Number tiles: unpaid invoices (count and total), paid this month (total) | yes | no |
| Chart: **orders by status** (bar) | yes | yes |
| Chart: **invoiced against paid, last 6 months** (bars) | yes | no |
| List: **orders in progress** with the progress of each (completed quantity against required, over all its processes) and a link | yes | yes |
| List: **unpaid invoices** (number, customer, total, date) with a link | yes | no |
| List: **materials with the least stock** (the 5 lowest totals) | yes | yes (read only) |

Decisions: the charts are drawn by hand with SVG and CSS (no chart library, so no new package); a tile and a row are links to the page that explains the number; empty data shows "nothing yet" and not an empty chart; the numbers come from the same rules as the lists. The requirements have no minimum stock level, so "least stock" is only a ranking and the system does not say "shortage".

## 5. Full CRUD of the master data (requests 2 and 5)

Customers, products (with the BOM), materials (with the lots) and users get a **Delete** next to Save (Admin). It asks first (a confirmation that names the record). QT references are deletable on the same rules (they are not master data, but they lose their status like the rest).

A record that is used cannot be deleted: the server answers `409 IN_USE` with **where it is used**, and the page shows it (for example "Used by 2 production orders: ORD-2026-0001, ORD-2026-0002").

| Record | Cannot be deleted when | When it can, it also removes |
|---|---|---|
| Customer | a QT reference or a production order uses it | - (an invoice keeps its own copy of the name and address) |
| Product | a production order line uses it | its BOM |
| Material | a product BOM uses it, or it has a stock change other than its "Initial stock" | its lots and its "Initial stock" entries |
| User | it recorded a progress update or a stock change; it is the user who is signed in; it is the last Admin | - |
| QT reference | a production order uses it | its file |

Proposed by the planner, to be confirmed: the material and user rules above (the requirements say only that used records are kept).

Status removed: no `status` on any record, no `PATCH .../status`, no "Make inactive" button, no status filter or column, the texts and the tests that talk about it are deleted. A user can no longer be disabled; an Admin deletes the account instead (when it has not been used) or changes its password.

## 6. PDF download (request 4)

* The invoice page and the receipt on it get a **Download PDF** button; **Print** stays.
* The file is made in the browser from the document on the page (`html2canvas` + `jsPDF`, loaded only when the button is used, so the first load does not get heavier). It is A4, one page for a normal document (more pages when the lines need them), named after the number: `INV-2026-0001.pdf`, `RC-2026-0001.pdf`.
* Japanese text is drawn by the browser, so it shows right without a font inside the file. The price of this choice: the text in the PDF is a picture (it cannot be selected or searched) and the file is bigger than a text PDF. The other way (real text) needs a Japanese font inside the app (several MB); not chosen.
* It works for the Admin only, like the pages (no API; a real backend may later answer `GET /invoices/:id/pdf`).

## 7. Order of work (each step ends with unit tests, the browser test, and the docs)

| Step | Work | Result |
|---|---|---|
| S3-A | The menu names (section 3) in EN and JA; the page titles follow | the menu reads the same as the pages |
| S3-B | Remove the status (section 5): QT, the mock, the lists, the texts, the tests | no Active / Inactive anywhere |
| S3-C | Delete with the "in use" rules (section 5): the mock, the confirmation, the message, the tests | master data is full CRUD |
| S3-D | PDF download (section 6) | a `.pdf` file for the invoice and the receipt |
| S3-E | Dashboard (section 4): `GET /dashboard`, the tiles, the charts, the lists | the first page |
| S3-F | Docs (`docs/api`, READMEs, the tracker) and the acceptance test: delete a used customer is refused, delete an unused one works, the PDF files are downloaded, the Dashboard counts | the plan is closed |

## 8. Tests (all written)

* Mock: the delete rules of each record (can and cannot, the list of the places that use it), `GET /dashboard` per role and the numbers.
* Pages: the delete confirmation and the "used by" message; the Dashboard for an Admin and a Worker.
* Playwright: in the acceptance case the PDF files are downloaded (the download event and the file name, the file starts with `%PDF`); a used customer cannot be deleted and the message names the order; the Dashboard shows the new order in the right place.

Where they are: the delete rules in `services/mock/deletes.test.js` and `pages/master/DeleteFlow.test.jsx`; the Dashboard in `services/mock/dashboard.test.js` and `pages/dashboard/DashboardPage.test.jsx`; the PDF call in `pages/invoices/InvoicesFlow.test.jsx`. In `e2e/acceptance.spec.js`: the Worker's Dashboard shows the order in progress (20%, 4 of 20); both PDF files are downloaded (name = the number, the file starts with `%PDF-`); a customer, a product and a material that are used are refused with the places that use them; a customer nobody uses is deleted; the Dashboard counts at the end.
