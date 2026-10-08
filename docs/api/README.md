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
| C1–C6 Accounting (invoices, receipts, supplier bills, payments, journal, accounting master) | [accounting.md](accounting.md) | Frontend done for all 6 (mock), **backend not implemented** |
| N1–N3 Serial numbers (S/N) of finished products: made by a button on the Work Order, one per unit, the delivery names its units, the timeline of a unit | [serial.md](serial.md) | Frontend done (mock), **backend not implemented** |
| R1 Traceability (search an S/N and read the timeline of a unit; same calls as N1–N3) | [serial.md](serial.md) | Frontend done (mock), **backend not implemented** |
| Request counters in the menu (`GET /notifications`) | [notifications.md](notifications.md) | Frontend done (mock), **backend not implemented** |
| U1–U3 Users (user list and form with department + role rows, passwords, departments and roles matrix) | [users.md](users.md) | Frontend done for all 3 (mock), **backend not implemented** |

## Error codes (the frontend translates by `error`)

| HTTP | `error` | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | body or params invalid; `errors[]` = `{ path, message }` (`message` is a code such as `REQUIRED`) |
| 401 | `UNAUTHORIZED` / `INVALID_CREDENTIALS` | no / bad token; wrong e-mail or password |
| 403 | `FORBIDDEN` | the role may not do this; `ACCOUNT_INACTIVE` for an inactive user; `CANNOT_APPROVE_OWN` (Purchase: the maker may not approve) |
| 404 | `NOT_FOUND`, `SERIAL_NOT_FOUND` | the record does not exist; unknown route = `ROUTE_NOT_FOUND` |
| 409 | `INVALID_STATUS` | the action is not allowed in the current status |
| 409 | `IN_USE`, `HAS_MOVEMENTS`, `ALREADY_USED`, `ALREADY_LINKED` | a used record cannot be deleted / changed |
| 409 | `CODE_ALREADY_EXISTS`, `EMAIL_ALREADY_EXISTS`, `PERIOD_OVERLAP`, `ROLE_TAKEN` | uniqueness / overlap rules |
| 409 | `NOT_ENOUGH_STOCK` | a stock booking would go below zero |
| 409 | `NOT_READY` | Sale: the order cannot be marked ready, the goods are not in the warehouse |
| 409 | `NOTHING_TO_DELIVER`, `NO_ROUTING`, `STEP_ORDER`, `STEPS_NOT_DONE` | Sale / Factory flow rules |
| 409 | `NOT_BALANCED` | a journal entry whose debit and credit differ |
| 409 | `LAST_ADMIN`, `CANNOT_CHANGE_SELF`, `ACCOUNT_ROLE_MISSING` | user administration rules |
| 500 | `INTERNAL_SERVER_ERROR` | anything else |

## For the person who writes the backend

1. **The mock is the executable spec.** `frontend/src/services/mock/*.js` answers every call below; its tests (`*.test.js`, `workflowTest.test.js`) are the acceptance tests: the same scenario must pass against the real API. Read a module doc here first, then its mock for the exact rules.
2. **Order of work** (each step needs the one before): auth + users → master data → stock ledger → sale → factory (+ serial numbers) → purchase → accounting → notifications + dashboard (they only read the others).
3. **Shared pieces that must be one implementation, not one per module:** the stock ledger (Sale delivery, Factory transfer, Purchase receipt and Stock adjustment all book into it, in the same transaction as the status change); the document numbers (`QT-2026-0001` … per type and year, no gaps, created inside the transaction); the material availability service (Sale, Factory and Purchase use it); the permission rules (the matrix is in `frontend/src/config/permissions.js`, computed from the same rules the pages use).
4. **Every status change is an explicit action** (`POST …/:id/:action`). The server never moves a status by itself; a late or overdue label is computed on read.
5. **A status change and its history entry are one transaction.** `history` keeps `{ id, action, status, actor, at, note }`, newest first.
6. **The existing `backend/`** has only the user sample (Express, Prisma, MySQL, Zod validators in `validators/`); its `User` table is not the final one (memberships, status, password hash are in [users.md](users.md)).
7. **What is frontend only** and needs no API: the red dot on new table rows, the header clock, the language, the test-data persistence (`kanou.testlog.v1`) and `VITE_MOCK_SEED`.
