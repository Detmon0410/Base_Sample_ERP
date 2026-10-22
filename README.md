# Refrigerator Factory

A simplified factory system: make the QT, confirm it into a production order with its processes, record the progress, keep the material stock, buy the materials that run low (purchase orders), issue an invoice and a receipt. Node.js + Express + Prisma + MySQL and React (Vite). JavaScript only. Languages: English and Japanese. Currency: JPY only, no tax.

This is branch `mini-erp`. The big system (sale, factory, stock, purchase, accounting, serial numbers, 33 pages) is on branch `jay`.

## What is in Version 2.0

| Part | What it does |
|---|---|
| **Roles by department** | A Worker is a Sale Worker (`Sales`) or a Factory Worker (`Factory`); the department decides the access and the menu. Admin does everything |
| **QT 2.0** | A QT has lines, is printed as a form, keeps the customer's PO (number, date, file); **Confirm QT makes the production order** |
| **Purchase** | Suppliers and their items, one Purchase page (materials that are low or out), purchase orders Draft, Sent, Received (stock added once), payment, PDF |
| **Files** | PDF, PNG or JPG (up to 10 MB) kept with a QT, a production order or a purchase order; an image or a PDF opens in a large window |
| **Easier to use** | A job is finished on one page (Sales, Accounting), Today's work for the Factory Worker, shorter menu, lighter forms and tables ([docs/Usability Plan.md](docs/Usability%20Plan.md)); invoice and receipt print straight from the lists |
| **Documents** | Eight diagram documents (PDF and DOCX) in [docs/ProjectdocInfo](docs/ProjectdocInfo/), checked against the system |

## Where the project is

| Part | State |
|---|---|
| Source of the requirements | [docs/BaseRequirement_md/simplified_factory_system_requirements.md](docs/BaseRequirement_md/simplified_factory_system_requirements.md), then [User Version 2.0](docs/User%20Version%202.0.md), [QT Upgrade 2.0](docs/QT%20Upgrade%202.0.md) and [Purchase Logic Draft2](docs/Purchase%20Logic%20Draft2.md); how they were built: [docs/Version 2.0 Plan.md](docs/Version%202.0%20Plan.md) |
| Backend | built: Express API with the Service layer and Prisma/MySQL (23 tables), answering the contract in [docs/api](docs/api/README.md); integration tests with the Node test runner |
| Frontend | built on that API: sign-in, the menu in the header, the Dashboard ("Today" for a Factory Worker), Sales (one page for a job), production orders with progress, Purchase, Accounting (one work list), Stock, Master data (customers, products, suppliers, users). English and Japanese. Tests: vitest |

## Demo accounts

Created by the seed (`backend`, `pnpm run db:setup`). Change the passwords before any real use.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@gmail.com` | `admin` |
| Sale Worker | `sale@gmail.com` | `sale` |
| Factory Worker | `worker@gmail.com` | `worker` |

## Workflow

1. **Master data** (Admin): customers, products with a BOM, materials with lots, users. A user is an Admin, a Sale Worker or a Factory Worker (a Worker has the department `Sales` or `Factory`, and the department decides the access: [docs/api/auth.md](docs/api/auth.md#access-by-role-and-department)).
2. **QT** (Admin or Sale Worker): the quotation, with its lines (product, quantity, price), is made in the system and printed as a form. The customer's PO (number, date, file) is kept with it. Status Draft, then Confirmed.
3. **Confirm QT** makes the **production order** (status Draft) from the lines of the QT, with their prices; the QT is then locked. The Admin or a Factory Worker adds the manual, ordered list of processes for every line. Files (evidence) can be added to the order.
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
frontend/   React app (Vite, Tailwind v4, i18next, vitest)
scripts/    setup and dev scripts; scripts/docs builds the diagram documents (PDF, DOCX) from their Markdown
docs/       the API contract (docs/api), the plans and the three requirements of Version 2.0
docs/ProjectdocInfo/   the diagrams of the system as built (English): user flow, site map, ER, DB relations, context, APIs, flow chart, state and permission matrix
docs/BaseRequirement_md/   the requirements (only simplified_factory_system_requirements.md is for this system; the other files are of the big system on branch jay)
```

## Documents

The diagram documents are written in Markdown and built into PDF and DOCX by `scripts/docs` (see `scripts/docs/build.mjs`):

```bash
cd scripts/docs
pnpm install
node build.mjs "User Flow"      # any name in docs/ProjectdocInfo; writes the PDF and the DOCX next to it
```

## Backend commands

```bash
cd backend
pnpm run dev          # http://localhost:3001/api (nodemon, watches src)
pnpm run db:setup     # RESETS the database: schema, then the seed with the demo accounts
pnpm run db:seed:demo # optional demo records
pnpm run test         # integration tests against a separate database kanou_mini_erp_test
```

## Frontend commands

```bash
cd frontend
pnpm run dev          # http://localhost:5173 (the backend must run)
pnpm run test         # vitest
pnpm run lint
pnpm run build
```

## Run the full stack

```bash
pnpm run setup        # installs both, creates .env from .env.example, generates the Prisma client
pnpm run db:migrate   # after you fill DATABASE_URL in backend/.env
pnpm run kanou        # backend http://localhost:3001/api and frontend http://localhost:5173
```

Never commit real credentials: commit `.env.example`, not `.env`.
