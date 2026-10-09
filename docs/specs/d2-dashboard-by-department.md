# D2 Dashboard by department

Replaces the single overview as the first screen. The overview stays as the tab **All departments** (spec [f2](f2-app-shell-dashboard.md)).

## Who sees what

| User | Tabs | Opens on |
|---|---|---|
| Admin | All departments, Sale, Factory, Stock / Purchase, Accounting | All departments |
| Department user | the departments of the user, then All departments | the first department |
| No department | All departments | All departments |

The tab is in the URL (`/?view=Sale`). Stock is part of the Purchase tab.

## Every department tab

1. ~~To do now~~ (removed together with the request counters of the menu, see f13).
2. **Four number cards** (link to the filtered list when the user may open it).
3. **Charts** drawn with plain CSS (no library); every bar chart has the numbers as a table under it (`Show the numbers as a table`). A chart without data says "No data yet".

| Tab | Number cards | Charts |
|---|---|---|
| Sale | Open Sale Orders · Quotations waiting (oldest days) · Ready to deliver · Sales this month | Sales per month (6 months) · Sale Orders by status |
| Factory | Work Orders in process · Late · Produced this week · To move to the warehouse | Work Orders running with steps done · Units produced per week (6 weeks) |
| Stock / Purchase | Materials in shortage · POs waiting for goods · POs to approve · Near shortage | Materials to watch (stock as % of the reorder point; red = shortage, amber = near) |
| Accounting | Overdue invoices (amount) · Overdue invoices (count) · Bills due in 7 days · Money received this month | Money in and out per month · What customers owe by how late (not due / 1-30 / 31-60 / over 60 days) |

## Rules

- Sales per month count sale orders that are not draft and not cancelled, by order date.
- Units produced per week = the quantity of the last step of a Work Order, by the week (Monday) the step was finished.
- Everything is counted from the real documents; nothing is typed in.
- Phone: one column; tabs wrap; the bars keep a readable size; two-series charts write the numbers under the month.

## Not in this round

Admin-only numbers (active users), a date range filter, and export.
