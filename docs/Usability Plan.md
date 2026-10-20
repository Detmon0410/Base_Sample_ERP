# Usability Plan

> **Update:** the processes of a production order are now the Factory Worker's job (the Admin too); a Sale Worker reads the order and the QT page only links to it. Where this plan says a Sale Worker adds the processes, read Factory Worker.

How the system becomes easier to use and to understand: a job is finished on **one page**, the screens are lighter, and each person starts from the work that is theirs. Built on branch `mini-erp` (phases U1 to U6; the Playwright specs of the changed pages are not updated or run yet).

Related: [Version 2.0 Plan](Version%202.0%20Plan.md) (what is built), [docs/api](api/README.md) (the contract), [ProjectdocInfo](../ProjectdocInfo/) (the diagrams).

## 1. What was asked

These answers came from the owner of the project.

| Question | Answer |
|---|---|
| What does "finished on one page" mean? | **Sales** and **Accounting** each finish their work on one page |
| Biggest problems today | many pages to click through; forms and tables that are dense and hard to read; (the menu words were **not** named as a problem) |
| Main user to design for | the **Factory Worker** |
| How far to go | the look and the order of use; **the business rules do not change** |
| Sales page holds | QT with its lines, the customer PO file and Confirm; the **processes** of the production order; the **customer** (choose one; adding a new customer was decided against, see U1) |
| Accounting page is | one **work list of the money jobs** |
| First page of a Factory Worker | **today's work** |

## 2. Principles

1. **One page, one job.** A person opens the page to do one thing first, and sees what comes next on the same page.
2. **The next step is always visible.** A chain of steps (QT -> Order -> Production -> Invoice -> Paid) shows where a job is, with the one button that moves it on.
3. **The number or the action comes first**, the explanation is small and grey. Four text sizes only, the same everywhere (page title, key number, section title and name, small grey text).
4. **Colour only means something**: yellow = look at it, blue = going on, green = done, red = must be done. The status badges already follow this.
5. **Less text, fewer fields on first sight.** Details that are rarely needed sit behind "More" or on the detail page.
6. **Big buttons and short paths on a tablet or a phone** for the Factory Worker.
7. **No new business rule.** What is allowed, refused and computed stays as in [docs/api](api/README.md). The only addition is listed in section 6.

## 3. The decisions to confirm

| # | Question | Default | Why it matters |
|---|---|---|---|
| U1 | A Sale Worker adds a **new customer** from the QT page | **Decided: no.** The Sale Worker only chooses an existing customer; customers stay with the Admin | No business rule changes |
| U2 | After **Confirm QT** the page stays on the same QT page | Yes: the processes and the progress of the order appear on it; the order page stays for the Factory Worker and for a link | The one-page idea of Sales |
| U3 | The Accounting list pages become **one page**; the invoice and the receipt keep their own page as the **document** (print, PDF) | Yes: `/accounting` is the work list; `/accounting/invoices/:id` and `/accounting/receipts/:id` stay; `/accounting/invoices` and `/accounting/receipts` redirect to `/accounting` | Old links keep working |
| U4 | The first page of a Factory Worker is **Today's work** at `/`; the Dashboard stays for the Admin and the Sale Worker | Yes | Starts from the work |
| U5 | The Sale Worker's first page | The Dashboard as now | Not asked |
| U6 | Does the menu get shorter? | Yes: Sales, Purchase and Accounting are one link each; Stock stays a menu | Fewer clicks |

## 4. The new pages

### 4.1 Sales: one page for a job (`/sale/quotations/:id`)

A QT page that carries the job from the offer to the start of the production.

```text
QT-2026-001   Tokyo Cold Chain                       [Draft] -> [Confirmed] -> [In production] -> [Done]
+ the next step: [Confirm QT]

1  Customer      choose one from the customers (the Admin keeps the master data)
2  Products      the lines, the price starts from the product, the total in big type
3  Customer PO   number, date, the file; a missing file is a small warning, not a stop
4  Confirm QT    one button, with a question
-- after Confirm, on the same page --
5  Production    the processes of every line (add, order, remove) until the production starts;
                 then the progress of every process, read only (who, when, how many)
6  Files and the printed QT form   (More)
```

- The order has no page of its own for a Sale Worker to go to; it is part of the QT page. `/sale/orders/:id` stays for the Factory Worker and as a link, and shows the same progress.
- The list `/sale/quotations` becomes the **Sales work list**: one row per job with the step badge (Draft, Confirmed, In production, Done), the customer, the total, and the next step as a button. Filter by step.

### 4.2 Accounting: one work list (`/accounting`)

One page, three groups under a small tab bar, each row has its next action.

| Group | Rows | The action on the row |
|---|---|---|
| **To invoice** | the orders that are Completed and have no invoice | **Issue invoice** (asks first) |
| **Waiting for payment** | the invoices that are Unpaid, oldest first | **Record payment** (a dialog: date, amount already filled with the total, Confirm) |
| **Paid** | the invoices that are Paid, with their receipt | **Open receipt** (the document, Download PDF, Print) |

- Numbers on top: how many to invoice, how many unpaid and their total. They are the tabs.
- A row opens the **document** (the invoice or the receipt) in the page that exists today, with Download PDF and Print.
- The rules do not change: one invoice per Completed order, a full payment equal to the total, one receipt.

### 4.3 Factory Worker: today's work (`/`)

```text
Today                                                      [Low stock: 2 -> Buy]
+ To start (Draft, ready)        order, customer, products;  [Start production]  (a short stock says what is missing, as now)
+ In progress                    one card per order; every process with its progress bar;
                                 [Record progress] opens a small form right on the card (status, quantity, date today)
+ To receive (PO sent)           the purchase orders to receive:  [Receive]
```

- Big buttons, one column on a phone.
- Every rule of the progress stays (the quantity is the latest total, Completed needs the full quantity, a completed process is the Admin's to reopen).
- The old order page stays for the whole detail (history, files).

## 5. The pass on forms and tables

Applied to every form and list, after the three pages:

| Item | Change |
|---|---|
| Forms | one column of sections on a phone, two columns at most on a desktop; the labels short; the hint text only when it is needed; a bar with Save and Cancel that stays at the bottom |
| Lines (QT, order, PO) | one line = one row: the main fields first, the optional ones behind "More"; the amount and the total in big bold type |
| Tables | at most 5 columns on first sight; the key column bold; numbers right-aligned and bold; the status as a badge; rows are not cut off on a tablet |
| Lists | the search first, the filters next to it; the empty list says what to do and has the button |
| Detail pages | the key facts in a row of small cards on top; the history and the files below |
| Words | a short title for every page; the buttons say what they do ("Issue invoice", "Record payment"); no change of the business words the factory uses |
| Messages | an error says what to do; the "next step" hint after a save |

## 6. What changes in the contract

| Change | Where |
|---|---|
| `GET /orders?invoiced=false` (the orders that are Completed and have no invoice, for the Accounting list) | `docs/api/orders.md` |
| `GET /invoices?status=Unpaid` and `GET /receipts` already exist | no change |
| Pages: `/accounting` is new; the two list pages redirect to it | `docs/api` page notes, the site map |

No permission changes. Nothing else changes in the API: the lists and filters the pages need already exist (`GET /orders?status=`, `GET /purchase-orders?status=`, `GET /materials`).

## 7. Phases

| Phase | Name | Size | Needs |
|---|---|---|---|
| **U1** | The base: shared pieces and the look | small | none |
| **U2** | Sales on one page | large | U1 |
| **U3** | Accounting on one page | medium | U1 |
| **U4** | Today's work for the Factory Worker | medium | U1 |
| **U5** | Forms and tables pass | medium | U2 to U4 |
| **U6** | The menu, the redirects, the documents and the full test | small | U1 to U5 |

The rules for every phase are those of the Version 2.0 plan: English and Japanese for every text, a commit by category when the owner says so, only the tests of the phase during the work and the full vitest and Playwright runs in the last phase.

### U1. The base

**Do**
- `StepChain`: the chain of steps with the current one marked and the next action; used by Sales, Accounting and the order page.
- `NextAction` bar: the one main button of a page and its hint.
- `FormDialog`: a small dialog for a short form (record payment).
- `TabBar`: tabs with a count (the Accounting groups).
- `StatCard` row: one big number with a small label.
- The typography and density tokens (four sizes), tab bar, empty state, the bottom action bar of a form.
- Read `D:\Github-project\ui-library\DESIGN-RULES.md` and reuse what exists before building.

**Done when:** each piece has a test and is shown on one page (for example the order page uses `StepChain`).

### U2. Sales on one page

**Do**
- The QT workspace of section 4.1: customer, lines, PO, Confirm; the processes editor and the progress of the order on the same page.
- The Sales work list with the step badge and the next-step button.
- Reuse the pieces that exist: `QtLines`, `Attachments`, `QtDocument`, the order lines and processes editor (extracted from `OrderForm`), the progress table (extracted from `OrderView`).

**Tests:** a Sale Worker does the whole job on one page in a flow test: QT with an existing customer and lines, PO file, Confirm, processes, and sees the progress that a Factory Worker records.
**Done when:** a Sale Worker never has to open another page to prepare a job.

### U3. Accounting on one page

**Do**
- `/accounting` with the three groups, the numbers on top, **Issue invoice** and **Record payment** in a dialog, **Open receipt**.
- `GET /orders?invoiced=false` in the mock and the contract.
- The two old list pages redirect; the invoice and the receipt document pages stay.

**Tests:** issue, pay and open the receipt from the work list; the rules still refuse a wrong amount.
**Done when:** the money jobs are done without leaving `/accounting` except to look at a document.

### U4. Today's work

**Do**
- The page of section 4.3 at `/` for a Factory Worker; the Dashboard for the others.
- The progress form inside the order card, using the same rules and the same call.
- The low stock strip and the purchase orders to receive.

**Tests:** a Factory Worker starts an order, records progress on the card and receives a PO from this page.
**Done when:** the daily work needs no menu.

### U5. Forms and tables

**Do** the list of section 5 on the pages: QT, order, PO, supplier, material, product, customer, user, the stock pages and the lists. Check each page on a phone, a tablet and a desktop, in English and in Japanese.
**Done when:** the pages follow the checklist and no page scrolls sideways.

### U6. Wrap-up

**Do**
- The menu: Dashboard or Today, Sales, Purchase, Accounting (one link each), Stock, Master data; the menu of each role in `navigation.js`.
- The redirects of the old addresses and the notes in `docs/api`, the site map and the user flow.
- Remove the pieces nobody uses now; the full vitest, Playwright (three screen sizes), lint and build; look at every changed page in the browser.

## 8. Risks

- **The Sales page is the biggest change**: it joins the QT page and the order page. It is built from the existing parts, so the rules and the API stay; the tests of the QT and the order flows are rewritten.
- **A work list is only a view**: it must not hide a rule. Every button calls the same API as today and shows the same refusals.
- **Phone width** for the Factory Worker: every card and form is checked at 375 px.

## 9. Documents to update at the end (U6)

- `ProjectdocInfo/Site Map.md`: the diagram (menu "Orders" is "Sales"; Dashboard / Today's work; one Sales page; `/accounting`), the page table, the page contents table, the redirects.
- `ProjectdocInfo/User Flow.md`: the Sale, Factory and Admin flows.
- `ProjectdocInfo/Flow Chart.md`: the "Purchase page" step; `Context Diagram.md`: the list of pages.
- `ER Diagram.md`, `DB Relations.md`: no change.
- `docs/api/orders.md` (`invoiced` filter), the page notes, and `README.md` (Workflow and structure).
