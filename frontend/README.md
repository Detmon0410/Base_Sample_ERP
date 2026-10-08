# Klong ERP Frontend

React + Vite frontend for Klong ERP. The UI layer will use shadcn/ui instead of
Ant Design and will remain JavaScript-based for the current project.

## Recommended structure

```text
src/
├── app/
│   ├── App.jsx                 # Application root
│   └── router.jsx              # Public/protected route definitions
├── assets/                     # Project images and fonts only
├── components/
│   ├── ui/                     # shadcn-generated primitives
│   └── shared/                 # Reusable ERP components
├── features/
│   ├── auth/                   # Login form, auth API, schema, session logic
│   ├── dashboard/
│   └── master-data/            # Users, roles and future master data modules
├── hooks/                      # Cross-feature hooks only
├── layouts/
│   ├── AuthLayout.jsx
│   └── AppLayout.jsx
├── lib/
│   └── utils.js                # shadcn cn() helper and shared utilities
├── pages/                      # Route-level page composition
├── services/
│   └── api.js                  # Shared Axios client
├── styles/
│   └── globals.css             # Tailwind theme and global tokens
└── main.jsx
```

Only create a directory when its first real module is implemented. This avoids
empty scaffolding and keeps ownership clear.

## Boundaries

- `components/ui` contains shadcn primitives and no ERP business rules.
- Feature-specific components, hooks, validation and API calls stay together in
  `features/<feature>`.
- `pages` compose features for a route; they should not own reusable logic.
- `services/api.js` owns the API base URL and later the authentication interceptors.
- Shared components are promoted to `components/shared` only after they are used
  by more than one feature.

## First implementation: Login

1. Initialize Tailwind CSS and shadcn/ui with JavaScript mode (`tsx: false`).
2. Add only the required shadcn components: Button, Card, Input, Label and Form.
3. Create `/login` in `app/router.jsx` using `AuthLayout`.
4. Build the login feature with React Hook Form and Zod validation.
5. Add an auth service and session provider; connect the real API afterward.
6. Protect application routes and redirect signed-in users away from `/login`.

## Planned UI dependencies

- shadcn/ui + Tailwind CSS v4
- React Router
- React Hook Form + Zod
- Lucide React
- TanStack Query when server-state screens begin
- TanStack Table when data grids are implemented

Install libraries when the feature that needs them is started, rather than adding
the full stack up front.
