# Refrigerator Factory — Mini ERP

A simplified factory system: keep the QT references, make production orders with their processes, record the progress by hand, keep the material stock by hand, issue an invoice and a receipt. Node.js + Express + Prisma + MySQL and React (Vite). JavaScript only. Languages: English and Japanese. Currency: JPY only, no tax.

This is branch `mini-erp`. The big system (sale, factory, stock, purchase, accounting, serial numbers, 33 pages) is on branch `jay`.

## Where the project is

| Part | State |
|---|---|
| Plan | [docs/specs/s1-mini-erp-workflow.md](docs/specs/s1-mini-erp-workflow.md) (workflow, data, pages) and [docs/specs/s2-mini-erp-look.md](docs/specs/s2-mini-erp-look.md) (the look) |
| Source of the requirements | [BaseRequirement_md/simplified_factory_system_requirements.md](BaseRequirement_md/simplified_factory_system_requirements.md) |
| Frontend | built on the mock API (steps P0-P6): sign-in, two roles, the menu in the header, the Summary, QT references, production orders with progress, stock, invoices with payment and receipt, customers, products, users. English and Japanese. The acceptance test (P7) is next: see [docs/pages-progress.md](docs/pages-progress.md) |
| Backend | only a sample (the `User` table). The API it has to answer is written in [docs/api](docs/api/README.md) |

## Structure

```text
backend/    Express API (MVC + Service layer, Prisma/MySQL)
frontend/   React app (Vite, Tailwind v4, i18next, vitest, Playwright)
docs/       the specs, the progress of the steps and the API contract
BaseRequirement_md/   the requirements
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
