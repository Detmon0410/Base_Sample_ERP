# API — Dashboard (D1)

Page: `/` · Frontend: `frontend/src/pages/dashboard/*`, `hooks/useDashboard.js`, `services/dashboard.service.js`
Conventions (envelope, error codes, 401 handling): [README.md](README.md) · Design: [../specs/f2-app-shell-dashboard.md](../specs/f2-app-shell-dashboard.md)
Mock to mirror: `frontend/src/services/mock/dashboard.js`

## Endpoint

| Method | Path | Auth | Used when |
|---|---|---|---|
| `GET` | `/dashboard` | Bearer | Page opens, then **every 15 seconds while the browser tab is visible**, and right after the tab becomes visible again (the page has no Refresh button; it updates itself) |

**Load note for the backend:** every open Dashboard asks every 15 s, so this endpoint must be cheap (aggregate queries with indexes or a short server-side cache of a few seconds). Supporting `ETag` / `If-None-Match` (answer `304 Not Modified` when nothing changed) is recommended. When the backend can push changes (SSE or WebSocket), the frontend will switch from polling to push without changing this response shape.

One request returns every block so the page loads fast. A block that fails on the server is returned as `null` and listed in `errors`, so the other blocks still render (the page shows "Could not load this section" with a Try again button for that block only).

Whole request errors: `401 UNAUTHORIZED` (frontend goes to Login), `500 INTERNAL_SERVER_ERROR` (frontend shows "Could not load the dashboard" on the first load; during background updates it keeps the last data and says "Could not refresh" until a later update succeeds).

## Response

```jsonc
{
  "success": true,
  "data": {
    "generatedAt": "2026-10-02T09:30:00Z",
    "kpis": {
      "openSaleOrders":      { "count": 12, "readyToDeliver": 3 },
      "quotationsWaiting":   { "count": 5,  "oldestDays": 9 },
      "workOrdersInProcess": { "count": 3,  "scheduled": 2 },
      "lateWorkOrders":      { "count": 1 },
      "materialsInShortage": { "count": 2,  "nearShortage": 2 },
      "poWaitingForGoods":   { "count": 2,  "nextDueDate": "2026-10-09" },
      "overdueInvoices":     { "count": 2,  "amountJpy": 1850000 },
      "unpaidSupplierBills": { "count": 3,  "amountJpy": 920000, "dueWithin7Days": 1 }
    },
    "approvals": [ { "type": "SO", "id": 31, "number": "SO-0031", "party": "ABC Appliance Store", "amountJpy": 7000000, "createdAt": "2026-10-02T08:40:00Z", "department": "Sale" } ],
    "myRecentDocuments": null,
    "stockAlerts": [ { "materialId": 1, "code": "COMP", "name": "Compressor", "qtyOnHand": 40, "reorderPoint": 50, "uom": "pcs", "status": "SHORTAGE" } ],
    "production": [ { "woId": 5, "number": "WO-0005", "product": "RF-2D", "qty": 10, "stepsDone": 2, "stepsTotal": 4, "planFinish": "2026-10-05", "late": false } ],
    "activity": [ { "at": "2026-10-02T09:18:00Z", "type": "INVOICE", "number": "INV-0041", "action": "Issued", "user": "Alice Sato" } ],
    "errors": {}
  }
}
```

### Field rules

| Field | Rule |
|---|---|
| `generatedAt` | ISO 8601 UTC; shown as "Updated hh:mm" |
| Money | Integer JPY (`amountJpy`), no decimals. `amountJpy: null` is allowed for documents without an amount (e.g. a Work Order) |
| Dates | `planFinish`, `nextDueDate`: `YYYY-MM-DD`; timestamps: ISO 8601 UTC |
| `kpis` | All 8 keys are required. Definitions are below |
| `approvals` | **Role-dependent.** Admin: all departments. Manager: only departments where the user is Manager. A user who can approve nowhere (Worker only): `null` (not an empty array — `null` makes the page show "My recent documents" instead). Newest first, at most 10 |
| `myRecentDocuments` | Only for users with `approvals: null`: the last 5 documents the user created or edited `{ type, id, number, status, at }`; otherwise `null` |
| `stockAlerts` | Materials with `status` `SHORTAGE` (qty ≤ reorder point) or `NEAR_SHORTAGE` (qty ≤ 1.2 × reorder point), shortage first, at most 5 |
| `production` | Work Orders in status In Process, at most 5, nearest plan finish first. `late` = plan finish < today |
| `activity` | Latest 8 events across departments, newest first. `type` is a document code (`QT`, `SO`, `WO`, `DN`, `PO`, `GR`, `INVOICE`, `BILL` …) |
| `errors` | `{ "<blockName>": "<ERROR_CODE>" }` for each block returned as `null` because it failed; `{}` when everything worked |
| `type` of an approval | `QT`, `SO`, `WO`, `PO`, `INVOICE`, `BILL`. The frontend opens `<base>/<id>` (`/sale/quotations`, `/sale/orders`, `/factory/work-orders`, `/purchase/orders`, `/accounting/invoices`, `/accounting/bills`) |

### KPI definitions

| Key | Meaning |
|---|---|
| `openSaleOrders.count` | SO in Confirmed, In Production or Ready to Deliver; `readyToDeliver` = those in Ready to Deliver |
| `quotationsWaiting` | QT in Sent; `oldestDays` = age in days of the oldest |
| `workOrdersInProcess` | WO in In Process; `scheduled` = WO in Scheduled |
| `lateWorkOrders.count` | WO not Finished/Cancelled with plan finish < today |
| `materialsInShortage` | Materials with qty ≤ reorder point; `nearShortage` = qty ≤ 1.2 × reorder point but above it |
| `poWaitingForGoods` | PO Approved and not fully received; `nextDueDate` = earliest expected delivery (lead time) |
| `overdueInvoices` | Customer invoices past due date and not Paid: count and total outstanding in JPY |
| `unpaidSupplierBills` | Supplier bills not Paid: count and total in JPY; `dueWithin7Days` = how many fall due in the next 7 days |

> Open questions in the spec (Q2, Q3) may change these definitions; update this file when they are confirmed.

## Visibility

The dashboard is an **overview of all departments for every signed-in user** (decision in the F2 spec). The only role-dependent data is `approvals` / `myRecentDocuments`. The frontend hides links and quick actions the user cannot use, but the backend must still enforce permissions on every page and API behind those links.

## Backend checklist
- [ ] `GET /dashboard` route + controller + service that assembles the blocks (each block in its own `try/catch` so one failure does not fail the request)
- [ ] Approval query follows the role rules in `user_account_req.md`
- [ ] Indexes on status and date columns used by the KPIs
- [ ] Turn off `VITE_USE_MOCK` and compare with the mock for each role (Admin, Manager, Worker)

> **Purchase:** `kpis.poWaitingForGoods` counts the purchase orders that are Sent or Partially received (with the next expected delivery date), and the `approvals` of a Purchase Manager list the Draft purchase orders that wait to be sent. See [purchase.md](purchase.md).
