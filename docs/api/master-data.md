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

## M9 Units of measure — `/master/uom`
Fields: `code` (≤ 20, unique, e.g. `pcs`), `name` (≤ 100), `status`. Sort fields: `code`, `name`, `status`. Search: `code`, `name`. Delete is blocked (`IN_USE`) while a product or material uses the unit.

## M6 Warehouses — `/master/warehouses`
Fields: `code`, `name`, `type` (required: `RAW_MATERIAL` | `FINISHED_GOODS`), `status`. Sort fields: `code`, `name`, `type`, `status`. Delete blocked while stock or documents refer to it.

## M7 Machines / lines — `/master/machines`
Fields: `code`, `name`, `capacityPerDay` (integer ≥ 0, optional, `null` when unknown), `capacityUnit` (≤ 20, e.g. `pcs`), `status`. Sort fields: `code`, `name`, `capacityPerDay`, `status`. Delete blocked while a product routing uses the machine.

## M8 Employees — `/master/employees`
Fields: `code`, `name`, `position` (≤ 50, free text), `status`. Search: `code`, `name`, `position`. Sort fields: `code`, `name`, `position`, `status`. A link to a user account is planned (not in the form yet).

Prisma sketch (all four follow the Customer pattern; `code` unique and compared case-insensitively):

```prisma
model Uom {
  id        Int      @id @default(autoincrement())
  code      String   @unique @db.VarChar(20)
  name      String   @db.VarChar(100)
  status    String   @default("active") @db.VarChar(10)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Warehouse {
  id        Int      @id @default(autoincrement())
  code      String   @unique @db.VarChar(20)
  name      String   @db.VarChar(100)
  type      String   @db.VarChar(20)   // RAW_MATERIAL | FINISHED_GOODS
  status    String   @default("active") @db.VarChar(10)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Machine {
  id             Int      @id @default(autoincrement())
  code           String   @unique @db.VarChar(20)
  name           String   @db.VarChar(100)
  capacityPerDay Int?
  capacityUnit   String?  @db.VarChar(20)
  status         String   @default("active") @db.VarChar(10)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model Employee {
  id        Int      @id @default(autoincrement())
  code      String   @unique @db.VarChar(20)
  name      String   @db.VarChar(100)
  position  String?  @db.VarChar(50)
  status    String   @default("active") @db.VarChar(10)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## M4 Materials — `/master/materials`
Fields: `code`, `name`, `uom` (required, the **code** of an active unit from `/master/uom`), `reorderPoint` (required, number ≥ 0, up to 3 decimals), `reorderQty` (optional, number > 0), `status`. **`onHand` is read-only**: it comes from Stock (sum of the stock balances) and is ignored if sent in POST / PUT. A material is in **shortage** when `onHand <= reorderPoint`. Sort fields: `code`, `name`, `uom`, `reorderPoint`, `status`. Delete is blocked (`IN_USE`) while a BOM, stock record or purchase order uses it; deleting an unused material also removes its supplier links. Validation codes: `REQUIRED`, `INVALID`.

## M2 Suppliers — `/master/suppliers`
Fields: `code`, `name`, `taxId`, `address`, `contactPerson`, `contactPhone`, `contactEmail`, `paymentTerms` (same list as Customers), `status`. Same rules as Customers without `creditLimit`. Sort fields: `code`, `name`, `paymentTerms`, `status`. Delete is blocked while purchase orders use it; deleting an unused supplier also removes its links.

## Supplier ↔ material links — `/master/supplier-materials`
One row says "this supplier sells this material at this price". The Supplier page (tab "Materials supplied") and the Material page (tab "Suppliers") edit the same rows, each change is saved at once.

| Method | Path | Notes |
|---|---|---|
| GET | `/master/supplier-materials?supplierId=` or `?materialId=` | all links of one supplier or one material (no paging); each item carries the names of both sides |
| POST | `/master/supplier-materials` | body `{ supplierId, materialId, priceJpy, leadTimeDays }`; `409 ALREADY_LINKED` when the pair exists |
| PUT | `/master/supplier-materials/:id` | body `{ priceJpy, leadTimeDays }` only (the pair cannot change; remove and add instead) |
| DELETE | `/master/supplier-materials/:id` | |

`priceJpy` = whole yen per unit of the material (≥ 0). `leadTimeDays` = whole days (≥ 0). Response item:

```json
{ "id": 1, "supplierId": 1, "materialId": 1, "priceJpy": 3800, "leadTimeDays": 14,
  "supplierCode": "S001", "supplierName": "CompCo", "materialCode": "COMP", "materialName": "Compressor", "uom": "pcs" }
```

```prisma
model Material {
  id           Int      @id @default(autoincrement())
  code         String   @unique @db.VarChar(20)
  name         String   @db.VarChar(100)
  uomId        Int
  uom          Uom      @relation(fields: [uomId], references: [id])   // the API exposes the unit code
  reorderPoint Decimal  @db.Decimal(12, 3)
  reorderQty   Decimal? @db.Decimal(12, 3)
  status       String   @default("active") @db.VarChar(10)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  suppliers    SupplierMaterial[]
}

model Supplier {
  id            Int      @id @default(autoincrement())
  code          String   @unique @db.VarChar(20)
  name          String   @db.VarChar(100)
  taxId         String?  @db.VarChar(14)
  address       String?  @db.VarChar(500)
  contactPerson String?  @db.VarChar(100)
  contactPhone  String?  @db.VarChar(30)
  contactEmail  String?  @db.VarChar(100)
  paymentTerms  String?  @db.VarChar(10)
  status        String   @default("active") @db.VarChar(10)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  materials     SupplierMaterial[]
}

model SupplierMaterial {
  id           Int      @id @default(autoincrement())
  supplierId   Int
  materialId   Int
  priceJpy     Int
  leadTimeDays Int
  supplier     Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  material     Material @relation(fields: [materialId], references: [id], onDelete: Cascade)
  @@unique([supplierId, materialId])
}
```

New error code: `ALREADY_LINKED` (409).

## M3 Products — `/master/products`
Fields: `code`, `name`, `uom` (required, **code** of an active unit), `sellingPrice` (whole yen ≥ 0, optional), `category` (free text ≤ 50, optional; the UI suggests values already used), `status`. Search: `code`, `name`, `category`. Sort fields: `code`, `name`, `uom`, `sellingPrice`, `status`. Delete is blocked (`IN_USE`) while an order, work order or stock record uses it; deleting an unused product also removes its BOM and routing.

## M5 Bill of materials — `/master/bom-lines`
One row = quantity of a material for **one unit** of a product. Edited on the product's "BOM" tab; read from the material side on the "Used in" tab. Each change is saved at once.

| Method | Path | Notes |
|---|---|---|
| GET | `/master/bom-lines?productId=` or `?materialId=` | no paging; items carry product and material names and the material's `uom` |
| POST | `/master/bom-lines` | `{ productId, materialId, qty }`; `qty` > 0, up to 3 decimals; `409 ALREADY_LINKED` if the material is already in this product's BOM |
| PUT | `/master/bom-lines/:id` | `{ qty }` only |
| DELETE | `/master/bom-lines/:id` | |

```json
{ "id": 3, "productId": 1, "materialId": 3, "qty": 3.5,
  "productCode": "RF-2D", "productName": "Refrigerator 2-Door 15Q",
  "materialCode": "FOAM", "materialName": "Insulation foam", "uom": "kg" }
```

## Routing — `/master/routing-steps`
The ordered production steps of a product (tab "Routing"). `stepNo` is set by the server: new steps go to the end, removing a step renumbers the later ones (always 1, 2, 3 …).

| Method | Path | Notes |
|---|---|---|
| GET | `/master/routing-steps?productId=` | ordered by `stepNo`; items carry `machineCode` / `machineName` (`null` when no machine) |
| POST | `/master/routing-steps` | `{ productId, processName, machineId }`; `processName` required ≤ 100; `machineId` optional (`null`) |
| PUT | `/master/routing-steps/:id` | `{ processName, machineId }` |
| POST | `/master/routing-steps/:id/move` | `{ direction: "up" \| "down" }`; swaps `stepNo` with the neighbour; 400 at the ends |
| DELETE | `/master/routing-steps/:id` | renumbers the later steps |

A machine used by a routing step cannot be deleted (`IN_USE` on `DELETE /master/machines/:id`).

```prisma
model Product {
  id           Int      @id @default(autoincrement())
  code         String   @unique @db.VarChar(20)
  name         String   @db.VarChar(100)
  uomId        Int
  uom          Uom      @relation(fields: [uomId], references: [id])   // the API exposes the unit code
  sellingPrice Int?
  category     String?  @db.VarChar(50)
  status       String   @default("active") @db.VarChar(10)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  bom          BomLine[]
  routing      RoutingStep[]
}

model BomLine {
  id         Int      @id @default(autoincrement())
  productId  Int
  materialId Int
  qty        Decimal  @db.Decimal(12, 3)
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  material   Material @relation(fields: [materialId], references: [id])
  @@unique([productId, materialId])
}

model RoutingStep {
  id          Int      @id @default(autoincrement())
  productId   Int
  stepNo      Int
  processName String   @db.VarChar(100)
  machineId   Int?
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  machine     Machine? @relation(fields: [machineId], references: [id])
  @@unique([productId, stepNo])
}
```

Note for the backend: renumbering and `move` must run in one transaction (the unique `[productId, stepNo]` forbids two steps with the same number, so swap through a temporary value).

## M10

Price lists: fields are in the F3 spec (section 3) and will be copied here when the page is built. Shared rules above apply unchanged.

## Backend checklist
- [ ] Prisma models + migration + seed (the sample rows from `master_data_req.md`)
- [ ] A generic CRUD controller/service/validator pattern parameterised by resource (the frontend `createCrud` mirrors it)
- [ ] Admin-only middleware on `/api/master/*`
- [ ] Case-insensitive unique `code`, immutable on update
- [ ] `IN_USE` check on delete (and on future FK relations)
- [ ] Error middleware returns the codes above (`CODE_ALREADY_EXISTS`, `IN_USE`, `NOT_FOUND`, `FORBIDDEN`, `VALIDATION_ERROR` with `errors`)
- [ ] Turn off `VITE_USE_MOCK` and re-run the frontend test list in the F3 spec
