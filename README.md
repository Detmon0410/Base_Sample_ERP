# kanou_base_demo

Reusable full-stack starter: Node.js + Express + Prisma + MySQL + React (Vite). JavaScript only, no TypeScript.

This is a pnpm workspace containing `backend/` and `frontend/`.

## Structure

```text
backend/   Express API (MVC + Service layer, Prisma/MySQL)
frontend/  React app (Vite + Axios)
```

## Setup

```bash
pnpm run setup
```

This installs dependencies for both `backend/` and `frontend/`, creates `.env` from `.env.example` in each (if missing), and generates the Prisma client.

Then fill in `backend/.env` with your real `DATABASE_URL` and run the initial migration:

```bash
pnpm run db:migrate
```

## Run

```bash
pnpm run kanou
```

Runs backend and frontend together:

- Backend: http://localhost:3000 (API base: http://localhost:3000/api)
- Frontend: http://localhost:5173

## Other scripts

```bash
pnpm run db:migrate   # run Prisma migrations
pnpm run db:studio    # open Prisma Studio (http://localhost:5555)
pnpm run seed:demo    # export six months of mock ERP examples to seed/demo.json
```

## Environment

The frontend uses the local mock API when `VITE_USE_MOCK=true`. Run `pnpm run seed:demo` to create `seed/demo.json` with 10 examples per month for each operational department and Sale document type across the previous six complete months. The file also includes the current Sale mock records under `existing`. This export is for inspection or later import; the frontend does not read it automatically. It does not write to MySQL, whose schema currently contains only `User`.

Never commit real credentials — commit `.env.example`, not `.env`.

## API

```text
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```
