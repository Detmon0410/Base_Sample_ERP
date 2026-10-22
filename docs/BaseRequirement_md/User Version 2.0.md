# User Version 2.0

Splits the single **Worker** role by department: **Sale Worker** and **Factory Worker**. Each one sees and does only the work of their own department. Admin stays as it is.

Today ([api/auth.md](api/auth.md)): two roles, `Admin` and `Worker`. `department` is only a label and gives no access, and every Worker has the same rights. In 2.0 the department decides the access.

## Roles

| Role | Department | Who |
|---|---|---|
| `Admin` | Administration | Full access, as today |
| `Worker` | `Sales` | Sale Worker: quotations and the order paperwork |
| `Worker` | `Factory` | Factory Worker: production, progress and materials |

`role` stays `Admin` or `Worker`, so the token, the sign-in and the Admin rules do not change. For a Worker, `department` is now required and must be `Sales` or `Factory`. A Worker cannot have `Accounting` or `Administration` (accounting stays Admin only).

One user has one department. Several departments per user are not in this version.

## Access

| Page / action | Admin | Sale Worker | Factory Worker |
|---|---|---|---|
| Dashboard | all tiles and chart | order tiles | order tiles |
| QT references | full | full | no access |
| Production orders: view | yes | yes | yes |
| Production orders: create / edit before start | yes | yes | no |
| Start production (deducts stock) | yes | no | yes |
| Record progress | yes | no | yes (not on a Completed process) |
| Completed process: change or reopen | yes | no | no |
| Stock: materials and movements, view | yes | yes | yes |
| Stock changes (Add / Deduct / Adjust) | yes | no | yes |
| Products | full | view only | view only |
| Customers | full | view only | no access |
| Invoices, receipts | full | no access | no access |
| Users | full | no access | no access |

Menu seen by each role:

```text
Sale Worker     Dashboard · Orders (QT, Production orders) · Stock (view) · Products (view) · Customers (view)
Factory Worker  Dashboard · Production orders · Stock (Materials, Movements) · Products (view)
```

A Worker who opens a page of another department gets `403` (the frontend sends them to `/403`; the backend enforces the same on every call).

## Changes

### Data

```text
User(id, name, department, email UNIQUE, password_hash, role, last_login_at, created_at, updated_at)
```

No new column. The rule is added: `role = Worker` requires `department` in (`Sales`, `Factory`).

### Frontend

- `utils/permissions.js`: `canUse(user, roles)` also takes a department. For example `canUse(user, { roles: ["Worker"], departments: ["Factory"] })`. Admin passes every check.
- `config/navigation.js`: each entry gets `departments` beside `roles`. A menu entry is shown only when the user matches both.
- User form: the department list for a Worker is limited to `Sales` and `Factory`. The form shows the access table above as a hint.
- Existing Workers must be moved to a department once (see Migration).

### Backend (API contract)

| File | Change |
|---|---|
| `auth.md` | `user.department` decides access for a Worker. Text "it gives no access" is removed |
| `master-data.md` | `POST` / `PUT /users`: a Worker needs `department` in (`Sales`, `Factory`), else `400 VALIDATION_ERROR` with code `INVALID` on `department` |
| `qt.md` | Admin and Sale Worker. Factory Worker -> `403 FORBIDDEN` |
| `orders.md` | `POST` / `PUT /orders`: Admin, Sale Worker. `POST /orders/:id/start` and `/progress`: Admin, Factory Worker |
| `stock.md` | Stock changes: Admin, Factory Worker. Reads: everyone |
| `master-data.md` (customers) | Read: Admin, Sale Worker. Write: Admin |
| `dashboard.md` | No change: a Worker sees the order tiles |

## Migration

1. Every current Worker gets a department. The default is `Factory`, because today a Worker can only record progress.
2. The Admin changes the ones who work in sales to `Sales`.
3. Users with department `Accounting` or `Administration` and role `Worker` have to be changed before the update. Otherwise the rule above rejects their next save.

## Assumptions to confirm

1. "Sale" is the existing department `Sales`.
2. Start production (it deducts stock) belongs to Factory. Sale only prepares the order. If Sale should start production too, say so.
3. The Factory Worker may change stock by hand. This is new, because today only the Admin can.
4. A Sale Worker can view customers but not edit them.
5. There is no Manager role and no approval step. They are in [BaseRequirement_md/user_account_req.md](BaseRequirement_md/user_account_req.md) for the big system.
6. Accounting stays Admin only. A third Worker type can be added the same way later.
