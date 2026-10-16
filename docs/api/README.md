# API contract

What the frontend expects from the backend, module by module. The frontend calls these endpoints through `frontend/src/services/*`; `VITE_USE_MOCK=true` answers them locally from `frontend/src/services/mock/`.

## Conventions (all endpoints)

| Item | Rule |
|---|---|
| Base URL | `VITE_API_URL`, default `http://localhost:3000/api` |
| Format | JSON, `Content-Type: application/json`, UTF-8 |
| Auth | `Authorization: Bearer <token>` on every request except `POST /auth/login` |
| Success envelope | `{ "success": true, "data": <payload \| null>, "message"?: string }` |
| Error envelope | `{ "success": false, "message": string, "error": "<ERROR_CODE>", "errors"?: [ ... ] }` |
| `error` code | Stable `UPPER_SNAKE_CASE`. **The frontend translates by this code**, not by `message`; `message` is an English fallback for logs |
| Validation errors | HTTP 400, `error: "VALIDATION_ERROR"`, `errors` = `[{ "path": ["field"], "code": "REQUIRED" }]`: the frontend puts the text of `code` under the field named by `path` (`["bom", "0", "quantity"]` is the quantity of the first BOM line). A unique value used already is `409` with the same `errors` shape |
| Status codes | As in the stack spec: 200/201/204, 400, 401, 403, 404, 409, 422, 500 |
| Dates | ISO 8601 strings in UTC |
| Money | Integer JPY (no decimals) |
| CORS | Allow the frontend origin (`http://localhost:5173` in development) and the `Authorization` header |

### Global frontend behavior the backend must respect

| Situation | Frontend does |
|---|---|
| Any response with **401** (except `POST /auth/login`) | Deletes the stored token and sends the user to `/login` |
| No response / network failure | Shows "Cannot reach the server" (`NETWORK_ERROR`) |
| Response without an `error` field | Treated as `UNKNOWN_ERROR` |

## Pages

| Module | Document | State |
|---|---|---|
| Sign-in and the session | [auth.md](auth.md) | Frontend done (mock), **backend not implemented** |
| Customers, products with BOM, materials (their fields), users; delete and `IN_USE` | [master-data.md](master-data.md) | Frontend done (mock), backend not implemented |
| Stock: lots and stock changes, movements, the minimum level and the status | [stock.md](stock.md) | Frontend done (mock), backend not implemented |
| QT references | [qt.md](qt.md) | Frontend done (mock), backend not implemented |
| Production orders, processes, progress | [orders.md](orders.md) | Frontend done (mock), backend not implemented |
| Accounting: invoices and payment | [invoices.md](invoices.md) | Frontend done (mock), backend not implemented |
| Accounting: receipts | [receipts.md](receipts.md) | Frontend done (mock), backend not implemented |
| Files: the evidence of a production order (and the files of a QT) | [files.md](files.md) | Frontend done (mock), backend not implemented |
| Dashboard | [dashboard.md](dashboard.md) | Frontend done (mock), backend not implemented |

The contract of the big system (sale, factory, stock, purchase, accounting, serial numbers, dashboard) is on branch `jay`.
