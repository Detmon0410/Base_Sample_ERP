# kanou_base_demo

Reusable full-stack starter: Node.js + Express + Prisma + MySQL + React (Vite). JavaScript only, no TypeScript.

## Structure

```text
backend/   Express API (MVC + Service layer, Prisma/MySQL)
frontend/  React app (Vite + Axios)
```

## Backend

```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

Runs on http://localhost:3000, API base: http://localhost:3000/api

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173

## Environment

Copy `.env.example` to `.env` in both `backend/` and `frontend/` and fill in your own values (never commit real credentials).

## API

```text
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```
