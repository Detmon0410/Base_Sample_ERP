# API Contract

What the frontend expects from the backend, written **per page**. The frontend already calls these endpoints (through `frontend/src/services/*`); `VITE_USE_MOCK=true` answers them locally from `frontend/src/services/mock/`, so the real backend must match the contract here and the mock can then be switched off.

**Rule of work:** a page's API is documented here when its design is finished, then implemented in the backend.

## Conventions (all endpoints)

| Item | Rule |
|---|---|
| Base URL | `VITE_API_URL`, default `http://localhost:3000/api` |
| Format | JSON, `Content-Type: application/json`, UTF-8 |
| Auth | `Authorization: Bearer <token>` on every request except `POST /auth/login` |
| Success envelope | `{ "success": true, "data": <payload \| null>, "message"?: string }` |
| Error envelope | `{ "success": false, "message": string, "error": "<ERROR_CODE>", "errors"?: [ ... ] }` |
| `error` code | Stable `UPPER_SNAKE_CASE`. **The frontend translates by this code**, not by `message`; `message` is an English fallback for logs |
| Validation errors | HTTP 400, `error: "VALIDATION_ERROR"`, `errors` = Zod `issues` array (stack spec section 16) |
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

| Page | Document | Status |
|---|---|---|
| A1 Login (and the session / logout used by the app header) | [auth.md](auth.md) | Frontend done, **backend not implemented** |
| D1 Dashboard | [dashboard.md](dashboard.md) | Frontend done (mock), **backend not implemented** |
| M1–M10 Master data (all built) | [master-data.md](master-data.md) | Frontend done for all 10 (mock), **backend not implemented** |
| S1–S8 Sale (quotations, customer POs, sale orders, delivery notes) | [sale.md](sale.md) | Frontend done for all 8 (mock), **backend not implemented** |
| F1–F5 Factory (work orders, production tracking, finished goods transfers) | [factory.md](factory.md) | Frontend done for all 5 (mock), **backend not implemented** |
| T1–T3 Stock (balances, movements, adjustments) and its links with Factory, Sale and the Dashboard | [stock.md](stock.md) | Frontend done for all 3 (mock), **backend not implemented** |
| P1–P5 Purchase (stock status board, purchase orders, goods receipts) | [purchase.md](purchase.md) | Frontend done for all 5 (mock), **backend not implemented** |
