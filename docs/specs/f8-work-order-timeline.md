# F8 Spec — Work Orders: Timeline view

Status: **APPROVED with the suggested answers (★) for Q1–Q8. BUILT with mock data** (differences: the arrows move one page, "N days late" is shown in the row label and a clock icon on the hatched part) · Rule as before: spec → review → build with mock data → API doc (none needed, see section 6) → tests.

Sources: the review of the Work Orders Kanban (this session) · `docs/specs/f7-factory.md` · `frontend/src/services/mock/factory.js` (work order fields: `planStart`, `planFinish`, `status`, `progress`).

Carried-over decisions: desktop (≥ 1280px) · EN first, JA keys empty · JPY n/a · tables and cards in the shared look · **manual first** (the Timeline only shows; every change is still a button or a Kanban drag).

---

## 1. Why

The Kanban answers "which status is each job in". It does not answer what the factory manager asks every morning:

1. **Which jobs will be late, and which are already late?**
2. **What is planned this week and next week? Do jobs overlap?**
3. **Where is each job right now (which step)?**

A Timeline (a simple Gantt) answers these on one screen, with data that already exists. No new fields, no backend change.

## 2. What the user sees

The Work Orders page gets the view switch back, with two views: **Kanban** (as now) and **Timeline**. The choice is remembered (`kanou.workOrders.view`). Same toolbar (Filters, search, New work order) for both. Cards and Table stay removed.

```text
                    Oct 2026
 Work order                 28   29   30   1    2    3    4    5    6   [7]   8    9   10 ...
 ─────────────────────────────────────────────────────────────────────┊──────────────────
 WO-2026-0001  RF-2D × 12   ·    ·    ·    ·  ██████████████▒▒▒▒▒▒▒▒▒┊                     ← late (orange)
   In process · Assembly 2/4                                          ┊
 WO-2026-0002  RF-1D × 6    ·    ·    ·    ·    ·    ·    ·    ·    ·┊   ░░░░░░░░░░░░░░░░   ← scheduled
   Scheduled · not started                                            ┊
 WO-2026-0007  RF-2D × 4   no plan dates  (Draft)                      ┊
```

- **Rows**: one per work order, newest plan first (sorted by plan start). Left column (fixed, ~18rem): number, product and quantity on the first line; status badge and the running step or "not started" on the second.
- **Bars**: from `planStart` to `planFinish`, colour by status (the same colours as the Kanban and the status badges). A bar is drawn in two parts: the done part (solid, = steps done / steps total) and the rest (light).
- **Late**: if `progress.late`, the bar is orange and ends with a small clock icon and "N days late"; the part after the planned finish up to today is hatched, so a late job visibly runs past its plan.
- **Today line**: a vertical blue line with the date at the top; the view opens scrolled so today is about a third from the left.
- **Time scale**: days as columns (about 2.5rem each), month name above, weekends shaded. Buttons **Week | Month** choose how many days are shown (14 or 42); arrows move one page, **Today** jumps back. The range always contains the plan of every visible work order when it fits; otherwise the first page opens around today.
- **No plan dates** (Draft): listed at the bottom under "No plan dates" as plain rows without a bar, so nothing disappears.
- **Finished and Cancelled**: hidden by default (like folded in the Kanban); a switch "Show finished and cancelled" shows them, grey/green and without the late mark.
- **Click a bar or a row** opens the work order dialog (same route as the Kanban). **No dragging** in v1 (changing dates is done in the dialog of a draft; see Q4).
- **Hover or focus** on a bar shows a tooltip: number, product, quantity, plan dates, steps done, status.

## 3. Rules

| # | Rule |
|---|---|
| T1 | Only work orders matching the toolbar filters and search are shown (same list request as the Kanban, up to 100). |
| T2 | Bar length = planStart…planFinish inclusive; a one-day plan is one cell wide. |
| T3 | Done part = `stepsDone / stepsTotal` of the bar width. Not the produced quantity. |
| T4 | Late = existing `progress.late` / `lateDays` (open work order whose planFinish is before today). No new calculation. |
| T5 | Sorting is fixed: planStart ascending, no-plan rows last. The sortable column headers of the table are not needed. |
| T6 | Everything also works with the keyboard: rows are links, Tab moves row by row, the arrows move the date page when the scale has focus. |
| T7 | Colour is never the only signal: late has the clock icon and the text, status has the badge text, today has the label. |

## 4. Accessibility and size (users 40–50+)

- Text in rows 15px+, bars at least 1.5rem high, hit area of a row at least 3.5rem high.
- The bar has a text alternative: "WO-2026-0001, 12 pcs, 2 Oct to 5 Oct, 2 of 4 steps done, 2 days late".
- At 200% zoom the left column stays fixed and the time scale scrolls sideways.

## 5. Parts

| Part | New / reused |
|---|---|
| `components/factory/WorkOrderTimeline.jsx` | new: rows, bars, scale, today line, week/month and arrows |
| `components/factory/timelineLayout.js` | new: pure functions (date → column, bar span, done part, page range); unit-tested |
| `WorkOrdersPage.jsx` | board views `["kanban", "timeline"]` (the `only` flag is removed) |
| `DocumentListPage.jsx` | the full-height fill applies to both views |
| `ViewSwitch.jsx` | new icon for `timeline` (GanttChartIcon), label `common:views.timeline` |
| `factory.json` / `common.json` | few new texts: Week, Month, Today, previous/next, "No plan dates", "Show finished and cancelled", "N days late" (exists) |
| Mock / service / API doc | **no change** (same `GET /factory/work-orders` list) |
| Tests | `timelineLayout` pure tests; render test: bars, late mark, no-plan rows, finished hidden/shown, today line; click opens the dialog |

## 6. Out of scope for v1

Dragging bars to change dates · showing each step as a small block inside the bar · machine/line view (that is the Tracking page) · printing the Timeline · weekly capacity numbers.

## 7. Questions (★ = my suggestion)

| # | Question | Suggestion |
|---|---|---|
| Q1 | Views of the page | ★ Kanban + Timeline (switch back). Alternative: Timeline replaces the Kanban. |
| Q2 | Which view opens first | ★ Kanban (as now), the choice is remembered. |
| Q3 | Time scale | ★ Day columns with Week (14 days) and Month (42 days) buttons. Alternative: weeks only. |
| Q4 | Drag a bar to change the plan dates | ★ Not in v1 (dates are edited in the dialog of a draft; a scheduled order's dates are locked by the current rules). Add later if wanted. |
| Q5 | Finished and Cancelled | ★ Hidden by default, one switch shows them. |
| Q6 | Done part of the bar | ★ Steps done / total (not quantity). |
| Q7 | Show a step-by-step breakdown inside each bar | ★ No in v1 (the dialog has it). |
| Q8 | Dashboard "late work orders" alert (not built yet) could open this view with a "late only" filter | ★ Later, after this view exists. |

Once Q1–Q8 are answered (or ★ accepted), I build it with the mock data, add the tests, run the browser check and log it in `docs/pages-progress.md`.

