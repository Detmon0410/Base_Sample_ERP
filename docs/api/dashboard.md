# API - Dashboard

Page: `/` (the first page) · Frontend: `frontend/src/pages/dashboard`, `components/common/Charts.jsx`, `services/dashboard.service.js` · Mock: `services/mock/dashboard.js`
Conventions: [README.md](README.md) · The plan: [S3, section 4](../specs/s3-dashboard-crud-pdf.md)

One call gives the numbers of every block of the page. It replaces `GET /summary`.

`GET /dashboard` (any signed-in user)

```json
{
  "success": true,
  "data": {
    "orders": { "New": 1, "InProgress": 2, "Completed": 5 },
    "inProgress": [ { "id": 7, "orderNumber": "ORD-2026-0007", "customerName": "Tokyo Cold Chain", "done": 8, "required": 20, "percent": 40 } ],
    "leastStock": [ { "id": 3, "code": "FOAM-02", "name": "Foam", "total": 8, "stockStatus": "Low" } ],
    "invoicing": {
      "unpaid": { "count": 3, "total": 270000 },
      "paidThisMonth": { "count": 2, "total": 450000 },
      "months": [ { "month": "2026-05", "invoiced": 0, "paid": 0 }, "... six entries, the current month last" ],
      "unpaidList": [ { "id": 4, "invoiceNumber": "INV-2026-0004", "customerName": "Osaka Foods", "invoiceDate": "2026-10-01", "total": 90000 } ]
    }
  }
}
```

| Field | Meaning |
|---|---|
| `orders` | the number of production orders by their computed status ([orders.md](orders.md)) |
| `inProgress` | up to 5 orders whose status is `In Progress`, the most recently changed first. `required` is the sum, over every process of every line, of the quantity of the line; `done` is the sum of the completed quantities of those processes; `percent` = `done / required`, rounded (0 when nothing is required) |
| `leastStock` | up to 5 materials with the lowest **total quantity** (the sum of its lots), lowest first, each with its `stockStatus` (`Normal`, `Low`, `Out`, or `null` when the material has no minimum level: [master-data.md](stock.md#the-minimum-level-and-the-stock-status-of-a-material)) |
| `invoicing` | **Admin only; `null` for a Worker**, who does not see invoices |
| `invoicing.unpaid` | the number and the total of the invoices that are `Unpaid` |
| `invoicing.paidThisMonth` | the payments whose date is in the current month: their number and their sum |
| `invoicing.months` | the last 6 months, oldest first, `month` = `YYYY-MM`: `invoiced` is the sum of the totals of the invoices dated in that month, `paid` the sum of the payments dated in that month |
| `invoicing.unpaidList` | up to 5 unpaid invoices with the oldest invoice date first |

Money is whole yen. The page links a tile or a row to the page that explains it (`/orders`, `/invoices`, `/orders/:id`, `/invoices/:id`, `/stock/:id`).
