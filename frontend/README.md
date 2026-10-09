# Refrigerator Factory — Frontend

React + Vite + Tailwind v4 (JavaScript, no TypeScript). It runs on a mock API until the backend exists. Project overview: [../README.md](../README.md). The plan: [../docs/specs](../docs/specs).

## Commands

```bash
pnpm run dev      # http://localhost:5173
pnpm run test     # vitest
pnpm run lint     # oxlint
pnpm run build
pnpm run e2e      # Playwright
```

## Environment

| Variable | Meaning |
|---|---|
| `VITE_API_URL` | base URL of the real API (default `http://localhost:3000/api`) |
| `VITE_USE_MOCK` | `true` answers every call from `src/services/mock/`; `false` calls the real API |

## Structure

```text
src/
  components/
    ui/          the small parts (button, input, table, badge, dialog ...)
    common/      parts shared by the pages
    layout/      the header with the menu
    auth/        the session of the user
  config/        navigation (the menu and the routes)
  hooks/         useAuth
  i18n/locales/  en and ja, one file per namespace
  layouts/       MainLayout (the frame) and AuthLayout (the sign-in)
  pages/         one folder per page
  routes/        the route table and its guards
  services/      one *.service.js per module; api.js is the Axios client
    mock/        the mock API (adapter, users, routes, the persistence log)
  utils/         format, dates, permissions, session
```

## Rules the code follows

- Every text goes through i18n, in English (`en`) and Japanese (`ja`). `src/i18n/keysParity.test.js` checks that both files have the same keys and placeholders; in development a text missing in English is a console error.
- Two roles: Admin and Worker (`src/utils/permissions.js`). The department is only a field of the user.
- No icons, no flags, no clock (S1, decisions 11–15). The look is S2.
