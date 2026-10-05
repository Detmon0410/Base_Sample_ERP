# D1 Spec v2 — Dashboard in the "department tiles + overview + cards" layout

Status: **DRAFT for review** (the current Dashboard from F2 stays until this is approved and built).
Replaces section 2 of [f2-app-shell-dashboard.md](f2-app-shell-dashboard.md). Reference: the POS dashboard the user showed (blue header with big module buttons, a main panel with filters, big numbers and a chart, then pairs of cards). A visual wireframe was shown in the chat.

Kept from before: overview of **all departments for every signed-in user** · no page title shown · no "add" buttons · no Refresh button and no "Live" label (it updates itself every 15 s while the tab is visible) · JPY only · desktop ≥ 1280px · EN first · block-level loading / empty / error states · numbers that signal a problem use text + icon, never color alone.

---

## 1. Layout, top to bottom

```text
┌ Header band (brand blue) ───────────────────────────────────────────────┐
│ [logo] Company name                            Sale · Manager  Purchase · Worker │
│ ┌Sale┐ ┌Factory┐ ┌Stock┐ ┌Purchase┐ ┌Accounting┐ ┌Trace┐ ┌Master┐ ┌Admin┐   (8 tiles) │
└──────────────────────────────────────────────────────────────────────────┘
┌ Overview panel ─────────────────────────────────────────────────────────┐
│ Overview                                  [Today] [This week] [This month] │
│ Sales (confirmed orders)      ┌ Orders │ Cancelled │ Average order ┐       │
│ ¥38,400,000  ▲ 8.4%           └────────┴───────────┴───────────────┘       │
│ Daily trend                          [Sales] [Units produced] [Table]      │
│ ▂▃▂▄▃▂▅▄▄▆▅▇  (bar chart)                                                  │
└──────────────────────────────────────────────────────────────────────────┘
┌ Top 5 products ──────────────┐ ┌ Work orders by status ──────────────────┐
┌ Low inventory ───────────────┐ ┌ Waiting for approval / My recent docs ──┐
┌ Production in progress ──────┐ ┌ Recent activity ────────────────────────┐
```

## 2. Zones and what they show

| Zone | Content | Behavior |
|---|---|---|
| **A. Header band** | Brand-blue block with the company logo and name, today's date, and the user's `Department · Role` chips | Static. Logo = factory icon until the real logo is supplied (Q5) |
| **A. Department tiles** (8) | One big tile per menu group (Sale, Factory, Stock, Purchase, Accounting, Traceability, Master Data, Administration), a colored bar at the bottom in the department color, and **one live number** (Sale: open orders · Factory: in process · Stock: materials in shortage · Purchase: POs waiting for goods · Accounting: overdue amount · others: a short hint) | Click opens the department's first page. A tile the user has no access to is shown **dimmed with "No access"** and is not a link. Problem numbers (shortage, overdue) use the danger text + icon. Keyboard shortcut `Alt+1…8` (Q3) |
| **B. Overview panel** | Period chips **Today / This week / This month** (default This month, Q1). Big number **Sales** = value of orders confirmed in the period, with **growth vs the previous equal period** (▲ green / ▼ red, text + arrow). Box of three: **Orders**, **Cancelled**, **Average order** | Changing the period reloads this panel only (silent) |
| **B. Daily trend chart** | Bars per day (or per week for "This month" if > 31 bars). Switch **Sales** (¥) / **Units produced** (finished goods transferred). A **Table** toggle shows the same numbers as a table | One measure at a time (never two axes). Tooltip on hover/focus with date and value |
| **C. Top 5 products** | Horizontal bars, value in ¥ (Q4: or units) for the period | Click a bar → Products list is not needed in v1 |
| **C. Work orders by status** | Donut with total in the middle + legend with counts: Finished (period), In process, Scheduled, Draft, **Late** (danger, with icon) | Legend always visible, color is never the only cue |
| **D. Low inventory** | Materials in Shortage / Near shortage: name, on hand / reorder point, status tag; link "View all" to the Stock status board (if the user may open it) | Same data as the old stock alerts |
| **D. Waiting for your approval** | Documents waiting for the user's approval (Manager: own departments, Admin: all). **Workers see "My recent documents"** instead | Same rules as before |
| **E. Production in progress** | Work orders in process with a progress bar, plan finish date and a "Late" tag | Same as before |
| **E. Recent activity** | Latest 8 events across departments | Same as before |

The old KPI cards (8) are folded into the tiles (live number), the overview (sales, orders, average) and the cards below (shortage, late, overdue), so no number is lost: **Open Sale Orders → Sale tile · Quotations waiting → Sale tile hint · WOs in process / late → Factory tile + status donut · Materials in shortage → Stock tile + Low inventory · POs waiting → Purchase tile · Overdue invoices → Accounting tile · Unpaid supplier bills → Accounting tile hint**.

## 3. Charts (how they are built)
- Library: shadcn `chart` (Recharts) — adds one dependency (Q6). Both chart types are simple (bars, donut) so a hand-drawn SVG is the fallback if the bundle size matters.
- Colors follow the `dataviz` rules: one brand hue (`#1447E6`) for single-series bars; the status donut uses fixed category order; **Late** uses the reserved danger color with an icon; every legend is visible; the palette is validated with the skill's script when built.
- Thin bars with 4px rounded tops, light grid, axis labels without decoration, no number on every bar; tooltip on hover **and** keyboard focus; a table view for every chart.
- Updates arrive silently every 15 s; bars/segments change in place without re-animating the whole chart.

## 4. Data needed (extends `GET /dashboard`)

`GET /dashboard?period=today|week|month` (default `month`). New or changed blocks (the rest of the response is unchanged, see [../api/dashboard.md](../api/dashboard.md)):

```jsonc
{
  "tiles": { "sale": { "value": 12 }, "factory": { "value": 3 }, "stock": { "value": 2, "problem": true },
             "purchase": { "value": 2 }, "accounting": { "valueJpy": 1850000, "problem": true } },
  "overview": {
    "period": "month", "salesJpy": 38400000, "previousSalesJpy": 35420000, "growthPercent": 8.4,
    "orders": 24, "cancelled": 1, "averageOrderJpy": 1600000
  },
  "trend": {
    "unit": "day",
    "sales":    [ { "date": "2026-09-21", "valueJpy": 1600000 } ],
    "produced": [ { "date": "2026-09-21", "qty": 12 } ]
  },
  "topProducts": [ { "code": "RF-2D", "name": "Refrigerator 2-Door 15Q", "valueJpy": 14200000, "qty": 41 } ],
  "workOrderStatus": { "finished": 9, "inProcess": 3, "scheduled": 2, "draft": 1, "late": 1 }
}
```

`approvals`, `myRecentDocuments`, `stockAlerts`, `production`, `activity` stay as they are. Money is integer JPY; `growthPercent` is `null` when the previous period was 0.

## 5. Behavior and states
- Every zone has its own loading skeleton (final size), empty text and error with **Try again**; one failing zone never blanks the rest.
- Period chips and the chart toggle are real buttons (`aria-pressed`) and keyboard reachable; the choice is kept in the URL (`?period=week`).
- Tiles are links with the department name as the accessible name and the number read after it ("Stock, 2 materials in shortage").
- Contrast ≥ 4.5:1 on the blue band (white text on `#1447E6` = 6.8:1); tiles are white cards, so their text uses normal ink.
- At 1280px: tiles 4 × 2, overview full width, cards in pairs; at ≥ 1600px: tiles 8 × 1.

## 6. Files (planned)
`src/pages/dashboard/` gets `HeaderBand.jsx`, `DepartmentTiles.jsx`, `OverviewPanel.jsx`, `TrendChart.jsx`, `TopProductsCard.jsx`, `WorkOrderStatusCard.jsx`; the existing blocks (`Blocks.jsx`) are reused for the lists; `KpiCard.jsx` / `kpis.js` are removed once the numbers live elsewhere. Mock: extend `services/mock/dashboard.js` (period-dependent numbers, 30 days of trend data). i18n: extend `dashboard.json`.

## 7. Open questions

| # | Question | Suggested answer |
|---|---|---|
| Q1 | Period options | Today / This week / This month; default This month |
| Q2 | What is "Sales"? | Value of Sale Orders **confirmed** in the period (not invoiced, not delivered) |
| Q3 | Keyboard shortcuts for the tiles (the reference uses F1–F8) | `Alt+1…8`; F-keys clash with the browser (F1 help, F5 reload) |
| Q4 | Top 5 products by value (¥) or by quantity? | Value (¥), with the quantity in the tooltip |
| Q5 | Company name and logo for the header band | Use the real name and logo when supplied; until then "Kanou ERP" + factory icon |
| Q6 | Add Recharts (via shadcn `chart`) | Yes |
| Q7 | Who sees money figures (sales, average order, overdue)? | Everyone, as an overview (same open point as F2 Q4 — confirm with the business) |
| Q8 | Banner decoration (the reference has a pattern and a demo stamp) | Plain brand blue, no pattern |
