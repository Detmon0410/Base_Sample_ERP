import { describe, expect, it } from "vitest";

import { censor, HIDDEN } from "./censor";

// What the pages made from the .md files never show, and what they keep.

describe("censor", () => {
  it.each([
    ["users `admin@gmail.com` / `admin`, `worker@gmail.com` / `worker`", `users ${HIDDEN}, ${HIDDEN}`],
    ["The development database `kanou_mini_erp` still has to be created", `The development database \`${HIDDEN}\` still has to be created`],
    ["a separate database, `kanou_mini_erp_test` (made from `DATABASE_URL` with `_test` added", `a separate database, \`${HIDDEN}\` (made from \`${HIDDEN}\` with \`_test\` added`],
    ["Base URL `http://localhost:3000/api`.", `Base URL \`${HIDDEN}\`.`],
    ["Frontend<br/>React :5173", `Frontend<br/>React ${HIDDEN}`],
    ["Every route except `/health` and `POST /auth/login` needs `Authorization: Bearer <token>`.", `Every route except \`${HIDDEN}\` and \`${HIDDEN}\` needs \`${HIDDEN}\`.`],
    ["Start production (`POST /orders/:id/start`)", `Start production (\`${HIDDEN}\`)`],
    ["Order_Draft --> Order_Started: POST start (deducts stock)", `Order_Draft --> Order_Started: ${HIDDEN} (deducts stock)`],
    ["GET /orders, GET /orders/:id", `${HIDDEN}, ${HIDDEN}`],
    ["/suppliers  GET POST PUT DELETE (items, active)", `${HIDDEN}  GET POST PUT DELETE (items, active)`],
    ["GET /attachments?ownerType&ownerId", HIDDEN],
    ["services/*.service.js<br/>validation + rules", `${HIDDEN}<br/>validation + rules`],
    ["uploads/<br/>attachment files", `${HIDDEN}<br/>attachment files`],
    ["error.middleware<br/>envelope + codes", `${HIDDEN}<br/>envelope + codes`],
    ["`cd backend && pnpm test` runs integration tests", `\`${HIDDEN}\` runs integration tests`],
    ["The schema is pushed by `test-support/setup-db.js` first.", `The schema is pushed by \`${HIDDEN}\` first.`],
    ["Summary of the backend API built in `backend/` (Node.js, Express, Prisma, MySQL).", `Summary of the backend API built in \`${HIDDEN}\` (Node.js, Express, Prisma, MySQL).`],
    // a path next to Japanese: only the path
    ["POST /qt/:id/confirm（1回のみ）", `${HIDDEN}（1回のみ）`],
    ["指示書を開く：`POST /orders/:id/start`（開始）", `指示書を開く：\`${HIDDEN}\`（開始）`],
  ])("hides %s", (text, shown) => {
    expect(censor(text)).toBe(shown);
  });

  it.each([
    "customer in use -> `409 IN_USE`",
    "Add / Deduct / Adjust a lot",
    "Sale Worker / Admin",
    "Open QT / PO / order",
    "Choose file: PDF, PNG or JPG, up to 10 MB",
    "Draft -> Sent -> Received",
    "Admin: master data<br/>customers, products + BOM,<br/>materials, suppliers + their items, users",
    "Customer -> QtReference -> ProductionOrder -> OrderLine",
    "`QT_REFERENCE.production_order_id` is unique: one QT creates one Factory Order.",
    "rule: `role = Worker` needs `department` in (`Sales`, `Factory`)",
    "Summary of the backend API built in (Node.js, Express, Prisma, MySQL).",
    "409 STOCK_SHORT if material short",
    "PurchaseOrder, QtReference or ProductionOrder",
  ])("keeps %s", (text) => {
    expect(censor(text)).toBe(text);
  });
});
