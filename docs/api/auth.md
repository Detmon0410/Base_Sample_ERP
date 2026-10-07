# API — Authentication (Login page A1)

Page: `/login` · Frontend: `frontend/src/pages/auth/LoginPage.jsx`, `components/auth/AuthProvider.jsx`, `services/auth.service.js`
Conventions (envelope, error codes, 401 handling): [README.md](README.md)

## Endpoints used

| # | Method | Path | Auth | Used when |
|---|---|---|---|---|
| 1 | `POST` | `/auth/login` | none | User submits the login form |
| 2 | `GET` | `/auth/me` | Bearer | App starts / page is reloaded with a saved token |
| 3 | `POST` | `/auth/logout` | Bearer | User presses **Log out** in the header |

No registration and no forgot-password endpoint: accounts and password resets are handled by an Admin ([users.md](users.md)).

---

## 1. `POST /auth/login`

Request body

```json
{ "email": "alice@company.co.jp", "password": "secret" }
```

| Field | Type | Rules |
|---|---|---|
| `email` | string | Required, valid email. The frontend trims it; the backend should also trim and compare **case-insensitively** |
| `password` | string | Required, not trimmed |

Success — `200`

```json
{
  "success": true,
  "data": {
    "token": "<access token>",
    "user": {
      "id": 2,
      "name": "Alice Sato",
      "email": "alice@company.co.jp",
      "status": "active",
      "memberships": [
        { "department": "Sale", "role": "Manager" },
        { "department": "Purchase", "role": "Worker" }
      ]
    }
  }
}
```

Errors

| HTTP | `error` | When | Frontend message (EN) |
|---:|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing / malformed `email` or `password` | Generic error (the form validates first, so this is rare) |
| 401 | `INVALID_CREDENTIALS` | Unknown email **or** wrong password. Use the same response for both (no account enumeration) | The email address or password is incorrect. |
| 403 | `ACCOUNT_INACTIVE` | Credentials are correct but `status = inactive` | This account is disabled. Please contact your administrator. |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected failure | Something went wrong on the server. Please try again later. |

Notes
- Check the password **before** revealing `ACCOUNT_INACTIVE`, so the status of an account is never disclosed without valid credentials.
- A `401` from this endpoint must **not** be treated by the client as an expired session — the frontend already excludes `/auth/login` from the 401 → redirect rule.
- Store passwords hashed (bcrypt or argon2). Never return the hash or the password.
- Consider rate limiting per IP + email (factory system, but the login is still the main entry point).

## 2. `GET /auth/me`

Headers: `Authorization: Bearer <token>`

Success — `200`: `data` is the same `user` object as in login.

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Demo Admin",
    "email": "admin@company.co.jp",
    "status": "active",
    "memberships": [{ "department": null, "role": "Admin" }]
  }
}
```

Errors

| HTTP | `error` | When |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Token missing, invalid, expired, or the user is now `inactive` / deleted |

Frontend effect of 401: token is cleared and the user lands on `/login` (shown message key `UNAUTHORIZED`: "Your session has ended. Please log in again.").

## 3. `POST /auth/logout`

Headers: `Authorization: Bearer <token>` · Body: none

Success — `200`, `{ "success": true, "data": null }`. Should be **idempotent**: an already-invalid token still returns success (or 401, which the client tolerates — it clears the token locally either way).

If tokens are stateless JWTs this can simply return success; if a deny-list / refresh-token store exists, invalidate the token here.

---

## The `user` object

| Field | Type | Notes |
|---|---|---|
| `id` | number | |
| `name` | string | Shown in the header |
| `email` | string | |
| `status` | `"active"` \| `"inactive"` | Only `active` users can log in or use a token |
| `memberships` | array | One entry per `UserDepartmentRole` row (see `user_account_req.md`) |
| `memberships[].department` | `"Sale"` \| `"Factory"` \| `"Purchase"` \| `"Accounting"` \| `null` | `null` for Admin (not tied to a department) |
| `memberships[].role` | `"Admin"` \| `"Manager"` \| `"Worker"` | |

How the frontend uses `memberships` (`frontend/src/utils/permissions.js`):
- `isAdmin` = any membership with `role = "Admin"` → sees every menu, passes every department check
- department access = a membership with that `department`
- approve rights = `role = "Manager"` in that department (or Admin)

The frontend only hides UI. **The backend must enforce the same rules on every endpoint.**

## Data model needed (from `user_account_req.md`)

```text
User(id, name, email UNIQUE, password_hash, status, created_at, updated_at)
Department(id, name)                         -- Sale, Factory, Purchase, Accounting
Role(id, name)                               -- Admin, Manager, Worker
UserDepartmentRole(user_id, department_id NULL, role_id)
```

`department_id` is nullable for the Admin row. Seed: the 4 departments, the 3 roles, and one Admin user.

## Accounts, sessions and the user store ([users.md](users.md))

* A successful login stores `lastLoginAt` (shown in the Users list).
* **Sessions end** when an Admin resets the password of a user or deactivates the user: the next call with the old token answers `401 UNAUTHORIZED` (the frontend then goes to `/login`). The mock keeps a per-user counter inside the token for this; a real backend may use a token version or a deny-list.
* A new user created by an Admin can sign in at once with the password the Admin set. Passwords are at least 8 characters with a letter and a digit.
* The mock keeps its users in one store (`services/mock/users.js`), so users created in the Users page can sign in.

## Token

| Item | Current frontend assumption |
|---|---|
| Type | Opaque token or JWT, sent as `Authorization: Bearer` |
| Storage | `localStorage` key `kanou.token` |
| Expiry | Not decided. Suggested: access token 8–12 h (one work shift); on expiry the API returns 401 and the user logs in again |
| Refresh | Not implemented in the frontend |

**Open decision:** JWT in header (current) vs httpOnly cookie. A cookie is safer against XSS but needs `credentials: include` in `api.js`, CORS with credentials, and CSRF protection.

## Frontend cases the backend can verify against

| Case | Mock account type | Expected result |
|---|---|---|
| Valid login (Admin) | Admin, `department: null` | 200, user with one Admin membership |
| Valid login (multi-department) | Manager in Sale + Worker in Purchase | 200, two memberships |
| Wrong password / unknown email | – | 401 `INVALID_CREDENTIALS` |
| Inactive account | status `inactive` | 403 `ACCOUNT_INACTIVE` |
| Reload with valid token | – | `GET /auth/me` 200 |
| Bad / expired token | – | `GET /auth/me` 401 → client goes to `/login` |

Mock implementation to mirror: `frontend/src/services/mock/routes.js`.

## Backend implementation checklist

- [ ] Prisma models + migration for the data model above, and seed
- [ ] `validators/auth.validator.js` (Zod: `email`, `password`)
- [ ] `services/auth.service.js` (verify password hash, status check, issue token, load memberships)
- [ ] `controllers/auth.controller.js`, `routes/auth.routes.js` mounted at `/api/auth`
- [ ] Auth middleware (`Authorization: Bearer`) setting `req.user` for protected routes
- [ ] `error.middleware.js` extended to return `{ success:false, message, error }` with the codes above (currently it returns only 500)
- [ ] CORS: allow `Authorization` header
- [ ] Turn off `VITE_USE_MOCK` and re-run the cases above
