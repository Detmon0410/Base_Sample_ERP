# API — Master Data (M1–M10)

Pages: `/master/*` · Frontend: `frontend/src/services/crud.js`, `customer.service.js`, `pages/master/*`
Conventions (envelope, error codes, 401 handling): [README.md](README.md) · Design: [../specs/f3-master-data.md](../specs/f3-master-data.md)
Mock to mirror: `frontend/src/services/mock/masterData.js`

**Status:** Customers (M1) are built in the frontend against the mock. The other resources use **the same 6 endpoints and rules**; each one gets its field table below when its page is designed and built.

## Access
Master data is maintained by **Admin only** (F3 spec Q6/Q7). Every endpoint below answers `403 FORBIDDEN` to any other user, and `401 UNAUTHORIZED` without a valid token. (If non-Admin users later need read-only pick-lists inside documents, add separate read endpoints such as `GET /lookup/customers`; do not open these.)

## The 6 endpoints (same for every resource)

| # | Method | Path | Purpose | Success |
|---|---|---|---|---|
| 1 | `GET` | `/master/<resource>` | List one page | 200 `{ data: [...], meta }` |
| 2 | `GET` | `/master/<resource>/:id` | One record | 200 `{ data: {...} }` |
| 3 | `POST` | `/master/<resource>` | Create | **201** `{ data: {...}, message }` |
| 4 | `PUT` | `/master/<resource>/:id` | Update fields | 200 `{ data: {...} }` |
| 5 | `PATCH` | `/master/<resource>/:id/status` | Deactivate / reactivate | 200 `{ data: {...} }` |
| 6 | `DELETE` | `/master/<resource>/:id` | Delete a record nothing refers to | 200 `{ data: null }` (204 is also accepted) |

Resources: `customers` (M1), `suppliers` (M2), `products` (M3), `materials` (M4), `warehouses` (M6), `machines` (M7), `employees` (M8), `uom` (M9), `price-lists` (M10). Sub-lists (BOM, routing, supplier materials) get their own endpoints when M2/M3/M4 are built.

### 1. List — query parameters

| Param | Meaning | Default |
|---|---|---|
| `q` | Text matched (case-insensitive, contains) against `code` and `name` | none |
| `status` | `all` \| `active` \| `inactive` | `all` |
| `sort` | A field name; prefix `-` for descending, e.g. `-name`. Allowed fields are listed per resource; anything else falls back to `code` | `code` |
| `page` | 1-based. A page past the end returns the last page | `1` |
| `pageSize` | Maximum 100 | `20` |

Response:

```json
{
  "success": true,
  "data": [ { "id": 1, "code": "C001", "name": "ABC Appliance Store", "…": "…" } ],
  "meta": { "page": 1, "pageSize": 20, "total": 134 }
}
```

`meta.page` is the page actually returned. Empty values (`null` / `""`) sort first when ascending.

### 3. Create — rules
- The body has the resource fields (see below) **without** `id`, `status`, timestamps. New records start `active`.
- `code`: required, trimmed, **unique per resource, case-insensitive** (`c001` collides with `C001`).
- Returns the created record with `createdAt` / `updatedAt` (ISO 8601 UTC).

### 4. Update — rules
- **`code` is immutable.** The backend ignores a `code` in the body (or rejects a different one with 400); documents refer to it.
- `status` is not changed here, only through endpoint 5.

### 5. Status
Body `{ "status": "active" | "inactive" }`. Idempotent. An inactive record stays in old documents and reports but is not offered in new ones.

### 6. Delete
Allowed only when **no other record refers to it**; otherwise `409 IN_USE` (the frontend tells the user to deactivate instead).

## Errors (all resources)

| HTTP | `error` | When | Frontend shows |
|---:|---|---|---|
| 400 | `VALIDATION_ERROR` | Body fails validation. `errors` is a list of `{ "path": ["email"], "message": "<CODE>" }` where `message` is `REQUIRED`, `INVALID_EMAIL`, `INVALID` … | The message under the matching field |
| 401 | `UNAUTHORIZED` | No / expired token | Login |
| 403 | `FORBIDDEN` | Not an Admin | Toast "You do not have permission to change master data." |
| 404 | `NOT_FOUND` | Unknown id | "This record does not exist." |
| 409 | `CODE_ALREADY_EXISTS` | `code` already used (case-insensitive) | Error under the Code field |
| 409 | `IN_USE` | Delete of a referenced record | Toast "…cannot be deleted. Deactivate it instead." |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected | "Could not load the list." with Try again |

---

## M1 Customers — `/master/customers`

Sortable fields: `code`, `name`, `paymentTerms`, `creditLimit`, `status`. Searched fields: `code`, `name`.

| Field | Type | Rules |
|---|---|---|
| `id` | number | |
| `code` | string | required, ≤ 20, unique (case-insensitive), immutable |
| `name` | string | required, ≤ 100 |
| `taxId` | string | optional, digits with an optional leading `T`, ≤ 14 (no checksum in v1, Q10) |
| `address` | string | optional, ≤ 500 |
| `contactPerson` | string | optional, ≤ 100 |
| `contactPhone` | string | optional, ≤ 30 |
| `contactEmail` | string | optional, valid e-mail, ≤ 100 |
| `paymentTerms` | string \| null | one of `NET_15`, `NET_30`, `NET_45`, `NET_60`, `COD` (fixed list, Q3) |
| `creditLimit` | integer \| null | whole JPY, ≥ 0 |
| `status` | `"active"` \| `"inactive"` | read-only here |
| `createdAt`, `updatedAt` | ISO 8601 UTC | read-only |

Example record:

```json
{
  "id": 1, "code": "C001", "name": "ABC Appliance Store", "taxId": "1234567890",
  "address": "1-2-3 Shinjuku, Tokyo", "contactPerson": "Tanaka", "contactPhone": "03-1234-5678",
  "contactEmail": "purchasing@example1.co.jp", "paymentTerms": "NET_30", "creditLimit": 5000000,
  "status": "active", "createdAt": "2026-09-01T09:00:00.000Z", "updatedAt": "2026-09-01T09:00:00.000Z"
}
```

"In use" for customers = referenced by any Quotation, Customer PO, Sale Order, Delivery Note or Invoice (once those exist).

### Data model sketch (Prisma)

```prisma
model Customer {
  id            Int      @id @default(autoincrement())
  code          String   @unique @db.VarChar(20)   // compare case-insensitively (MySQL collation utf8mb4_0900_ai_ci does)
  name          String   @db.VarChar(100)
  taxId         String?  @db.VarChar(14)
  address       String?  @db.VarChar(500)
  contactPerson String?  @db.VarChar(100)
  contactPhone  String?  @db.VarChar(30)
  contactEmail  String?  @db.VarChar(100)
  paymentTerms  String?  @db.VarChar(10)
  creditLimit   Int?
  status        String   @default("active") @db.VarChar(10)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

## M2–M10
Fields are listed in the F3 spec (section 3) and will be copied here, one table per resource, when each page is built. Shared rules above apply unchanged.

## Backend checklist
- [ ] Prisma models + migration + seed (the sample rows from `master_data_req.md`)
- [ ] A generic CRUD controller/service/validator pattern parameterised by resource (the frontend `createCrud` mirrors it)
- [ ] Admin-only middleware on `/api/master/*`
- [ ] Case-insensitive unique `code`, immutable on update
- [ ] `IN_USE` check on delete (and on future FK relations)
- [ ] Error middleware returns the codes above (`CODE_ALREADY_EXISTS`, `IN_USE`, `NOT_FOUND`, `FORBIDDEN`, `VALIDATION_ERROR` with `errors`)
- [ ] Turn off `VITE_USE_MOCK` and re-run the frontend test list in the F3 spec
