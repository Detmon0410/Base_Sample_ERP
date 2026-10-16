# Refrigerator Factory — Mini ERP

A simplified factory system: keep the QT references, make production orders with their processes, record the progress by hand, keep the material stock by hand, issue an invoice and a receipt. Node.js + Express + Prisma + MySQL and React (Vite). JavaScript only. Languages: English and Japanese. Currency: JPY only, no tax.

This is branch `mini-erp`. The big system (sale, factory, stock, purchase, accounting, serial numbers, 33 pages) is on branch `jay`.

## Where the project is

| Part | State |
|---|---|
| Source of the requirements | [docs/BaseRequirement_md/simplified_factory_system_requirements.md](docs/BaseRequirement_md/simplified_factory_system_requirements.md) |
| Frontend | built on the mock API: sign-in, two roles (Admin, Worker), the menu in the header, the Dashboard, QT references, production orders with progress, the Stock group (materials and stock changes, movements), the Accounting group (invoices with payment, receipts), customers, products, users. English and Japanese. Tests: vitest and Playwright (the acceptance case follows the 10 steps of the requirements) |
| Backend | only a sample (the `User` table). The API it has to answer is written in [docs/api](docs/api/README.md) |

## Workflow

1. **Master data** (Admin): customers, products with a BOM, materials with lots, users. A user is an Admin, a Sale Worker or a Factory Worker (a Worker has the department `Sales` or `Factory`, and the department decides the access: [docs/api/auth.md](docs/api/auth.md#access-by-role-and-department)).
2. **QT reference** (Admin or Sale Worker): the quotation is made outside the system; only its number, date, customer and an optional file are kept.
3. **Production order** (Admin or Sale Worker): from a QT, with product lines (quantity, agreed price) and a manual, ordered list of processes for every line.
4. **Start production** (Admin or Factory Worker): needs enough stock. It deducts the BOM of every line from the oldest lot first (`409 STOCK_SHORT` when a material is short) and locks the products and processes.
5. **Progress** (Factory Worker or Admin): every process goes Not Started, In Progress, Completed. The status of the order is computed: New, In Progress, Completed.
6. **Stock** (Admin or Factory Worker): adds, deducts or adjusts a lot by hand at any time; the history of every change is kept.
7. **Invoice** (Admin): only for a Completed order, one per order, a snapshot. It locks the progress of the order.
8. **Payment and receipt** (Admin): one full payment (date and amount equal to the total) makes the invoice Paid and issues one receipt.

Where this differs from `simplified_factory_system_requirements.md` (changes the user asked for): no payment method and no payment note, no stock overview page, the QT file is optional, and Start production deducts the stock. Follow `docs/api` for the contract.

## Structure

```text
backend/    Express API (MVC + Service layer, Prisma/MySQL)
frontend/   React app (Vite, Tailwind v4, i18next, vitest, Playwright)
docs/       the API contract (docs/api)
docs/BaseRequirement_md/   the requirements (only simplified_factory_system_requirements.md is for this Mini ERP; the other files are of the big system on branch jay)
```

## Run the frontend with the mock (no database)

```bash
cd frontend
pnpm install
pnpm run dev          # http://localhost:5173
```

`VITE_USE_MOCK=true` (in `frontend/.env.development`) answers every API call from `frontend/src/services/mock/`; what a person does is kept in the browser. The users: `admin@gmail.com` / `admin` (Admin) and `worker@gmail.com` / `worker` (Worker).

```bash
pnpm run test         # vitest
pnpm run lint
pnpm run build
pnpm run e2e          # Playwright (a browser is installed once: pnpm exec playwright install chromium)
```

## Run the full stack

```bash
pnpm run setup        # installs both, creates .env from .env.example, generates the Prisma client
pnpm run db:migrate   # after you fill DATABASE_URL in backend/.env
pnpm run kanou        # backend http://localhost:3000/api and frontend http://localhost:5173
```

Never commit real credentials: commit `.env.example`, not `.env`.
