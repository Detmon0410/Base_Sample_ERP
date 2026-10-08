# API — Request counters (menu badges)

Frontend: [specs/f13-workflow-test.md](../specs/f13-workflow-test.md) · mock: `frontend/src/services/mock/notifications.js` · hook: `frontend/src/hooks/useNotifications.js`.
Envelope, auth and error format: see [README.md](README.md).

## What it is

The red numbers in the left menu: how many documents of a department **wait for somebody of that department to do something**. They are **counted from the real documents**, never stored, and only what the signed-in user can act on is counted. The page itself (a list) is the proof: a number in the menu must be explained by rows in the list or in its "Waiting" panel.

The frontend calls it when a page loads, when the tab becomes visible or gets the focus, after every write made in the app (`requestRefresh`) and **every 10 seconds**. It can be a plain polling endpoint; a push channel is not needed.

## `GET /notifications`

Any signed-in user. No params.

```json
{ "success": true, "data": {
  "generatedAt": "2026-10-08T05:00:00.000Z",
  "groups": {
    "sale":       { "total": 3, "items": { "saleOrders": 2, "deliveryNotes": 1 } },
    "factory":    { "total": 1, "items": { "workOrders": 1, "fgTransfer": 0 } }
  } } }
```

- `groups` has a key only for the menu groups the user may see (`sale`, `factory`, `stock`, `purchase`, `accounting`); a group without any right is **absent**. `total` = the sum of `items`.
- `items` keys are menu items; a key may be missing or `0`.
- Counters never block anything and never change a status.

## Who counts what

Level of a user in a group: **Admin = manager level in every group**; otherwise the user's role in the department of the group (Stock is shared: Factory **or** Purchase). **Manager sees manager + worker counters; Worker sees worker counters only.** No role in the department → the group is absent.

| Group | Item | Level | Counted as |
|---|---|---|---|
| sale | `saleOrders` | manager | sale orders `status = draft` and `approval = requested` (wait for the confirmation) |
| sale | `saleOrders` | worker | sale orders `ready_to_deliver` (a delivery note is to be made) |
| sale | `deliveryNotes` | worker | delivery notes `draft` (to confirm when the goods leave) |
| factory | `workOrders` | worker | rows of `GET /factory/waiting-orders` (order lines without a work order) **+** work orders `scheduled` (to start) |
| factory | `workOrders` | manager | work orders `draft` (to schedule) **+** `in_process` with every step done (to finish) |
| factory | `fgTransfer` | worker | work orders `finished` with `remainingToTransfer > 0` |
| factory | `fgTransfer` | manager | transfers `draft` (to post) |
| stock | `stockAdjustment` | manager | adjustments `pending` |
| purchase | `stockStatus` | worker | board rows `shortage` or `near_shortage` with nothing on order (`onOrder = 0`) |
| purchase | `purchaseOrders` | worker | purchase orders `rejected` (to correct) |
| purchase | `purchaseOrders` | manager | purchase orders `pending` (to approve) + `approved` (to send) |
| purchase | `goodsReceipt` | worker | total of `GET /purchase/orders?receivable=1` (goods to receive) + receipts `draft` (to post) |
| accounting | `invoices` | worker | length of `GET /accounting/invoices/sources` (delivered, not invoiced) |
| accounting | `invoices` | manager | invoices `draft` (to issue) |
| accounting | `bills` | worker | length of `GET /accounting/bills/sources` (goods received, no bill) |
| accounting | `bills` | manager | bills `draft` (to approve) |
| accounting | `receipts` | worker | receipts (money in) `draft` (to confirm) |
| accounting | `payments` | manager | payments (money out) `draft` (to confirm) |
| accounting | `journal` | manager | journal entries `draft` (to post) |

Each rule uses the same query the list page uses (`meta.statusCounts` of the list, not a second definition), so the number and the list cannot disagree. If one rule fails, count it as 0 and keep the others.

## Red dot of a new row (frontend only)

The dot on a **new row of a table** is **not** an API: the frontend remembers per user the time it started to look and the rows that were opened (`localStorage`). The backend only has to give every record a stable `id` and `createdAt` / `updatedAt`.

## Done when

- [ ] one SQL count per rule (or a shared service with the list endpoints), a single request answers the whole menu
- [ ] the numbers equal the rows of the list / waiting panel for the same user
- [ ] a user without a role in a group gets no key for it
