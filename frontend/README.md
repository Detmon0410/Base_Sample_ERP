# Refrigerator Factory — Frontend

React + Vite + Tailwind v4 (JavaScript, no TypeScript). It talks to the real API of `backend/`. Project overview: [../README.md](../README.md).

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
| `VITE_API_URL` | base URL of the real API (default `http://localhost:3001/api`) |

## Structure

```text
src/
  components/
    ui/          the small parts (button, input, table, alert, dialog ...)
    common/      parts shared by the pages (RecordList, RecordFormPage, FormFields, PageHeader, ConfirmDialog)
    layout/      the header with the menu
  config/        navigation (the menu and the routes)
  hooks/         useAuth, useLoad
  i18n/locales/  en and ja, one file per namespace
  layouts/       MainLayout (the frame) and AuthLayout (the sign-in)
  pages/         one folder per module: auth, dashboard, qt, orders, invoices, receipts, stock (materials, movements), master (customers, products), users, system
  routes/        the route table and its guards
  services/      one *.service.js per module; api.js is the Axios client
  utils/         format, dates, permissions, session, print, serverErrors
```

## Rules the code follows

- Every text goes through i18n, in English (`en`) and Japanese (`ja`). `src/i18n/keysParity.test.js` checks that both files have the same keys and placeholders; in development a text missing in English is a console error.
- Two roles: Admin and Worker (`src/utils/permissions.js`). The department is only a field of the user.
- No icons, no flags, no clock (S1, decisions 11–15). The look is S2.

## Notes on the pages

- `pnpm run test` runs vitest: the menu (`config/navigation.test.js`), the permission table, the formats, the shared dialogs and the English and Japanese texts. The API itself is tested in `backend/` (`pnpm test`).
- A list is `RecordList`; a record page is `RecordFormPage`: errors only after Save, the list opens after Save, no record has a status Active / Inactive (only orders and invoices have the steps of their workflow); an existing record has a Delete after a confirmation, and a record that is still used is refused with the places that use it.
- The menu is one row in the top bar (no sidebar). At the right of the bar the **name of the user** opens the user menu: e-mail, role, department, the language (EN | 日本語) and Log out (`components/layout/AppHeader.jsx`).
- The invoice and the receipt are saved as PDF files with `utils/pdf.js` (`html2canvas-pro` + `jsPDF`, loaded only on the click) and printed with `utils/print.js`.
