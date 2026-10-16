# API — Sign-in and the session

Page: `/login` · Frontend: `frontend/src/pages/auth/LoginPage.jsx`, `services/auth.service.js` · Mock: `services/mock/users.js`
Conventions (envelope, error codes, 401 handling): [README.md](README.md)

## Endpoints

| # | Method | Path | Auth | Used when |
|---|---|---|---|---|
| 1 | `POST` | `/auth/login` | none | The user submits the sign-in form |
| 2 | `GET` | `/auth/me` | Bearer | The app starts, or the page is reloaded with a saved token |
| 3 | `POST` | `/auth/logout` | Bearer | The user presses **Log out** |

No registration and no forgot-password endpoint: an Admin makes the accounts and sets the passwords ([master-data.md](master-data.md), Users).

## 1. `POST /auth/login`

Request: `{ "email": "admin@gmail.com", "password": "admin" }`. The backend trims the email and compares it **case-insensitively**; the password is not trimmed.

Success `200`: `data` = `{ "token": "<access token>", "user": <user> }`.

| HTTP | `error` | When |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | `email` or `password` missing or malformed |
| 401 | `INVALID_CREDENTIALS` | Unknown email **or** wrong password (the same answer for both) |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected failure |

A `401` from this endpoint is not an expired session: the frontend does not redirect on it. Passwords are stored hashed (bcrypt or argon2); the hash and the password are never returned. Rate limiting per IP and email is advised.

## 2. `GET /auth/me`

`data` is the same `user` object. `401 UNAUTHORIZED` when the token is missing, invalid, expired; the frontend then clears the token and opens `/login`.

## 3. `POST /auth/logout`

No body. `200`, `data: null`; idempotent (an already invalid token may also answer `401`: the frontend clears the token either way).

## The `user` object

| Field | Type | Notes |
|---|---|---|
| `id` | number | |
| `name` | string | Shown in the header |
| `department` | `"Sales"` \| `"Factory"` \| `"Accounting"` \| `"Administration"` | For a **Worker** it is required and is `Sales` (a Sale Worker) or `Factory` (a Factory Worker), and it **decides what the Worker may do**. An Admin may have any department (it is only a label for an Admin) |
| `email` | string | Unique |
| `role` | `"Admin"` \| `"Worker"` | `Admin` may do everything. A `Worker` may do what the department allows (the table below) |

The frontend only hides what a user may not use (`frontend/src/utils/permissions.js`, the table `ACTIONS`). **The backend enforces the same rules on every endpoint** (the table in each module document says who may call what).

## Access by role and department

`role` stays `Admin` or `Worker`, so the token and the sign-in do not change. The department of a Worker decides the access:

| Action | Admin | Sale Worker (`Sales`) | Factory Worker (`Factory`) |
|---|---|---|---|
| Dashboard | all tiles and the chart | order tiles | order tiles |
| QT: see, make, change, print, Confirm, delete a Draft | yes | yes | `403` |
| Production orders: read | yes | yes | yes |
| Production orders: make or change before the start | yes | yes | `403` |
| Start production (it deducts stock) | yes | `403` | yes |
| Record progress | yes | `403` | yes (not on a Completed process) |
| Change or reopen a Completed process | yes | `403` | `403` |
| Order evidence files: read | yes | yes | yes |
| Order evidence files: upload, delete ([files.md](files.md)) | yes | `403` | yes |
| Stock and its history: read | yes | yes | yes |
| Stock changes (Add / Deduct / Adjust) | yes | `403` | yes |
| Materials (make, change, delete) | yes | `403` | `403` |
| Products: read | yes | yes | yes |
| Products: write | yes | `403` | `403` |
| Customers: read | yes | yes | `403` |
| Customers: write | yes | `403` | `403` |
| Invoices, receipts, users | yes | `403` | `403` |

A Worker who calls what the department does not allow gets `403 FORBIDDEN`; the frontend sends them to `/403`. The check for the role and department comes **before** the check that the record exists (a missing record is `403` for a user who may not touch it, not `404`).

A Worker with a department other than `Sales` or `Factory` (old data) may only do what everybody may (the rows with "yes" for both Workers). They have to be moved to a department; see [master-data.md](master-data.md), Users.

## Sessions

* A new password ends the sessions of that user: the next call with the old token answers `401 UNAUTHORIZED`. The mock keeps a counter of the session inside the token; a real backend may use a token version or a deny-list.
* Token: opaque or JWT, sent as `Authorization: Bearer`; the frontend keeps it in `localStorage` (`kanou.token`). Expiry is not decided (suggested: one work shift, 8-12 h); there is no refresh. Open decision: header token (now) or an httpOnly cookie (needs `credentials: include`, CORS with credentials and CSRF protection).

## Data needed

```text
User(id, name, department, email UNIQUE, password_hash, role, last_login_at, created_at, updated_at)
```

Seed: one Admin. The mock also has a Factory Worker (`worker@gmail.com`) and a Sale Worker (`sale@gmail.com`).
