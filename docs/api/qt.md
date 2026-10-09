# API — QT references

Page: `/qt` · Frontend: `frontend/src/pages/qt`, `services/qt.service.js` · Mock: `services/mock/qt.js`
Conventions: [README.md](README.md) · The five calls of a resource: [master-data.md](master-data.md) · Admin only (others: `403 FORBIDDEN`)

The quotation is made outside the system; only its reference is kept.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/qt` | query `q` (QT number, notes, customer name), `status`, `page`, `pageSize`. Rows carry `customerName` and `file: { name, type }` **without the file data** |
| `GET` | `/qt/:id` | the record with `file: { name, type, dataUrl }` |
| `POST` | `/qt` | `201`, the record |
| `PUT` | `/qt/:id` | the record |
| `PATCH` | `/qt/:id/status` | `{ "status": "active" \| "inactive" }` |

Body of `POST` / `PUT`:

```json
{ "qtNumber": "QT-001", "qtDate": "2026-10-01", "customerId": 3, "notes": "", "file": { "name": "qt-001.pdf", "dataUrl": "data:application/pdf;base64,..." } }
```

| Field | Rules |
|---|---|
| `qtNumber` | Required, unique (typed by the user; it comes from Sales) |
| `qtDate` | Required, a real date `YYYY-MM-DD` |
| `customerId` | Required, an existing customer |
| `file` | Required: PDF, PNG or JPG, up to 10 MB. The mock keeps it as a data URL; a real backend should take a multipart upload and answer with a download URL instead |

Errors: `400 VALIDATION_ERROR` with codes `REQUIRED`, `INVALID_DATE`, `FILE_TYPE`, `FILE_TOO_BIG`; `409 DUPLICATE_VALUE` for a used `qtNumber`.

```text
QtReference(id, qt_number UNIQUE, qt_date, customer_id, notes, file_name, file_type, file_path, status)
```
