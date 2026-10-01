# User Account Requirement

## Concept

- A **User** can belong to **many Departments**
- In each Department, the user has a **Role**
- A user can have **different roles in different departments** (e.g. Manager in Sale, Worker in Purchase)

## Departments

- Sale
- Factory
- Purchase
- Accounting

## Roles (per department)

- **Admin** — full access across the system (not limited to one department)
- **Manager** — approve requests/documents within their department (QT/SO, WO, PO, Invoice, etc.)
- **Worker** — do their own job within their department (create/edit documents, no approval rights)

## Data Model

```text
User
  id, name, email, password, status (active/inactive)

Department
  id, name   (Sale, Factory, Purchase, Accounting)

Role
  id, name   (Admin, Manager, Worker)

UserDepartmentRole   (many-to-many bridge)
  user_id, department_id, role_id
```

One user -> many `UserDepartmentRole` rows -> each row ties the user to one department with one role.

## Example

| User  | Department | Role    |
|-------|------------|---------|
| Alice | Sale       | Manager |
| Alice | Purchase   | Worker  |
| Bob   | Factory    | Worker  |
| Carol | -          | Admin   |

Alice is a Manager in Sale (can approve SO) and also a Worker in Purchase (can create PO but not approve).

## Permission Rule

- **Admin** — bypasses department check, full access
- **Manager** — can approve documents in the department(s) where their role is Manager, plus do normal work (create/edit) there
- **Worker** — can create/edit documents only in the department(s) where they are assigned, cannot approve
