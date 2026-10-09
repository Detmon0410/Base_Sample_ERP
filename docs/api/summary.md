# API — Summary

Page: `/` · Frontend: `frontend/src/pages/summary`, `services/summary.service.js` · Mock: `services/mock/summary.js`
Conventions: [README.md](README.md)

`GET /summary` (any signed-in user) gives the few numbers of the first page:

```json
{ "success": true, "data": { "orders": { "New": 1, "InProgress": 2, "Completed": 5 }, "unpaidInvoices": { "count": 3, "total": 270000 } } }
```

* `orders`: the number of production orders by their computed status ([orders.md](orders.md)).
* `unpaidInvoices`: the number of `Unpaid` invoices and the sum of their `total`; **`null` for a Worker** (a Worker does not see invoices).
