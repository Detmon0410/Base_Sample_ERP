# API — Users (U1–U3)

Frontend: [specs/f11-users.md](../specs/f11-users.md) · mock: `frontend/src/services/mock/users.js` · service: `frontend/src/services/users.service.js` · the permission table of U3 is **not** an API: it is computed in the frontend from the real rules (`frontend/src/config/permissions.js`).
Envelope, auth, paging and error format: see [README.md](README.md). Sign-in, `GET /auth/me` and the token: see [auth.md](auth.md).

## Access

**Admin only.** Every call below answers `403 FORBIDDEN` to anybody else (the menu group is hidden too). A user is a record with an Active / Inactive switch (like the master data), not a document with a status workflow.

## The user object

| Field | Type | Notes |
|---|---|---|
| `id` | number | |
| `name` | string | 1–100 characters |
| `email` | string | valid e-mail, **unique, compared case-insensitively**; used to sign in |
| `status` | `active \| inactive` | an inactive user cannot sign in and every open session of the user ends (`401`) |
| `memberships` | `[{ department, role }]` | at least one row, see rules; `department` is `Sale \| Factory \| Purchase \| Accounting`, or `null` for Admin |
| `lastLoginAt` | ISO date-time or `null` | set by a successful `POST /auth/login` |
| `hasActivity` | boolean | the user has signed in or worked on documents → cannot be deleted |
| `isSelf` | boolean | the record is the caller's own account (the frontend locks the dangerous buttons) |
| `createdAt`, `updatedAt` | ISO date-time | |

The **password is never returned**, in any call.

### Assignment rules (`memberships`)

| Rule | Error (HTTP 400 `VALIDATION_ERROR`, `errors[]` item `path` → message) |
|---|---|
| at least one row | `memberships` → `REQUIRED` |
| a department appears once | `memberships.<i>.department` → `DUPLICATE` |
| a Manager / Worker row has a department | `memberships.<i>.department` → `REQUIRED` |
| **Admin stands alone**: one row `{ department: null, role: "Admin" }` and no other row | `memberships.<i>.role` → `ADMIN_ALONE` |

## Calls

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/users` | list; params `q` (name or e-mail), `status` (`active \| inactive`), `department`, `role` (`Admin \| Manager \| Worker`), `sort` (`name, email, status, lastLoginAt`, `-` for descending, default `name`), `page`, `pageSize`. `meta = { page, pageSize, total }` |
| GET | `/admin/users/:id` | one |
| POST | `/admin/users` | create: `{ name, email, password, memberships }`. The user is **active** and can sign in at once. `409 EMAIL_ALREADY_EXISTS` on `email`. `password`: at least 8 characters with a letter and a digit (`password` → `WEAK_PASSWORD`; empty → `REQUIRED`) |
| PUT | `/admin/users/:id` | change `{ name, email, memberships }`. A `password` in the body is **ignored**. `409 EMAIL_ALREADY_EXISTS`; `409 CANNOT_CHANGE_SELF` when the caller changes the roles of their own account; `409 LAST_ADMIN` when the change removes the Admin role of the last active Admin |
| POST | `/admin/users/:id/reset-password` | `{ password }` (same strength rule). The new password works at once and **every open session of that user ends** (their next call is `401`). `409 CANNOT_CHANGE_SELF` on your own account. Returns the user |
| PATCH | `/admin/users/:id/status` | `{ status: "active" \| "inactive" }`. Deactivating ends the user's sessions. `409 CANNOT_CHANGE_SELF`; `409 LAST_ADMIN` when it would leave no active Admin |
| DELETE | `/admin/users/:id` | only a user **with no activity** (never signed in, no document). `409 IN_USE` otherwise (deactivate instead); `409 CANNOT_CHANGE_SELF`; `409 LAST_ADMIN` |

### Protection

* Nobody can deactivate, delete, demote or reset the password of **their own** account (`CANNOT_CHANGE_SELF`). Another Admin can.
* The **last active Admin** is protected (`LAST_ADMIN`): there is always somebody who can open Users.
* In the mock, sessions end by a per-user counter (`sessionVersion`) that is part of the token; a real backend can use a token version, a deny-list or short-lived tokens with a refresh check of the user's status.

## Error codes of this module

| `error` | HTTP | Frontend text |
|---|---:|---|
| `EMAIL_ALREADY_EXISTS` | 409 | under the e-mail field: "This e-mail is already used by another user." |
| `LAST_ADMIN` | 409 | "This is the last active Admin. Make another user Admin first." |
| `CANNOT_CHANGE_SELF` | 409 | "You cannot do this to your own account." |
| `IN_USE` | 409 | "This record is used by other data, so it cannot be deleted. Deactivate it instead." |
| `VALIDATION_ERROR` | 400 | per field (`WEAK_PASSWORD`, `ADMIN_ALONE`, `DUPLICATE`, `REQUIRED`, `INVALID_EMAIL`) |
| `FORBIDDEN` | 403 | not an Admin |

## U3 — Departments and roles

A read-only page with no API. Its tables are computed from the same rule functions that show or hide the buttons (`config/permissions.js` asks each rule with a sample Admin, Manager and Worker); `config/permissions.test.js` lists the result. **The backend must enforce these same rules on every endpoint.**

## Data model

```text
User(id, name, email UNIQUE (case-insensitive), password_hash, status, last_login_at, created_at, updated_at)
UserDepartmentRole(user_id, department_id NULL, role_id)   -- unique (user_id, department_id); Admin row has no department
```

An activity check for `DELETE` = a sign-in (`last_login_at`) or any row in the document tables that references the user (`created_by`, history actor, …).
