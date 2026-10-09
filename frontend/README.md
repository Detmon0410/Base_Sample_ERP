# Refrigerator Factory Frontend

React + Vite + Tailwind v4 + shadcn/ui (JavaScript, no TypeScript). It runs on a mock API until the backend exists. Project overview: [../README.md](../README.md). API contract: [../docs/api](../docs/api/README.md).

## Commands

```bash
pnpm run dev      # http://localhost:5173
pnpm run test     # vitest
pnpm run lint     # oxlint
pnpm run build
```

## Environment

| Variable | Meaning |
|---|---|
| `VITE_API_URL` | base URL of the real API (default `http://localhost:3000/api`) |
| `VITE_USE_MOCK` | `true` answers every call from `src/services/mock/`; `false` calls the real API |
| `VITE_MOCK_SEED` | `empty` = no business records, the work is kept in the browser (`.env.development`); leave out for the demo data |

## Structure

```text
src/
  components/
    ui/ reui/        shadcn and reui primitives (no business rules)
    common/          list, table, sheet, form and status parts shared by every module
    documents/       parts shared by the document sheets (lines, totals, status steps, actions)
    layout/          header, sidebar, menus
    sale/ factory/ stock/ purchase/ accounting/ admin/ auth/   parts of one module
  config/            navigation, permissions, status and action rules per module
  hooks/             shared hooks (auth, narrow / phone, row seen ...)
  i18n/locales/      en and ja, one file per namespace
  layouts/           MainLayout (shell) and AuthLayout
  pages/             route-level pages per module (list + sheet)
  routes/            the route table
  services/          one *.service.js per module; api.js is the Axios client
    mock/            the mock API: one file per module, its tests are the rules the real API must keep
  utils/             format, permissions, row seen, events
```

## Rules the code follows

- Every text goes through i18n, in English (`en`) and Japanese (`ja`, factory wording). `src/i18n/keysParity.test.js` checks that both files have the same keys and placeholders; in development a text missing in English is a console error.
- A status is always text + icon, never colour alone. Base text 18 px, controls about 48 px, visible focus, keyboard use.
- Layouts: desktop, tablet (768–992 px, the menu is a rail) and phone (below 768 px, lists are cards). See `docs/specs/f15-tablet.md` and `f16-mobile.md`.
- Plain look (thin borders, no shadows, nothing moves): `docs/specs/f14-plain-ui.md`.
- A page is documented in `docs/api` when its design is done, then built against the mock, then the backend.
