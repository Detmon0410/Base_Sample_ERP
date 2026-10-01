# Kanou Base Demo — Stack Requirements
## Pure Node.js + Express + Prisma + React (JavaScript)

## 1. Project Overview

`kanou_base_demo` is a reusable full-stack starter project for building business applications using:

- Node.js
- Express.js
- JavaScript (ES Modules)
- Prisma ORM
- MySQL
- React
- Vite
- REST APIs
- MVC-oriented backend architecture
- Service Layer
- Zod validation

The project intentionally does **not** use TypeScript.

The goal is to provide a clean JavaScript boilerplate that is easy to understand, debug, copy, and extend into larger business systems.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Backend | Express.js |
| Backend Language | JavaScript |
| Module System | ES Modules |
| ORM | Prisma |
| Database | MySQL |
| Database GUI | Prisma Studio |
| Frontend | React |
| Frontend Build Tool | Vite |
| Frontend Language | JavaScript / JSX |
| API Style | REST / JSON |
| Validation | Zod |
| HTTP Client | Axios |
| Environment Variables | dotenv |
| CORS | cors |
| Logging | Morgan |
| Development Runner | nodemon |
| API Testing | Postman / Bruno |
| Code Formatting | Prettier |
| Linting | ESLint |

---

# 3. Architecture

## Backend Request Flow

```text
React
  |
  | Axios
  v
REST API
  |
  v
Route
  |
  v
Controller
  |
  v
Service
  |
  v
Prisma
  |
  v
MySQL
```

## MVC + Service Layer

The backend uses MVC concepts with a Service Layer between Controllers and database access.

```text
Route
  |
  v
Controller
  |
  v
Service
  |
  v
Prisma
  |
  v
MySQL
```

### Responsibilities

### Route

Responsible for:

- HTTP endpoint definitions
- HTTP methods
- URL parameters
- Connecting middleware
- Calling controllers

Example:

```js
router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
router.post("/", userController.createUser);
```

Routes should remain small.

---

### Controller

Responsible for:

- Reading request data
- Calling services
- Returning HTTP responses
- Passing errors to the error middleware

Controllers should NOT contain complex business logic.

Example:

```js
export async function getUsers(req, res, next) {
  try {
    const users = await userService.getUsers();

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
}
```

---

### Service

Responsible for:

- Business logic
- Business rules
- Combining multiple database operations
- Transactions
- Calling Prisma

Example:

```js
export async function createUser(data) {
  return prisma.user.create({
    data
  });
}
```

---

### Prisma

Responsible for:

- Database access
- Queries
- Relations
- Transactions
- Migrations

---

# 4. Project Structure

```text
kanou_base_demo/
│
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   │
│   └── src/
│       ├── config/
│       │   └── env.js
│       │
│       ├── controllers/
│       │   └── user.controller.js
│       │
│       ├── services/
│       │   └── user.service.js
│       │
│       ├── repositories/
│       │   └── user.repository.js
│       │
│       ├── routes/
│       │   ├── index.js
│       │   └── user.routes.js
│       │
│       ├── middlewares/
│       │   ├── error.middleware.js
│       │   ├── validate.middleware.js
│       │   └── not-found.middleware.js
│       │
│       ├── validators/
│       │   └── user.validator.js
│       │
│       ├── lib/
│       │   └── prisma.js
│       │
│       ├── app.js
│       └── server.js
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── layouts/
│       ├── services/
│       │   ├── api.js
│       │   └── user.service.js
│       ├── hooks/
│       ├── utils/
│       ├── App.jsx
│       └── main.jsx
│
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

# 5. Backend Dependencies

## Runtime Dependencies

```bash
npm install express cors dotenv zod morgan @prisma/client
```

## Development Dependencies

```bash
npm install -D prisma nodemon eslint prettier
```

---

# 6. Frontend

Create the React application with Vite:

```bash
npm create vite@latest frontend -- --template react
```

Install Axios:

```bash
cd frontend
npm install axios
```

The frontend uses standard JavaScript and JSX.

No TypeScript configuration is required.

---

# 7. Package Configuration

The backend should use ES Modules.

Example `package.json`:

```json
{
  "name": "kanou-base-demo-backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "lint": "eslint .",
    "format": "prettier --write .",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  }
}
```

Using:

```json
"type": "module"
```

allows:

```js
import express from "express";
```

instead of:

```js
const express = require("express");
```

---

# 8. Prisma Setup

Initialize Prisma:

```bash
npx prisma init
```

Example `.env`:

```env
NODE_ENV=development

PORT=3000

DATABASE_URL="mysql://root:password@localhost:3306/kanou_base_demo"
```

Run migration:

```bash
npx prisma migrate dev
```

Generate Prisma Client:

```bash
npx prisma generate
```

Open Prisma Studio:

```bash
npx prisma studio
```

---

# 9. Example Prisma Schema

`backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

# 10. Prisma Client

`src/lib/prisma.js`

```js
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

Do not create a new Prisma Client for every request.

Use one shared Prisma Client instance.

---

# 11. Express Application

`src/app.js`

```js
import express from "express";
import cors from "cors";
import morgan from "morgan";

import routes from "./routes/index.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { notFoundMiddleware } from "./middlewares/not-found.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
```

---

# 12. Server

`src/server.js`

```js
import "dotenv/config";

import app from "./app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

# 13. Routes

`src/routes/index.js`

```js
import { Router } from "express";

import userRoutes from "./user.routes.js";

const router = Router();

router.use("/users", userRoutes);

export default router;
```

`src/routes/user.routes.js`

```js
import { Router } from "express";

import * as userController from "../controllers/user.controller.js";

const router = Router();

router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
router.post("/", userController.createUser);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

export default router;
```

---

# 14. Service

`src/services/user.service.js`

```js
import { prisma } from "../lib/prisma.js";

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: {
      id: "desc"
    }
  });
}

export async function getUserById(id) {
  return prisma.user.findUnique({
    where: {
      id
    }
  });
}

export async function createUser(data) {
  return prisma.user.create({
    data
  });
}

export async function updateUser(id, data) {
  return prisma.user.update({
    where: {
      id
    },
    data
  });
}

export async function deleteUser(id) {
  return prisma.user.delete({
    where: {
      id
    }
  });
}
```

---

# 15. Controller

`src/controllers/user.controller.js`

```js
import * as userService from "../services/user.service.js";

export async function getUsers(req, res, next) {
  try {
    const users = await userService.getUsers();

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req, res, next) {
  try {
    const id = Number(req.params.id);

    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: "USER_NOT_FOUND"
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.body);

    res.status(201).json({
      success: true,
      data: user,
      message: "User created successfully"
    });
  } catch (error) {
    next(error);
  }
}
```

---

# 16. Validation

Use Zod for request validation.

`src/validators/user.validator.js`

```js
import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});
```

Validation middleware:

```js
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues
      });
    }

    req.body = result.data;

    next();
  };
}
```

Route:

```js
router.post(
  "/",
  validate(createUserSchema),
  userController.createUser
);
```

---

# 17. Error Handling

Use centralized error middleware.

`src/middlewares/error.middleware.js`

```js
export function errorMiddleware(error, req, res, next) {
  console.error(error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: "INTERNAL_SERVER_ERROR"
  });
}
```

Not-found middleware:

```js
export function notFoundMiddleware(req, res) {
  res.status(404).json({
    success: false,
    message: "Route not found",
    error: "ROUTE_NOT_FOUND"
  });
}
```

---

# 18. API Structure

Base URL:

```text
/api
```

User API:

```text
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

---

# 19. API Request Example

```http
POST /api/users
Content-Type: application/json
```

```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

---

# 20. API Response Example

Success:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "message": "User created successfully"
}
```

Error:

```json
{
  "success": false,
  "message": "User not found",
  "error": "USER_NOT_FOUND"
}
```

---

# 21. HTTP Status Codes

| Status | Usage |
|---:|---|
| 200 | Successful GET / PUT |
| 201 | Successful POST |
| 204 | Successful DELETE with no response body |
| 400 | Invalid request |
| 401 | Authentication required |
| 403 | Forbidden |
| 404 | Resource not found |
| 409 | Conflict |
| 422 | Business rule / validation error |
| 500 | Internal server error |

---

# 22. Frontend Structure

```text
frontend/
└── src/
    ├── components/
    │   └── UserTable.jsx
    │
    ├── pages/
    │   └── UsersPage.jsx
    │
    ├── layouts/
    │   └── MainLayout.jsx
    │
    ├── services/
    │   ├── api.js
    │   └── user.service.js
    │
    ├── hooks/
    │   └── useUsers.js
    │
    ├── utils/
    │
    ├── App.jsx
    └── main.jsx
```

---

# 23. Frontend API Client

`frontend/src/services/api.js`

```js
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json"
  }
});
```

`.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

---

# 24. Frontend Service

`frontend/src/services/user.service.js`

```js
import { api } from "./api.js";

export async function getUsers() {
  const response = await api.get("/users");

  return response.data;
}

export async function getUserById(id) {
  const response = await api.get(`/users/${id}`);

  return response.data;
}

export async function createUser(data) {
  const response = await api.post("/users", data);

  return response.data;
}

export async function updateUser(id, data) {
  const response = await api.put(`/users/${id}`, data);

  return response.data;
}

export async function deleteUser(id) {
  const response = await api.delete(`/users/${id}`);

  return response.data;
}
```

React components should use these service functions rather than calling Axios directly.

---

# 25. Frontend Flow

```text
React Page
    |
    v
React Hook
    |
    v
Service
    |
    v
Axios
    |
    v
Express REST API
```

Example:

```text
UsersPage.jsx
      |
      v
useUsers.js
      |
      v
user.service.js
      |
      v
api.js
      |
      v
GET /api/users
```

---

# 26. Environment Variables

Backend:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL="mysql://root:password@localhost:3306/kanou_base_demo"
```

Frontend:

```env
VITE_API_URL=http://localhost:3000/api
```

Never commit real credentials.

Commit:

```text
.env.example
```

instead.

Example:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="mysql://root:password@localhost:3306/kanou_base_demo"
```

---

# 27. Development Ports

```text
Frontend
http://localhost:5173

Backend
http://localhost:3000

API
http://localhost:3000/api

Prisma Studio
http://localhost:5555
```

---

# 28. Repository Layer

For a simple project, the Repository layer is optional.

### Simple version

```text
Controller
    |
    v
Service
    |
    v
Prisma
    |
    v
MySQL
```

### Larger version

```text
Controller
    |
    v
Service
    |
    v
Repository
    |
    v
Prisma
    |
    v
MySQL
```

Use a Repository when database access becomes complex or when the application needs to isolate data-access logic.

Do not add the abstraction only for the sake of having more folders.

---

# 29. Design Principles

## Keep Controllers Thin

Avoid:

```text
Controller
  |
  +-- Validation
  +-- Business rules
  +-- Complex calculations
  +-- Multiple database queries
  +-- Transaction logic
```

Prefer:

```text
Controller
    |
    v
Service
    |
    v
Prisma
```

---

## Keep Business Logic Out of React

Avoid:

```text
React Component
    |
    +-- API request
    +-- Business rules
    +-- Database assumptions
    +-- Complex data transformation
```

Prefer:

```text
React
  |
  v
Service
  |
  v
REST API
  |
  v
Backend Service
```

---

## Keep JavaScript Simple

The project intentionally avoids TypeScript.

Use modern JavaScript features:

```js
const
let
async / await
import / export
optional chaining
nullish coalescing
destructuring
spread syntax
```

Use JSDoc when additional type/documentation information is useful:

```js
/**
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export async function getUserById(id) {
  return prisma.user.findUnique({
    where: { id }
  });
}
```

---

# 30. Recommended Initial Scope

The first version of `kanou_base_demo` should contain:

1. Node.js
2. Express
3. JavaScript
4. ES Modules
5. Prisma
6. MySQL
7. React
8. Vite
9. Axios
10. MVC-style backend
11. Service Layer
12. Zod validation
13. Centralized error handling
14. Example User CRUD
15. Prisma migrations
16. Prisma Studio
17. ESLint
18. Prettier
19. `.env.example`

Avoid adding the following until the base architecture is stable:

- Authentication
- Authorization / RBAC
- Redux
- WebSocket
- Message queues
- Microservices
- Docker
- Redis
- Complex state management

---

# 31. Future Modules

The base project should be able to grow into modules such as:

```text
Authentication
Users
Products
Orders
Inventory
Production
Planning
Notifications
Reports
File Management
Audit Logs
```

Possible architecture:

```text
                         React
                           |
                      REST API
                           |
                ┌──────────┴──────────┐
                |                     |
           Controller             Middleware
                |
             Service
                |
          Repository
                |
             Prisma
                |
              MySQL
```

For small modules:

```text
Controller
    |
Service
    |
Prisma
```

For complex modules:

```text
Controller
    |
Service
    |
Repository
    |
Prisma
```

---

# 32. Target

The goal of `kanou_base_demo` is to become a reusable JavaScript boilerplate.

```text
                    kanou_base_demo
                          |
             ┌────────────┴────────────┐
             |                         |
        Backend                     Frontend
             |                         |
     Express + Prisma             React + Vite
             |                         |
           MySQL                    Axios
             |                         |
             └──────── REST API ───────┘
                          |
                          v
                  New Application
```

A new project should be able to start from this base and then add:

```text
Database Models
      ↓
Services
      ↓
Controllers
      ↓
Routes
      ↓
React Pages
      ↓
React Components
```

The architecture should prioritize:

- Simple JavaScript
- Clear responsibility
- Easy debugging
- Minimal abstraction
- Reusable API patterns
- Prisma database management
- Easy frontend/backend separation
- Easy extension into larger business systems
