# Backend Connection Plan

How the frontend, now running on its **mock API**, is connected to the real **backend** (`backend/`: Node.js, Express, Prisma, MySQL) so that the whole system works on one database. This is a plan; nothing here has been changed yet.

**Progress (2026-10-19):** B0, B1, B3 (the user names) and B4 are done; B2 is covered by the end-to-end run on the real backend (below); B5 and B6 are written down and not done. The decisions D1 to D6 were answered: the database `kanou_mini_erp` (wiped and made again, three users only), the mock is kept, the files are in `backend/uploads`, one computer first.

Related: [docs/api](api/README.md) (the contract), [Test Report](Test%20Report.md) (what was already run against the real backend), [APIs Diagram](../ProjectdocInfo/APIs%20Diagram.md), [DB Relations](../ProjectdocInfo/DB%20Relations.md), [felinkmissingpage](felinkmissingpage.md) (the notes of the backend author).

## 1. Where we are

| Part | State |
|---|---|
| Backend | written and on `mini-erp` (merged from `mini-ohm`): auth, users, customers, products with BOM, materials with lots, stock changes, suppliers, purchase orders, QT, orders, invoices, receipts, files, dashboard. 153 backend tests pass |
| Frontend | complete on the mock. `frontend/.env` has `VITE_USE_MOCK=true`, so **no request leaves the browser** |
| Proof that they fit | the end-to-end specs (acceptance, purchase, negative, smoke, rawscan, master) were run once against the real backend on a scratch copy and scratch databases: they pass. The real project has not been started in this mode |
| What is not decided | which MySQL database, who owns the demo data, how the files are stored in use, how the system is started for a user |

The switch is one line: `VITE_USE_MOCK` in `frontend/.env` (`services/api.js` picks the mock adapter or the real address `VITE_API_URL`). Nothing in the pages changes.

## 2. Decisions to confirm first

| # | Question | Default |
|---|---|---|
| D1 | Which database? The old name in `backend/.env` is `kanou_sim`; the example says `kanou_mini_erp`; the notes of the backend author use `kanou_mini_erp` | `kanou_mini_erp`, a new database. `kanou_sim` is not touched |
| D2 | Is `db:setup` allowed to wipe that database? (`prisma migrate reset` deletes every table; the tool refuses it without the owner's explicit consent) | Only on the new empty `kanou_mini_erp`; asked in writing before it is run |
| D3 | Demo data: only the 3 users, or the demo set (`seed-demo.js`: customers, products, stock, orders) | 3 users for the real database; the demo set only on a database made for showing the system |
| D4 | Is the mock kept? | **Decided: yes.** `VITE_USE_MOCK=true` stays the default for tests, for a demo without a server and for the first run of a new developer |
| D5 | Where are the uploaded files kept in use? (`UPLOAD_DIR=uploads` on the disk of the server) | The folder `backend/uploads`, outside git, backed up with the database |
| D6 | Who runs it: one computer (the dev script) or a server | One computer first (phase B1 to B4); a server is phase B6 |

## 3. Phases

| Phase | Name | Size | Done when |
|---|---|---|---|
| **B0** | Prepare | small | the backend starts and answers `/api/health` on an empty database |
| **B1** | First connection | small | sign in as the three users and open the Dashboard on the real backend |
| **B2** | Page by page | medium | every page of every role works on the real backend, with no error in the console |
| **B3** | The differences between the mock and the backend | small | the list of section 5 is closed |
| **B4** | The tests run on both | medium | the same end-to-end specs pass on the mock **and** on the real backend, in one command each |
| **B5** | Data and files | small | a backup and a restore of the database and of the folder of files are written and tried once |
| **B6** | Running it for users | medium | start, stop, logs, the secret and the address of a server (decided in D6) |

### B0. Prepare

1. Install the dependencies (`pnpm install`; the backend needs `bcryptjs` and `jsonwebtoken`, already in the lock file).
2. MySQL is running on `localhost:3306`. Make the database `kanou_mini_erp` (a new, empty one: D1).
3. `backend/.env` (copy `backend/.env.example`; the file is not in git): `DATABASE_URL`, a new `JWT_SECRET` (a long random text, never `change-me`), `JWT_EXPIRES_IN`, `CORS_ORIGIN=http://localhost:5173`, `UPLOAD_DIR=uploads`, `PORT=3000`. A password with `@` or `$` must be URL-encoded.
4. The tables and the three users: `pnpm --dir backend run db:setup`. **This command resets the database first** (D2). On a database that already has data, use `prisma migrate deploy` and `node prisma/seed.js` instead; they do not delete.
5. Start the backend alone and check `GET http://localhost:3000/api/health`.

### B1. First connection

1. `frontend/.env`: `VITE_USE_MOCK=false`, `VITE_API_URL=http://localhost:3000/api`.
2. `node scripts/dev.js` from the root starts both (backend on 3000, frontend on 5173).
3. Sign in as `admin@gmail.com`, `worker@gmail.com` (Factory) and `sale@gmail.com` (Sales). The token is sent as `Authorization: Bearer`. A wrong password shows the text under the e-mail field; more than a few wrong tries answer `429` (the text exists in both languages).
4. Check: the Dashboard opens, the menu is the menu of the role, a page of another role opens the 403 page, Log out returns to the sign-in page, and an expired or wrong token returns to the sign-in page (the event `kanou:unauthorized`).

### B2. Page by page (the checklist of the link)

Each row: the page, the calls it makes, and what to look at. Done by hand once as the Admin, the Factory Worker and the Sale Worker, then by the end-to-end specs (B4).

| Page | Calls | Look at |
|---|---|---|
| `/` Dashboard (Admin, Sale) and the Dashboard with the work cards (Factory) | `GET /dashboard`, orders by status, materials, purchase orders (Sent) | the numbers equal the lists they open; the work cards show orders in production |
| `/sale/quotations` list and one QT | `/qt`, `POST /qt/:id/confirm`, `/attachments` | the `step` filter; the QT number is required and unique (`DUPLICATE_VALUE`); Confirm once; the production order appears on the same page |
| `/sale/orders`, one order | `/orders`, `PUT`, `POST /orders/:id/start`, `POST /orders/:id/progress` | a short stock (`STOCK_SHORT`) names the materials; progress rules; an invoiced order is locked |
| `/purchase/orders` | `/purchase-orders`, `POST …/status`, `POST …/payment`, `/suppliers` | Sent locks the PO; Received adds the stock once into the typed lot; the payment equals the total |
| `/accounting` | `/orders?status=Completed&invoiced=false`, `/invoices`, `POST …/payment`, `/receipts`, `/purchase-orders?status=Received&paid=` | the five tabs; the documents (PDF, print) of an invoice and a receipt |
| `/stock/materials`, `/stock/movements` | `/materials`, `/materials/:id/stock-changes`, `/stock-changes` | the lots, the status, the history, the filters by type and date |
| `/master/customers`, `products`, `suppliers`, `users` | the five calls of each | delete with `IN_USE` names where it is used; a Worker needs a department |
| Files on a QT, an order and a PO | `/attachments` | PDF, PNG, JPG up to 10 MB; a wrong type and a big file are refused; the PO file of a QT is copied to its order |

### B3. The differences between the mock and the backend

| # | Difference | What to do |
|---|---|---|
| 1 | The names of the demo users: the mock has "Worker" and "Sale", the backend seed has "Factory Worker" and "Sale Worker" | make the mock use the names of the seed (small change in `services/mock/users.js` and the tests that read the name) |
| 2 | Number fields arrive as text from the forms (`"10"`); the backend converts them before it checks (`coerce.middleware.js`) | keep; a test for an empty value and for letters (`REQUIRED`, `INVALID`) |
| 3 | The backend limits the tries of sign-in (`429 TOO_MANY_REQUESTS`) | done: the text exists; decide the limit and the time for use (a shared office would be blocked by one wrong user) |
| 4 | The mock answers instantly; the real calls take time | check the buttons that must not be pressed twice (Save, Confirm, Start, Pay: they are disabled while the call runs) and the loading texts |
| 5 | A list is cut at 200 rows (`pageSize` at most 200) | by design; a search or paging is needed before a company has more than 200 materials, products or open orders; the Dashboard and Accounting read whole lists |
| 6 | The mock keeps its data in the browser; the backend keeps it in MySQL | the "empty list shows New" state is the real first state; the end-to-end specs make codes of their own on a real backend |
| 7 | Dates: the mock and the forms use the local day (`YYYY-MM-DD`); the backend stores a day or a time | check the movement date filter, the "paid this month" number and the time zone of the server (Japan, `Asia/Tokyo`) |
| 8 | Files travel as base64 text in the JSON body (limit 15 MB) | fine for a small factory; a real file upload (multipart) is a later change if files become many or big |

### B4. The tests run on both

1. Keep `pnpm exec playwright test --project=desktop` on the mock (fast, no database).
2. Add a second configuration, `playwright.real.config.js` (committed, not the scratch one): the frontend with `VITE_USE_MOCK=false` against a backend that the run starts on a **new test database each time** (name `kanou_e2e_<time>`, never an existing one), with the three users. One command: `pnpm e2e:real`.
3. Both runs execute the same specs; a spec that needs the mock (`services/mock` imports) is marked. The helper `withoutRefusals` (already there) lets the specs ignore the 400, 403 and 409 that the tests cause on purpose.
4. The backend tests (`pnpm --dir backend test`) work on a `_test` database only. The script must use the glob `"test/*.test.js"` on Node 24 (it fails with the folder today).
5. After each run the test databases are dropped (the owner runs the drop, or a script asks first).

### B5. Data and files

* Backup: `mysqldump kanou_mini_erp` and a copy of `backend/uploads`, once a day, kept for 14 days.
* Restore: tried once on another database name before it is trusted.
* Before any change of the schema: a backup, then `prisma migrate dev`; never `migrate reset` on a database with data.
* The secret (`JWT_SECRET`), the database password and the real address are in `.env` only, never in git.

### B6. Running it for users (after D6)

| Item | Plan |
|---|---|
| Build | `pnpm --dir frontend build` makes static files; a web server (nginx or the backend itself) serves them and passes `/api` to the backend, so there is no CORS and one address |
| Backend | `node src/server.js` under a process manager (restarts, logs); `NODE_ENV=production`; `CORS_ORIGIN` set to the address of the site |
| Security | a long `JWT_SECRET`; HTTPS; passwords of the first three users changed (the demo passwords are public); the sign-in limit; the Admin account is not shared |
| Time and language | the server clock and time zone are Japan time; the texts are in the frontend (English and Japanese) |
| Monitoring | the log of the backend (`morgan` prints every call); a check of `/api/health` |

## 4. Order of work and effort

B0 and B1 are an hour. B2 is the longest (a walk of every page in three roles) and finds the differences of section 3. B3 and B4 turn what B2 finds into tests so it stays fixed. B5 and B6 are needed before real users.

## 5. Risks

| Risk | Reduced by |
|---|---|
| `db:setup` or `migrate reset` deletes a database with data | the new database `kanou_mini_erp` (D1); a written consent (D2); backups (B5) |
| A page works on the mock and fails on the backend (a field the mock accepts) | B2 by hand, then B4 on both; the contract is `docs/api` and the mock follows it |
| The backend branch and `mini-erp` change in two places | one branch (`mini-erp`) now holds both; changes of the backend are made here and tested with the frontend |
| The demo passwords are known | change them before users (B6) |
| The files grow the database or the disk | the folder `uploads` outside the database; a size limit of 10 MB per file; a later move to real storage |

## 6. First step when you say go

B0 and B1 with the answers to D1 to D3 (by default a new empty database `kanou_mini_erp` and three users); `frontend/.env` is changed only after the backend answers `/api/health`.
