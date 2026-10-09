# API contract

What the frontend expects from the backend. The contract of the Mini ERP is written in step P6 of [../pages-progress.md](../pages-progress.md), module by module (customers, products, materials and stock, users, QT references, production orders, invoices). The frontend calls these endpoints through `frontend/src/services/*`; `VITE_USE_MOCK=true` answers them locally from `frontend/src/services/mock/`.

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
| Login and the session | [auth.md](auth.md) | Frontend done (mock), **backend not implemented**. It still shows the old user with `memberships`; the user of the Mini ERP is `{ id, name, department, email, role: "Admin" | "Worker", status }` |
| The other modules | written in P6 | – |

The contract of the big system (sale, factory, stock, purchase, accounting, serial numbers, dashboard, users) is on branch `jay`.
