# F15 — Tablet (768–992 px held upright, and sideways)

Status: **BUILT** · Plan accepted with the suggested answers (menu = a rail that opens over the page, secondary columns hidden, sideways = the desktop layout, no phone size).

## Sizes

| Window | Layout |
|---|---|
| below 768 px | the menu is a panel that slides in (as before); not worked on in this round |
| **768 – 991 px** (tablet upright) | the menu is a 64 px rail; **the toggle opens it over the page** with a dark backdrop, opening a page or touching the backdrop closes it; short header; **secondary columns hidden**; sheets fill the screen |
| **992 – 1279 px** (tablet sideways, small laptop) | the desktop layout with the menu open; **secondary columns hidden** (the page is narrower than 1280 px); the breadcrumb shows only the current page |
| 1280 px and wider | the desktop layout, nothing hidden |

## What was changed

* **Menu** (`MainLayout`, `useNarrow`, `index.css`): below 992 px the open menu does not push the page (the page keeps its 64 px rail); a backdrop closes it. The remembered open/closed choice is kept for wide windows.
* **Header**: below 992 px the date and the word *Online* (a dot stays), and the name and the role (the helmet stays) are hidden; the breadcrumb shows only the page. Below 1280 px the breadcrumb shows only the current page and never wraps.
* **Tables** (`DataTable`, `column.secondary`): a column marked `secondary` is hidden below 1280 px, in the header, the cells and the sums row. Kept: the number or code, the party, the main amount or quantity and the status (5 columns at most on a 768 px page). 23 lists were marked.
* **Status stepper**: smaller circles, no "STEP n" line and narrower steps below 992 px; it scrolls sideways.
* **Detail sheets** (`DetailSheet`): below 992 px they fill the screen; the drag handle is not shown.
* **Production tracking**: two cards per row from 768 px, Start / Done buttons 56 px high below 992 px.
* **Page padding**: 16 px below 992 px.

## Checked

Browser at 768×1024 (Dashboard, Purchase orders list, a customer sheet, the menu opening and closing), at 1024×768 and 1180×820 (Purchase orders). Automatic test: `DataTable.test.jsx` (secondary columns). **Not yet checked**: every other page, 200 % zoom and the keyboard (the open item 8 of `docs/test.txt`), a real tablet.

## Not done

Phone sizes · the line tables inside the sheets (they still scroll sideways inside their box) · a "more" menu for the header buttons (they all fit at 768 px).
