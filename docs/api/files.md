# API - Files (attachments)

Where it is used: the **Evidence** section of a production order (`/sale/orders/:id`) · Frontend: `frontend/src/components/common/Attachments.jsx`, `services/attachments.service.js` · Mock: `services/mock/attachments.js`
Conventions: [README.md](README.md)

Files kept with a record. One feature serves every owner: the evidence of a production order now, and the customer's PO and the quotation of a QT ([qt.md](qt.md)) and the files of a purchase order later.

## The attachment

`{ id, ownerType, ownerId, kind, fileName, fileType, size, uploadedBy, uploadedByName, at }`

| Field | Notes |
|---|---|
| `ownerType` | `QtReference`, `ProductionOrder` (and `PurchaseOrder` when purchase orders exist) |
| `ownerId` | The id of the record that owns the file |
| `kind` | `PO_FILE`, `QUOTATION`, `EVIDENCE`, `OTHER` (below) |
| `fileName`, `fileType` | The name as uploaded; the media type is read from the file (`application/pdf`, `image/png`, `image/jpeg`) |
| `size` | Bytes |
| `uploadedBy`, `uploadedByName`, `at` | Who uploaded it and when (ISO 8601, UTC). Never changed |

### Kinds and owners

| `kind` | Meaning | Owners that may have it |
|---|---|---|
| `PO_FILE` | The customer's PO on a QT (or the PO file of a purchase order). **One per owner**: a new upload replaces the old one | `QtReference` |
| `QUOTATION` | A quotation file | `QtReference` |
| `EVIDENCE` | Images or documents that show the production | `ProductionOrder` |
| `OTHER` | Any other printable document | every owner |

A kind that the owner may not have answers `400 VALIDATION_ERROR` with `INVALID` on `kind`.

### The file

PDF, PNG or JPG, **up to 10 MB**. `FILE_TYPE` and `FILE_TOO_BIG` are the error codes ([master-data.md](master-data.md) lists their texts). The mock takes the content as a data URL; a real backend should take a multipart upload and answer a download address (the list never carries the content).

## Calls

| Method | Path | Notes |
|---|---|---|
| `GET` | `/attachments?ownerType=ProductionOrder&ownerId=12` | The files of one record, **newest first**, as a list in `data` (no paging) and **without the file content** |
| `GET` | `/attachments/:id` | One attachment with `file: { name, type, dataUrl }` (the content, or a download address) |
| `POST` | `/attachments` | `201`, the attachment (without the content). Body below |
| `DELETE` | `/attachments/:id` | `200`, `data: null` |

Body of `POST`:

```json
{ "ownerType": "ProductionOrder", "ownerId": 12, "kind": "EVIDENCE", "file": { "name": "weld-check.pdf", "dataUrl": "data:application/pdf;base64,..." } }
```

## Who may call

The rule depends on the **owner** of the file, so the check uses `ownerType` (for `/attachments/:id`, the owner of that file). It comes before the check that the record exists.

| Owner | Read (list, one file) | Upload and delete |
|---|---|---|
| `QtReference` | Admin, Sale Worker | Admin, Sale Worker |
| `ProductionOrder` | everybody signed in | Admin, Factory Worker |

Others answer `403 FORBIDDEN` ([auth.md](auth.md#access-by-role-and-department)).

## Errors

| HTTP | `error` | When |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | `errors` = `[{ "path": ["kind"], "code": "INVALID" }]`. Codes: `REQUIRED` (`ownerType`, `kind` or `file` missing), `INVALID` (`ownerType` or `kind` not allowed), `FILE_TYPE`, `FILE_TOO_BIG` |
| 401 | `UNAUTHORIZED` | No valid token |
| 403 | `FORBIDDEN` | The role or the department may not do this |
| 404 | `NOT_FOUND` | The owner or the file does not exist |

## Rules

- A file goes with its owner: when a QT is deleted, its files are deleted too (the service removes the stored file as well).
- A file is never changed. To replace it, upload a new one (a `PO_FILE` replaces the old one by itself) and delete the old one.
- The owner reference is not a database foreign key (it points to different tables); the service checks that the owner exists.

## Data needed

```text
Attachment(id, owner_type, owner_id, kind, file_name, file_type, size, file_path, uploaded_by -> User.id, at)
```

Index `(owner_type, owner_id)`. `file_path` is where the stored file is (disk or object storage).
