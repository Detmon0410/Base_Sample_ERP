import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { mockRoutes } from "../frontend/src/services/mock/routes.js";

const authorization = "Bearer mock-token-1";
const salePaths = {
  quotations: "/sale/quotations",
  customerPos: "/sale/customer-pos",
  orders: "/sale/orders",
  deliveries: "/sale/deliveries",
};

const departmentTypes = {
  Factory: { type: "workOrder", prefix: "WO" },
  Stock: { type: "movement", prefix: "SM" },
  Purchase: { type: "purchaseOrder", prefix: "PO" },
  Accounting: { type: "invoice", prefix: "INV" },
};

function previousMonths(now) {
  return Array.from({ length: 6 }, (_, index) => {
    const offset = 6 - index;
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  });
}

function recordsFor(prefix, type, department, months) {
  return months.flatMap((month) => Array.from({ length: 10 }, (_, index) => {
    const date = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 2 + index * 2)).toISOString().slice(0, 10);
    return {
      id: `${prefix}-${date.slice(0, 7).replace("-", "")}-${String(index + 1).padStart(2, "0")}`,
      department,
      type,
      date,
      status: ["draft", "in_progress", "completed"][index % 3],
      quantity: 5 + index * 2,
      amountJpy: ["Sale", "Purchase", "Accounting"].includes(department) ? (5 + index * 2) * 38500 : null,
      note: "Example record",
    };
  }));
}

function allRows(path) {
  const first = mockRoutes[`GET ${path}`]({ authorization, query: { page: 1, pageSize: 100 } });
  const rows = [...first.data];
  const pages = Math.ceil(first.meta.total / first.meta.pageSize);
  for (let page = 2; page <= pages; page += 1) {
    rows.push(...mockRoutes[`GET ${path}`]({ authorization, query: { page, pageSize: 100 } }).data);
  }
  return rows;
}

const months = previousMonths(new Date());
const seed = {
  generatedAt: new Date().toISOString(),
  sale: Object.fromEntries(Object.entries(salePaths).map(([name, path]) => [name, {
    existing: allRows(path),
    examples: recordsFor({ quotations: "QT", customerPos: "CPO", orders: "SO", deliveries: "DN" }[name], name, "Sale", months),
  }])),
  departments: Object.fromEntries(Object.entries(departmentTypes).map(([name, config]) => [
    name, recordsFor(config.prefix, config.type, name, months),
  ])),
};

const targetDir = join(import.meta.dirname, "..", "seed");
mkdirSync(targetDir, { recursive: true });
const target = join(targetDir, "demo.json");
writeFileSync(target, `${JSON.stringify(seed, null, 2)}\n`);
console.log(`Wrote ${target}`);
console.log(`Example months: ${months.map((month) => month.toISOString().slice(0, 7)).join(", ")}`);
console.log(Object.entries(seed.sale).map(([name, rows]) => `Sale ${name}=${rows.examples.length}`).join(", "));
console.log(Object.entries(seed.departments).map(([name, rows]) => `${name}=${rows.length}`).join(", "));
