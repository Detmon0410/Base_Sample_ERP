# Mini ERP — progress

Plan: [specs/s1-mini-erp-workflow.md](specs/s1-mini-erp-workflow.md) (workflow and data) and [specs/s2-mini-erp-look.md](specs/s2-mini-erp-look.md) (the look). Branch `mini-erp`. The big system (33 pages) is on branch `jay`.

**Legend:** ⬜ not started · 🟦 in progress · ✅ done

| Step | Work | State |
|---|---|---|
| P0 | Prune: the cut pages, mock modules, services, config, tests, texts and docs are deleted; two roles (Admin, Worker); the menu in the header; the 8 menu pages open as "not built yet" | ✅ |
| U1 | The base of the look: tokens, `ui/` parts, the header, the page parts, the login | ⬜ |
| P1 | Customers, products + BOM, materials + lots, users (pages, not sheets) | ⬜ |
| P2 | QT references with the file | ⬜ |
| P3 | Production orders, product lines, processes, progress history | ⬜ |
| P4 | Stock changes and history | ⬜ |
| P5 | Invoice, payment, receipt, print / PDF | ⬜ |
| P6 | Summary page, texts reduced (English and Japanese), docs rewritten | ⬜ |
| P7 | Playwright: the example of the requirements as one case, plus a smoke test | ⬜ |

## Change log

| Date | Change |
|---|---|
| 2026-10-09 | **P0**: pruned to the shell. Users: Admin and Worker only (`admin@gmail.com` / `admin`, `worker@gmail.com` / `worker`). The sidebar is gone; the menu is a row in the header (a bare structure, the look is U1). Kept as the base of the next steps: `ui/` (alert-dialog, badge, table, textarea and the parts of the sign-in), `services/crud.js`, `utils/format.js`, `utils/dates.js`, `utils/aria.js`, the mock adapter with its persistence log. |
