# API — QT references

Page: `/sale/quotations` · Frontend: `frontend/src/pages/qt`, `services/qt.service.js` · Mock: `services/mock/qt.js`
Conventions: [README.md](README.md) · The five calls of a resource: [master-data.md](master-data.md) · Admin and Sale Worker (a Factory Worker: `403 FORBIDDEN`)

The quotation is made outside the system; only its reference is kept.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/qt` | query `q` (QT number, notes, customer name), `page`, `pageSize`. Rows carry `customerName` and `file: { name, type }` (or `null`) **without the file data** |
| `GET` | `/qt/:id` | the record with `file: { name, type, dataUrl }` |
| `POST` | `/qt` | `201`, the record |
| `PUT` | `/qt/:id` | the record |
| `DELETE` | `/qt/:id` | `200`, `data: null`; `409 IN_USE` when a production order uses the QT reference (`errors`: see [master-data.md](master-data.md#delete-and-409-in_use)); the file goes with it |

Body of `POST` / `PUT`:

```json
{ "qtNumber": "QT-001", "qtDate": "2026-10-01", "customerId": 3, "notes": "", "file": { "name": "qt-001.pdf", "dataUrl": "data:application/pdf;base64,..." } }
```

| Field | Rules |
|---|---|
| `qtNumber` | Required, unique (typed by the user; it comes from Sales) |
| `qtDate` | Required, a real date `YYYY-MM-DD` |
| `customerId` | Required, an existing customer |
| `file` | **Optional** (the requirements ask to attach the file Sales sends, 5.1, but the user chose not to force it): `null` or missing means no file. When sent: PDF, PNG or JPG, up to 10 MB. The mock keeps it as a data URL; a real backend should take a multipart upload and answer with a download URL instead |

Errors: `400 VALIDATION_ERROR` with codes `REQUIRED`, `INVALID_DATE`, `FILE_TYPE`, `FILE_TOO_BIG`; `409 DUPLICATE_VALUE` for a used `qtNumber`.

```text
QtReference(id, qt_number UNIQUE, qt_date, customer_id, notes, file_name, file_type, file_path)
```
