# S2 — Mini ERP: the look (an Odoo 13 style of 2013–2019)

Status: **ACCEPTED** (answers of the user: U1–U4 and the order of work below) · Branch: `mini-erp` · Goes with [S1](s1-mini-erp-workflow.md) (workflow and data) · Reference: 4 screenshots of Odoo (Purchase app: settings, website portal, list of requests for quotation with its filters and tiles)

**Given by the user:** the theme colour is **#7C7BAD**; **buttons have no rounded corners**; the look is old (2013) and a little harder to use; no icons, no flags, no clock (S1, decisions 11–16).

## 1. What the reference shows (and what we take)

| In the screenshots | Taken for Mini ERP |
|---|---|
| A **flat purple top bar** with the app name big on the left, the menu words next to it (Orders, Products, Reporting, Configuration), the user at the right | the header of S1: bar #7C7BAD, white text, the menu as words with dropdowns |
| The page title in **light grey** under the bar, big and thin ("Settings", "Requests for Quotation") | page title in grey, 20 px, regular weight |
| **Flat buttons**: the main one solid purple ("Save", "Create"), the others white with a thin grey border ("Discard"); square corners | buttons as in 3 |
| A **search box with only a bottom line**; a row of small white buttons (Filters, Group By) with a thin border | search input with a bottom border only; filters as small white square buttons |
| **List**: bold dark header, thin grey lines between rows, a light hover, small text, a status as a small coloured pill (RFQ), the total in a grey bottom row | list as described in 4 |
| **Tiles**: solid purple blocks with a big number and a small word ("7 To Send", "0 Waiting", "7 Late") next to grey blocks for averages | the **Summary** page: purple tiles with a number and a word |
| **Settings**: a grey band for the title of a section, check boxes, grey explanation text under each setting | section titles of forms: a grey band, bold dark text |
| Small text (about 13 px), a lot of information on one screen, compact rows | **not taken**: the size of the text and of the controls stays as it is now (see 3) |
| Many icons, avatars, the dark left menu, the chat and clock of the top bar, the star and the activity icons | **not taken** (no icons, the menu is in the header, no chat / activity / favourites) |

## 2. Colours (all from #7C7BAD)

| Use | Colour |
|---|---|
| Header bar, main button, tiles, links of the menu when active | **#7C7BAD** |
| Main button when hovered / pressed, active menu entry | #6B6A9C |
| Header text, text on a button | #FFFFFF |
| Page background | #FFFFFF; the area around the content #F9F9F9 |
| Text | #4C4C4C; titles of pages #A0A0A0 (light, as in the reference); helper text #9A9A9A |
| Lines of lists and boxes | #DEE2E6; the header line of a list #BFC4CA |
| Row hover | #F2F2F8 (a very light tint of the theme) |
| Link in a page | #017E84 (the teal of the reference) |
| Error / late | #D9534F text on white |
| Status labels (square boxes) | Draft / New: grey #E0E0E0 on #555; In Progress: light theme #D8D7EA on #4A4980; Completed / Paid: light green #D4EDDA on #1E6B34; Unpaid: light amber #FFF3CD on #8A6D00 |
| Tile for a number | #7C7BAD background, white text (as in the reference); a tile with nothing to do is a lighter tint #B9B8D6 |

## 3. Shape, text and space

| Part | Value |
|---|---|
| Corners | **0** everywhere: buttons, inputs, boxes, dialogs, menus |
| Shadows | none; a dropdown has a thin border and a light shadow only |
| Text and controls | **unchanged**: root font 18 px, the height of buttons and inputs (about 48 px) and of list rows as now |
| Font | **unchanged**: Geist Variable, with the Japanese fallback stack that is already set (no new font is installed) |
| Space | as now |
| Focus | a thin outline in the theme colour; the focus stays visible |

**Header.** Bar #7C7BAD, the height of the present top bar. Left: the name of the system in white, bold. Next to it the menu words (the size of the page text, white 90 %); the active one has a darker background (#6B6A9C). A menu with sub-entries opens a dropdown: white, thin border, no corners, the entries one under the other. Right: the user's name and the role as words, the language as the words "EN | 日本語" (the current one bold), "Log out". On a narrow screen: the name and one word "Menu" which opens the whole list.

**Page.** Under the bar: the title (grey), then a row with the main button at the left (for example "New order") and the search at the right (a bottom line, a word "Search" as the placeholder). Under it the filters: a small white button "Status ▾" (a plain character) and so on, and at the right the paging as words: "1-20 / 57  Previous  Next".

**List.** A table of full width inside a thin box. The header row: bold, #4C4C4C, a line under it; a sortable column is a link-like word, the current sort is shown by a plain character ("Name ^"). A row is a link to its page; hover #F2F2F8. The last row is grey with the totals when there are some. No check boxes, no stars, no zebra. On a phone the same table scrolls sideways (no cards: the table is the look of 2013).

**Form page** (new / details). The title and the state at the top, the buttons under it: "Save" (solid), "Discard" (white); the actions of the record (for example "Issue invoice") as white buttons next to them. The fields are in two columns inside a box: the label bold on the left, the input with **only a bottom line**; required fields marked with a red star as a character. A section title is a grey band (#EDEDF2) with bold text across the box. A table of lines (product lines, processes, stock lots) is a small table with "Add a line" as a link under it. History of the record is a plain list at the bottom (who, when, what).

**Confirm dialogs.** A white square box with a title, a text and two buttons ("Cancel", the main one); the page behind is darkened a little.

**Messages** (saved / error): a flat bar at the top of the page, green or red, with text only, gone after a few seconds.

**Summary page.** Tiles in a row as in the reference: "New" / "In Progress" / "Completed" (production orders) and "Unpaid invoices" with the amount; grey tiles under them for the totals. No charts.

**Login.** A white box in the middle, the system name above, two inputs with a bottom line, one solid button "Log in".

## 5. The "a little harder to use" part

The user asked for it; these are the proposals, none of them blocks the work:

- **no shortcuts** to the next step: after "Save" the user stays on the page and returns to the list by the link "Back to the list" (no automatic jump);
- **a confirm dialog** for the actions that cannot be undone (issue invoice, record payment, start production, a stock deduction) and for deleting;
- a **date is typed** as YYYY-MM-DD (no calendar), a number is typed (no steppers);
- the list shows 20 rows per page with "Previous / Next" (no infinite scroll);
- required fields are told only when the user presses Save (one message under the field), not while typing.

## 6. What changes in the code

| Part | Work |
|---|---|
| `index.css` | the colour tokens of section 2 and `--radius: 0`; the font size and the font family stay; the animations stay off |
| `ui/` (button, input, select, textarea, table, badge, dialog, alert-dialog, dropdown-menu, tabs, popover, tooltip, sonner) | restyled to the shapes of section 3 (the shadcn parts keep their code, only the classes change); parts that exist for the icons or the sheet (sheet, sidebar, calendar, popover date picker) are deleted |
| Shell | a new `AppHeader` with the menu and dropdowns; `AppSidebar`, the breadcrumb, the clock, the status steps, the language flags are deleted |
| Page parts | new small parts: `PageTitle`, `ListToolbar` (search + filters + paging), `DataTable`, `FormBox` (section band, two columns), `LineTable` (the lines inside a form), `Tile`; the old `DetailSheet`, `RecordSheet`, `DocumentSheet` and `CardList` go away |
| Texts | the Japanese and English files lose the keys of the cut pages (S1, P6) |

## 7. Answers of the user

| # | Question | Answer |
|---|---|---|
| U1 | Status of a record on its page | **one word in a box next to the title** (no steps) |
| U2 | Shape of the status label | **square** (one rule: no rounded corners) |
| U3 / U4 | Text size and font | **as they are now** (18 px, Geist); no Roboto |
| U5 | Link colour #017E84 | taken (links inside a page only) |
| U6 | Summary page | tiles only |
| – | Order of work | **prune (P0) → the base of the look (U1) → each page built in the new look** |

## 8. Order of work (both specs)

The look is built **first**, right after the pruning, so that every new page is made once, in the final look.

| Step | Work | Spec |
|---|---|---|
| 1 | **P0** prune the cut pages, modules, tests, texts, docs; two roles | S1 |
| 2 | **U1** the base of the look: tokens, the `ui/` parts, the header with the menu, the page parts, the login | S2 |
| 3 | **P1** master data pages (customers, products + BOM, materials + lots, users) in the new look, as pages | S1 + S2 |
| 4 | **P2** QT references | S1 |
| 5 | **P3** production orders, product lines, processes, progress history | S1 |
| 6 | **P4** stock changes and history | S1 |
| 7 | **P5** invoice, payment, receipt, print / PDF | S1 |
| 8 | **P6** summary page, the English and Japanese texts reduced, the docs rewritten | S1 |
| 9 | **P7** Playwright: the example of the requirements as one case, plus a smoke test | S1 |

After each step: unit tests, lint, build, a report before / after and the way to check it, as before.
