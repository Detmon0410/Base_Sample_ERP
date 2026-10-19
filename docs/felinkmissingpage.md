# Frontend link: what is linked, and what has no page yet

The frontend (`frontend/`) talks to the real backend (`backend/`, Node.js + Express + Prisma + MySQL) when `VITE_USE_MOCK=false` in `frontend/.env`. This note lists what is linked and which backend APIs have **no frontend page** (skipped on purpose). The contract is in [docs/api](api/README.md); the backend follows it, and the mock of the frontend (`frontend/src/services/mock`) is the reference for the details the documents do not spell out.

## How to run it linked

1. `cd backend && pnpm run db:setup` (creates the tables of `kanou_mini_erp` and the three demo users), then, for the demo data, `node prisma/seed-demo.js --fresh`.
2. `frontend/.env`: `VITE_API_URL=http://localhost:3000/api` and `VITE_USE_MOCK=false`.
3. `node scripts/dev.js` from the repository root (backend on `:3000`, frontend on `:5173`).

Users: `admin@gmail.com` / `admin`, `worker@gmail.com` / `worker` (Factory Worker), `sale@gmail.com` / `sale` (Sale Worker). The demo seed adds `hana@gmail.com`, `ken@gmail.com`, `mika@gmail.com` (password `demo123`).

## Linked (a frontend page calls a backend API)

Checked by opening every page below in a browser as Admin, Factory Worker and Sale Worker against the real backend and the demo data: no console error and no failed API call; a page a role may not use shows the 403 page.

| Frontend page | Backend API | Document |
|---|---|---|
| `/login`, session, logout | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` | [auth.md](api/auth.md) |
| `/` Today / Dashboard | `GET /dashboard`, and the lists of orders, QTs, invoices | [dashboard.md](api/dashboard.md) |
| `/sale/quotations` (list with the `step`, form, Confirm QT) | `/qt` (`step` field and filter), `POST /qt/:id/confirm` | [qt.md](api/qt.md) |
| `/sale/orders` (list, view, edit, start, progress) | `/orders`, `/orders/:id/start`, `/orders/:id/progress` | [orders.md](api/orders.md) |
| `/purchase/orders` (low stock, form, list, detail, status, payment) | `/purchase-orders`, `/purchase-orders/:id/status`, `/purchase-orders/:id/payment` | [purchase.md](api/purchase.md) |
| `/accounting` (work list: orders to invoice, unpaid, paid; document pages) | `/orders?status=Completed&invoiced=false`, `/invoices`, `/invoices/:id/payment`, `/receipts` | [invoices.md](api/invoices.md), [receipts.md](api/receipts.md) |
| `/stock/materials` (with the unit), `/stock/movements` (with the link to the PO) | `/materials`, `/materials/:id/stock-changes`, `/stock-changes` | [stock.md](api/stock.md) |
| `/master/customers`, `/master/products`, `/master/users` | `/customers`, `/products` (BOM), `/users` | [master-data.md](api/master-data.md) |
| `/master/suppliers` (items and the Active switch) | `/suppliers` (`itemCount` in the list, `materialId` and `active` filters) | [purchase.md](api/purchase.md) |
| Files block on a QT, an order and a purchase order (`Attachments`) | `/attachments` | [files.md](api/files.md) |

Two things on the backend side make the forms work:

* The forms send numbers as text (`"10"`, `"45000"`), as the mock accepts. The backend converts numeric text in the number fields (`*Id`, `quantity`, `unitPrice`, `price`, `completedQuantity`, `amount`, `minLevel`, `change`) before it validates (`backend/src/middlewares/coerce.middleware.js`). An empty value or letters are still rejected (`REQUIRED` / `INVALID`).
* A native `<select>` whose options come from the server lost its saved value (the product of a QT showed "Choose a product"). `NativeSelect` in `frontend/src/components/common/FormFields.jsx` now rebuilds the select when its options change, so the saved value is put back.

## Backend APIs with no frontend page (skipped)

None. Every endpoint of the backend has a frontend page after the merge, and the frontend has a text for every `IN_USE` kind the backend sends (`qt`, `order`, `product`, `supplier`, `purchaseOrder`, ...).

## Not linked on purpose

* `GET /health` (no page needs it).
* The old demo `User` model and routes of the first backend skeleton are gone from the API (`/users` is now the real, Admin-only master resource).
