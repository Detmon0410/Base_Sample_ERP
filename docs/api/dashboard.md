# API - Dashboard

Page: `/` (the first page) · Frontend: `frontend/src/pages/dashboard`, `components/common/Charts.jsx`, `services/dashboard.service.js` · Mock: `services/mock/dashboard.js`
Conventions: [README.md](README.md)

One call gives the numbers of the page: the tiles, and for an Admin one chart of the orders by status.

`GET /dashboard` (any signed-in user)

```json
{
  "success": true,
  "data": {
    "orders": { "Draft": 1, "InProgress": 2, "Completed": 5 },
    "invoicing": {
      "unpaid": { "count": 3, "total": 270000 },
      "paidThisMonth": { "count": 2, "total": 450000 }
    }
  }
}
```

| Field | Meaning |
|---|---|
| `orders` | the number of production orders by their computed status ([orders.md](orders.md)) |
| `invoicing` | **Admin only; `null` for a Worker**, who does not see invoices |
| `invoicing.unpaid` | the number and the total of the invoices that are `Unpaid` |
| `invoicing.paidThisMonth` | the payments whose date is in the current month: their number and their sum |

Money is whole yen. The page links a tile to the page that explains it (`/sale/orders`, `/accounting`). A Worker sees the three tiles of the orders; an Admin sees them, the three tiles of the invoices and the chart of the orders by status.
