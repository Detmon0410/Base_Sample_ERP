# Refrigerator Factory — Mini ERP

A simplified factory system: make the QT, confirm it into a production order with its processes, record the progress by hand, keep the material stock by hand, issue an invoice and a receipt. Node.js + Express + Prisma + MySQL and React (Vite). JavaScript only. Languages: English and Japanese. Currency: JPY only, no tax.

This is branch `mini-erp`. The big system (sale, factory, stock, purchase, accounting, serial numbers, 33 pages) is on branch `jay`.

## Where the project is

| Part | State |
|---|---|
| Source of the requirements | [docs/BaseRequirement_md/simplified_factory_system_requirements.md](docs/BaseRequirement_md/simplified_factory_system_requirements.md) |
| Frontend | built on the mock API: sign-in, two roles (Admin, Worker), the menu in the header, the Dashboard (and "Today" for a Factory Worker), one page for a Sales job (QT, Confirm, the production order and its processes), production orders with progress, the Stock group (materials and stock changes, movements), one Accounting page (to invoice, waiting for payment, paid; the invoice and the receipt as documents), customers, products, users. See [docs/Usability Plan.md](docs/Usability%20Plan.md). English and Japanese. Tests: vitest and Playwright (the acceptance case follows the 10 steps of the requirements) |
| Backend | only a sample (the `User` table). The API it has to answer is written in [docs/api](docs/api/README.md) |

## Workflow

1. **Master data** (Admin): customers, products with a BOM, materials with lots, users. A user is an Admin, a Sale Worker or a Factory Worker (a Worker has the department `Sales` or `Factory`, and the department decides the access: [docs/api/auth.md](docs/api/auth.md#access-by-role-and-department)).
2. **QT** (Admin or Sale Worker): the quotation, with its lines (product, quantity, price), is made in the system and printed as a form. The customer's PO (number, date, file) is kept with it. Status Draft, then Confirmed.
3. **Confirm QT** makes the **production order** (status Draft) from the lines of the QT, with their prices; the QT is then locked. The Admin or a Sale Worker adds the manual, ordered list of processes for every line. Files (evidence) can be added to the order.
4. **Start production** (Admin or Factory Worker): needs enough stock. It deducts the BOM of every line from the oldest lot first (`409 STOCK_SHORT` when a material is short) and locks the products and processes.
5. **Progress** (Factory Worker or Admin): every process goes Not Started, In Progress, Completed. The status of the order is computed: Draft, In Progress, Completed.
6. **Stock** (Admin or Factory Worker): adds, deducts or adjusts a lot by hand at any time; the history of every change is kept.
7. **Purchase** (Admin or Factory Worker): the Purchase page shows the materials that are low or out; a purchase order (supplier, required date, department, the materials that supplier sells, prices that start from the supplier's) is made as a Draft, printed, and moved by hand Draft, Sent, Received. Received adds the stock once, into the lot typed for each line. The payment of the PO is recorded on it; files can be added. Suppliers (with the materials they sell and their prices, and an Active switch) are in Master data.
8. **Invoice** (Admin): only for a Completed order, one per order, a snapshot. It locks the progress of the order.
9. **Payment and receipt** (Admin): one full payment (date and amount equal to the total) makes the invoice Paid and issues one receipt.

Where this differs from `simplified_factory_system_requirements.md` (changes the user asked for): no payment method and no payment note, no stock overview page, the quotation is made in the system (QT 2.0) and Confirm QT makes the production order, the order status is called Draft (not New), and Start production deducts the stock. Follow `docs/api` for the contract.

## Structure

```text
backend/    Express API (MVC + Service layer, Prisma/MySQL)
frontend/   React app (Vite, Tailwind v4, i18next, vitest, Playwright)
docs/       the API contract (docs/api) and the plan of Version 2.0 (docs/Version 2.0 Plan.md)
ProjectdocInfo/   the diagrams of the system as built: context, flow chart, site map, user flow, ER, DB relations
docs/BaseRequirement_md/   the requirements (only simplified_factory_system_requirements.md is for this Mini ERP; the other files are of the big system on branch jay)
```

## Run the frontend with the mock (no database)

```bash
cd frontend
pnpm install
pnpm run dev          # http://localhost:5173
```

`VITE_USE_MOCK=true` (in `frontend/.env`) answers every API call from `frontend/src/services/mock/`; what a person does is kept in the browser. The users: `admin@gmail.com` / `admin` (Admin), `worker@gmail.com` / `worker` (Factory Worker) and `sale@gmail.com` / `sale` (Sale Worker).

```bash
pnpm run test         # vitest
pnpm run lint
pnpm run build
pnpm run e2e          # Playwright on the mock (a browser is installed once: pnpm exec playwright install chromium)
pnpm run e2e:real     # the same specs on the real backend (needs MySQL and backend/.env)
```

## Run the full stack (the real backend, MySQL)

1. MySQL is running. In `backend/.env` (copy `backend/.env.example`; the file is not in git) set `DATABASE_URL` (the database `kanou_mini_erp`), a long `JWT_SECRET`, `CORS_ORIGIN` (the address of the frontend, for example `http://localhost:5173`) and `UPLOAD_DIR=uploads` (the files are kept in `backend/uploads`, outside git).
2. `pnpm install` at the root, then `cd backend` and `pnpm run db:setup`: it **deletes every table of that database** and makes them again with the three users (`admin@gmail.com` / `admin`, `worker@gmail.com` / `worker` for a Factory Worker, `sale@gmail.com` / `sale` for a Sale Worker). Use it only on a database with nothing to keep; on a database with data use `npx prisma migrate deploy` and `node prisma/seed.js`.
3. In `frontend/.env`: `VITE_USE_MOCK=false` and `VITE_API_URL=http://localhost:3000/api`.
4. `pnpm run kanou` from the root starts the backend (`http://localhost:3000/api`) and the frontend (`http://localhost:5173`, or the next free port: add it to `CORS_ORIGIN`).

One address for the site and the API: `pnpm --dir frontend build` (it reads `frontend/.env.production`: the real backend at `/api`), then set `FRONTEND_DIR="../frontend/dist"` in `backend/.env` and start only the backend (`node src/server.js`): it serves the pages and `/api` on its port. (Do not pass `VITE_API_URL=/api` on the command line in Git Bash: it turns `/api` into a Windows path.) Backup and restore of the database and the files: `pnpm run backup` and `pnpm run restore` (see the plan).

Change the demo passwords before real users. The plan is in [docs/Backend Connection Plan.md](docs/Backend%20Connection%20Plan.md).

Tests on the real backend: `pnpm e2e:real` in `frontend/` (every spec file on a new database of its own, dropped after the run; the backend on port 3310 and the frontend on 5330). `pnpm --dir backend test` runs the backend tests on a database whose name ends with `_test` (on Node 24 use `node --test --test-concurrency=1 "test/*.test.js"`).

Never commit real credentials: commit `.env.example`, not `.env`.
