# F11 Spec — Users (U1–U3: users, their departments and roles, and the permission matrix)

Status: **BUILT** (the ★ answers were accepted; see section 10 for what differs) · Rule as before: spec → review → build with mock data → API doc (`docs/api/users.md`) → tests.
Sources: `BaseRequirement_md/user_account_req.md` (a user belongs to many departments with a role in each; Admin / Manager / Worker; the permission rule) · `docs/frontend-plan.md` §3.9 (U1–U3, "Admin resets passwords, no forgot-password page") · `docs/test.txt` section 7 (U1–U2, U3) · `docs/api/auth.md` (the `user` object and `memberships`) · `frontend/src/utils/permissions.js` and the role rules of every module (Sale, Factory, Stock, Purchase, Accounting).

Carried-over decisions: desktop (≥ 1280px) · EN first, JA keys empty with EN fallback · no visible page title · details open as the **side sheet** · tables 15px `#666`, quiet header buttons, shared parts reused (`ListPage`, `RecordSheet`, `FormSection`, `RecordActions` with deactivate / delete, `ConfirmDialog`, `EntitySelect`, `RecordInfoCard`) — users are **records with an Active / Inactive switch like the master data**, not documents with a status workflow. Only **Admin** may open these pages (the menu group already is Admin-only).

---

## 1. The main idea

Today the nine demo users are written inside the mock. This module makes them real data that an Admin manages:

```text
User  ──┬── Sale      · Manager
        ├── Purchase  · Worker           ← one row = one department with one role
        └── (Admin has no department)
```

- **U1 Users**: who has an account, in which departments and with which role, and whether it is active.
- **U2 User form**: create a user, change the name / e-mail, **add and remove department + role rows**, reset the password, deactivate.
- **U3 Departments and roles**: a read-only table that answers "what can a Worker / Manager / Admin do in each department?". It is **computed from the real rules of the application** (the same functions that show or hide the buttons), so it can never disagree with what the program does.

## 2. Pages (build in this order)

| # | Page | Route | What it is |
|---|---|---|---|
| A0 | Foundation | – | `services/mock/users.js` (the user store, login and the admin routes move there from `routes.js`), `users.service.js`, `config/permissions.js` (the matrix rows), `users` texts, role and department texts |
| U1 | Users | `/admin/users` | list, search, filters, summary of the assignments, status |
| U2 | User form | `/admin/users/new`, `/:id` | sheet: account card, **Departments and roles** table, password reset, deactivate / delete |
| U3 | Departments and roles | `/admin/roles` | the read-only matrix and the menu access table |

### U1 Users

- **Columns**: Name · E-mail · **Assignments** (one chip per row: "Sale · Manager", "Purchase · Worker", or "Admin" alone; the first three and "+2" when more) · Last sign-in · Status (Active / Inactive). Sortable: name, e-mail, status, last sign-in.
- **Filters**: status, **department**, **role**; search by name or e-mail. A "New user" button.
- The row of the signed-in Admin is marked "You". An inactive user is shown grey with the badge.
- Empty / no result / loading / error states as in the master data lists.

### U2 User form (sheet)

- **Account card**: Name (required, ≤ 100) · E-mail (required, valid, **unique**, case-insensitive; it is the login) · for a **new** user: Password (required, at least 8 characters with a letter and a digit, with a *show* toggle and a **Generate** button that fills a random 12-character password; the password is shown once on the screen and never again).
- **Departments and roles card** (the main part): a table with one row per assignment — **Department** (Sale, Factory, Purchase, Accounting) and **Role** (Manager, Worker) — and a button **Add department**; each row has a remove icon. A third choice in the role list, **Admin**, turns the whole table into "Admin — full access to every department" (Q1). Rules: a department appears **once**; at least **one** row (Q2); an **Admin** has no other rows. Under the table one sentence says what the role means in that department, e.g. "Manager in Sale: creates and approves quotations and sale orders" (the texts of U3).
- **Password reset** (saved user only): button **Reset password** opens a dialog: new password (or Generate), confirm; the Admin tells the user; the old password stops working at once and every open session of the user ends (Q4).
- **Status**: Deactivate / Reactivate like the master data (a confirmation dialog; an inactive user cannot sign in and their open session stops working at the next request). **Delete** only when the user has **no activity** (never created or changed a document, Q3); otherwise the server says "This user has documents; deactivate instead".
- **Info card** (saved user): created, last changed, **last sign-in** (Q8).
- **Protection rules** (R3–R5): you cannot deactivate, delete or take the Admin role from **yourself**; the **last active Admin** cannot be deactivated, deleted or changed to a non-Admin; the form says why a button is disabled.
- Unsaved changes: leaving the sheet asks, as in every form.

### U3 Departments and roles

Two read-only tables, no edit, no custom roles (Q12):

1. **What each role can do** — rows grouped by department (a heading per department), columns **Admin · Manager · Worker**, a cell is a tick with the words "Yes" (never colour alone) or a dash. About 40 rows, for example: *Sale* — create and edit quotations and orders (Worker ✓, Manager ✓) · approve a sale order (Manager ✓) · confirm a delivery (…) ; *Factory* — create a work order · schedule · start a step · finish · revert ; *Stock* — create an adjustment · approve an adjustment ; *Purchase* — create a PO · send a PO (Manager) · receive goods · cancel a posted receipt ; *Accounting* — create an invoice · issue an invoice (Manager) · confirm a receipt (Worker ✓) · confirm a supplier payment (Manager) · post a manual entry · change the Accounting master ; *Administration* — manage users, master data (Admin only).
   **How the cells are filled**: each row has a small function that asks the real rule with a sample user and a sample document (`workOrderActions(draftWorkOrder, aManager).some(a => a.key === "schedule")`, `isPurchaseManager(user)`, …) for the three roles. A test asserts the expected table, so a change of a rule shows up in the matrix and in the test (R7).
2. **Which menus each role sees** — rows = the menu groups (Dashboard, Sale, Factory, Stock, Purchase, Accounting, Traceability, Master data, Administration), columns = **Sale user · Factory user · Purchase user · Accounting user · Admin** (a user of a department sees that department's group; Stock is for Factory and Purchase, as the menu rule says), computed with the same `canUse` that draws the menu.

A line above the tables repeats the rule of `user_account_req.md` in one paragraph: *Admin bypasses the department check; a Manager approves in the departments where they are Manager and also works there; a Worker works only in the departments they are assigned to and approves nothing; one person can be Manager in one department and Worker in another.*

## 3. Rules

| # | Rule |
|---|---|
| R1 | A user has **one or more** assignments; each is a **department + role** (Manager or Worker), the same department at most once. The **Admin** role has **no department** and is the only assignment of that user (Q1, Q2). |
| R2 | The e-mail is unique (case-insensitive) and is the login; the name is required. A password has at least 8 characters with a letter and a digit and is **never returned** by any call. |
| R3 | You cannot deactivate, delete or remove the Admin role of **yourself**. |
| R4 | The **last active Admin** cannot be deactivated, deleted or changed into a non-Admin. |
| R5 | A user with activity (they created or changed a document, or they are named on one) cannot be deleted; deactivate. A user without activity can be deleted. |
| R6 | A deactivated user, and a user whose password was reset, **loses the open session** at the next request (`401`); a changed assignment applies at the next request (the app reloads the user with `GET /auth/me` after an Admin saves their own row; for another user it applies the next time that user loads or signs in). |
| R7 | The U3 matrix is computed from the application's real rules; it has no data of its own. |
| R8 | Users are not the Employees of the master data (operators on the shop floor); there is no link between the two in this version. |

## 4. Roles

Only **Admin** opens `/admin/users` and `/admin/roles` and calls `/admin/*` (everybody else gets the 403 page / `403 FORBIDDEN`). An Admin who is the only Admin is protected by R3–R4.

## 5. Links with the other parts

1. **Login and session**: the login, `GET /auth/me`, the token check and the 401 on an inactive user all read the **same store** (the mock's `mockUsers` array moves into `services/mock/users.js`); a user created in U2 can sign in at once (with the password typed there), a deactivated one cannot.
2. **Author names**: documents keep storing the name and the id of the user who made them; renaming a user changes the name shown on **new** documents (the old history lines keep the name they were written with) — said in the form, no migration.
3. **Menu and route guards**: unchanged; they already read `memberships`.
4. **Dashboard**: nothing (the approvals still follow the Manager role of the signed-in user).
5. **Profile entry of the user menu**: stays a placeholder (Q7).

## 6. Mock data

- The nine demo users move into the store with their passwords (plain text, mock only), roles and status: Admin, Alice (Sale Manager + Purchase Worker), Bob (Factory Worker, **inactive**), Nina (Sale Worker), Ken (Factory Worker), Yuki (Factory Manager), Hana (Purchase Manager), Mika (Accounting Manager), Sora (Accounting Worker). They all have **activity** (R5), a created date and a last sign-in; a user created in the demo has none until someone uses it.
- Latency, the `?mock=…` error simulation and the 403 for non-Admin users as in the other mocks.

## 7. Parts

| Part | New / reused |
|---|---|
| `services/mock/users.js`, `users.service.js`, `config/permissions.js` | new (`routes.js` shrinks) |
| `pages/admin/users/` (`UsersPage`, `UserFormPage`, `userSchema`, `AssignmentsTable`, `ResetPasswordDialog`) | new, reuse `ListPage`, `RecordSheet`, `RecordActions`, `RecordInfoCard`, `FormSection` |
| `pages/admin/roles/RolesPage` (matrix + menu table) | new |
| `components/admin/` (`RoleChips`, `PasswordField` with show / generate) | new, small |
| `i18n` `users` namespace (EN, JA keys empty), the role / department words in `nav.json` already exist | new |
| Tests | rule tests (R1–R6), mock route tests as the other mocks (Admin only, unique e-mail, last Admin, self, delete, password, login of a new / inactive user), **the matrix test** (R7), component tests, a browser check as Admin |
| Docs | `docs/api/users.md`, update of `api/auth.md` (the user store), ticks of section 7 in `docs/test.txt`, `pages-progress.md` |

## 8. Out of scope for now

A **profile** page and changing your own password (the menu entry stays a placeholder) · e-mail invitations, "forgot password", password expiry and two-factor sign-in · custom roles or custom permissions (the three roles are fixed) · an audit log of who changed which user · linking a user to an Employee of the master data · importing users · limits on sign-in attempts.

## 9. Questions (★ = my suggestion)

| # | Question | Options |
|---|---|---|
| Q1 | Admin in the form | ★ "Admin" is a role choice that has **no department** and removes the other rows · an Admin may also have department rows |
| Q2 | A user with no assignment | ★ not allowed: at least one row · allowed (the user can sign in and sees only the dashboard) |
| Q3 | Deleting a user | ★ only when the user has **no activity**, otherwise deactivate · never delete · always allowed |
| Q4 | Passwords | ★ the Admin types one or presses **Generate** (shown once); minimum 8 characters with a letter and a digit; a reset ends the user's sessions · a temporary password that must be changed at the first sign-in |
| Q5 | Protection | ★ nobody can deactivate / delete / demote **themselves**, and the **last active Admin** is protected · no protection |
| Q6 | U3 content | ★ the permission matrix **computed from the real rules** plus the "which menus" table · a hand-written static table |
| Q7 | Profile and own password | ★ not now (placeholder stays) · build a small profile page with "change my password" |
| Q8 | Last sign-in | ★ stored and shown in the list and the form · not shown |
| Q9 | List filters | ★ status, department, role + search · only search and status |
| Q10 | Editing the matrix | ★ read only, no custom roles · let an Admin tick the permissions |
| Q11 | Demo users | ★ the existing nine move into the store unchanged (Bob stays inactive) · start with Admin only |
| Q12 | Employee link | ★ none now · link a user to an employee |

When you answer (or say "take the suggestions"), the build starts with A0, then U1 → U2 → U3, each page checked in the browser, then the API doc, the tests and the ticks in `test.txt`.

---

## 10. Differences between this draft and what was built

- U1 uses the document list (search, a Filters menu with status / department / role, paging) instead of the master list, because the master list only has a status filter. There is no date filter and no stepper.
- The list shows the departments and roles as chips ("Sale · Manager"), the last sign-in and a **You** marker on your own row.
- Your own record is locked: the Active switch and Delete are off, the departments and roles table is read-only and there is no Reset password button, with a note saying why. A user who has signed in or worked on documents has Delete switched off (deactivate instead).
- On a new user the password is typed or generated (Show / Hide, Generate, Copy; "write it down, it is not shown again"). A saved user has a separate **Reset password** dialog with the same field.
- The Admin option of the role list is offered only while the table has one row; choosing it replaces the other rows and removes the department.
- U3 shows one table per department (Admin / Manager / Worker with Yes / No words and a tick) and a second table of the menu groups for Sale, Factory, Purchase, Accounting and Admin users. Admin cannot "ask for approval of an order" (that button belongs to the author who is not a Manager); the page note says so.
- New test files: `config/permissions.test.js` (the matrix and the menus) and `services/mock/users.test.js` (16 cases).
