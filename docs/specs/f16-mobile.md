# F16 Mobile (below 768px)

Scope: phone width. Tablet is in f15-tablet.md.

| Part | Phone behaviour |
|---|---|
| List tables | `DataTable` renders `CardList`: first column = title, `status` column at the right, other non-secondary columns as label/value lines, sort as a dropdown, total items line, red dot for new rows |
| Status stepper | A dropdown (status names with counts, "All") instead of the step bar |
| Header | One ⋮ "More" menu: role + name, Refresh, hide/show steps, language, Reset test data, Log out |
| Menu | Panel over the page; closes when a page is chosen |
| Sheets | Full width, single column, action row wrapped with 44px buttons, close button 44px |
| List toolbar | Search full width, New button full width |
| Dashboard | 1 column of KPI cards |

Hook: `usePhone()` (`useNarrow.js`, `PHONE_BELOW = 768`).

Not done: line-item tables inside sheets still scroll sideways in their box.

Check: open DevTools device mode at 375px; open Customers (cards), the ⋮ menu, a customer sheet, the menu, Dashboard.
