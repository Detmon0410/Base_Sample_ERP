# Klong ERP

ERP for a Japan-market manufacturer: Sale, Factory, Stock, Purchase, Accounting, Users, Serial numbers (S/N) and Traceability. Node.js + Express + Prisma + MySQL and React (Vite). JavaScript only, no TypeScript. Language: English first, Japanese keys are empty and fall back to English. Currency: JPY only.

This is a pnpm workspace with `backend/` and `frontend/`.

## Where the project is

| Part | State |
|---|---|
| Frontend | **Built** for all modules, running on a **mock API** (no backend needed). Desktop, tablet (768–992 px) and phone (below 768 px) layouts. |
| API contract | **Written** per module in [docs/api](docs/api/README.md); the mock answers every call and its tests are the acceptance tests for the real API. |
| Backend | **Only a sample** (the `User` table). The real API is the next job: start with [the guide for the backend developer](docs/api/README.md#for-the-person-who-writes-the-backend). |

## Structure

```text
backend/    Express API (MVC + Service layer, Prisma/MySQL)
frontend/   React app (Vite, Tailwind v4, shadcn/ui, i18next, vitest)
docs/
  api/              the API contract per module (start with README.md)
  specs/            the design of each round of work (f2 ... f16, d1, d2)
  pages-progress.md the page tracker and the change log
  frontend-plan.md  the original plan
BaseRequirement_md/ the requirements from the customer
```

## Run the frontend with the mock (no database)

```bash
cd frontend
pnpm install
pnpm run dev          # http://localhost:5173
```

`frontend/.env.development` decides what the mock starts with:

- `VITE_USE_MOCK=true` answers every API call from `frontend/src/services/mock/` (set to `false` to call the real API at `VITE_API_URL`).
- `VITE_MOCK_SEED=empty` starts with **no business records** (the workflow test); the work you do is kept in the browser. Remove the line for the demo data. The test users are in `frontend/src/services/mock/users.js`.

```bash
pnpm run test         # vitest (mock rules, pages, components)
pnpm run lint
pnpm run build
```

## Run the full stack

```bash
pnpm run setup        # installs both, creates .env from .env.example, generates the Prisma client
pnpm run db:migrate   # after you fill DATABASE_URL in backend/.env
pnpm run kanou        # backend http://localhost:3000/api and frontend http://localhost:5173
```

Other scripts: `pnpm run db:studio` opens Prisma Studio (http://localhost:5555).

Never commit real credentials — commit `.env.example`, not `.env`.

## Modules

| Menu | What it does |
|---|---|
| Sale | Quotations, customer POs, sale orders (Manager confirmation), delivery notes |
| Factory | Work orders, production tracking per step, finished goods transfer, S/N of each unit |
| Stock | Balances (on hand, reserved, available), movements, adjustments (Manager approval) |
| Purchase | Stock status board, purchase orders (manual approval by a Manager), goods receipts |
| Accounting | Invoices, receipts, supplier bills, payments, journal, accounting master |
| Traceability | Search an S/N and read the whole life of that unit |
| Master Data | Customers, suppliers, products (BOM, routing), materials, warehouses, machines, employees, units, price lists |
| Administration | Users with department + role, the permission matrix |

Departments are Sale, Factory, Purchase and Accounting; roles are Admin, Manager and Worker. The menu, the red request counters and the Dashboard follow the department and role of the signed-in user.

## Backend API today

```text
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

The contract of everything else is in [docs/api](docs/api/README.md).
