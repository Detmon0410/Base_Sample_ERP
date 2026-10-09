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
| 403 | `ACCOUNT_INACTIVE` | The credentials are right but the user is `inactive` (check the password first) |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected failure |

A `401` from this endpoint is not an expired session: the frontend does not redirect on it. Passwords are stored hashed (bcrypt or argon2); the hash and the password are never returned. Rate limiting per IP and email is advised.

## 2. `GET /auth/me`

`data` is the same `user` object. `401 UNAUTHORIZED` when the token is missing, invalid, expired, or its user is now `inactive`; the frontend then clears the token and opens `/login`.

## 3. `POST /auth/logout`

No body. `200`, `data: null`; idempotent (an already invalid token may also answer `401`: the frontend clears the token either way).

## The `user` object

| Field | Type | Notes |
|---|---|---|
| `id` | number | |
| `name` | string | Shown in the header |
| `department` | `"Sales"` \| `"Factory"` \| `"Accounting"` \| `"Administration"` | Only a field of the user; it gives no access |
| `email` | string | Unique |
| `role` | `"Admin"` \| `"Worker"` | The only thing that decides what the user may do |
| `status` | `"active"` \| `"inactive"` | Only `active` users can sign in or use a token |

The frontend only hides what a role may not use (`frontend/src/utils/permissions.js`). **The backend enforces the same rules on every endpoint** (the table in each module document says who may call what).

## Sessions

* A new password, or making a user inactive, ends the sessions of that user: the next call with the old token answers `401 UNAUTHORIZED`. The mock keeps a counter of the session inside the token; a real backend may use a token version or a deny-list.
* Token: opaque or JWT, sent as `Authorization: Bearer`; the frontend keeps it in `localStorage` (`kanou.token`). Expiry is not decided (suggested: one work shift, 8-12 h); there is no refresh. Open decision: header token (now) or an httpOnly cookie (needs `credentials: include`, CORS with credentials and CSRF protection).

## Data needed

```text
User(id, name, department, email UNIQUE, password_hash, role, status, last_login_at, created_at, updated_at)
```

Seed: one Admin.
