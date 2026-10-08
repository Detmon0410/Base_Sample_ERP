import { describe, expect, it } from "vitest";

import { buildDepartments, visibleDepartments } from "./dashboardDepartments.js";

const user = (...memberships) => ({ memberships });
const month = (back) => {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - back);
  return date.toISOString().slice(0, 7);
};

const lists = {
  "GET /sale/orders": () => ({
    data: [
      { status: "confirmed", date: `${month(0)}-02`, totals: { total: 1000 } },
      { status: "delivered", date: `${month(1)}-05`, totals: { total: 500 } },
      { status: "draft", date: `${month(0)}-03`, totals: { total: 9999 } },
    ],
    meta: { statusCounts: { confirmed: 1, delivered: 1, draft: 1, ready_to_deliver: 0 } },
  }),
  "GET /sale/quotations": () => ({ data: [{ status: "sent", date: "2026-01-01" }], meta: {} }),
  "GET /accounting/invoices": () => ({
    data: [
      { status: "issued", balance: 100, overdueDays: 0 },
      { status: "overdue", balance: 200, overdueDays: 10 },
      { status: "overdue", balance: 400, overdueDays: 90 },
      { status: "paid", balance: 0, overdueDays: 0 },
    ],
    meta: {},
  }),
  "GET /accounting/bills": () => ({ data: [], meta: {} }),
  "GET /accounting/receipts": () => ({ data: [{ status: "confirmed", date: `${month(0)}-04`, amount: 700 }, { status: "draft", date: `${month(0)}-04`, amount: 50 }], meta: {} }),
  "GET /accounting/payments": () => ({ data: [], meta: {} }),
};
const call = (key, query) => (lists[key] ? lists[key](query) : { data: [], meta: {} });
const ctx = { stockAlerts: [], kpis: { materialsInShortage: { count: 0, nearShortage: 0 } } };

describe("dashboard department panels", () => {
  it("gives a user the panels of their departments, an Admin all of them", () => {
    expect(visibleDepartments(user({ department: "Sale", role: "Worker" }, { department: "Accounting", role: "Manager" }))).toEqual(["Sale", "Accounting"]);
    expect(visibleDepartments(user({ department: null, role: "Admin" }))).toEqual(["Sale", "Factory", "Purchase", "Accounting"]);
    expect(Object.keys(buildDepartments(user({ department: "Sale", role: "Worker" }), call, ctx))).toEqual(["sale"]);
  });

  it("counts sales per month without drafts, and the status counts", () => {
    const { sale } = buildDepartments(user({ department: "Sale", role: "Worker" }), call, ctx);
    expect(sale.monthlySales).toHaveLength(6);
    expect(sale.monthlySales[5]).toEqual({ month: month(0), value: 1000 });
    expect(sale.monthlySales[4].value).toBe(500);
    expect(sale.salesThisMonth).toBe(1000);
    expect(sale.openOrders).toBe(1);
    expect(sale.quotationsWaiting).toBe(1);
    expect(sale.orderStatus).toEqual(expect.arrayContaining([{ status: "confirmed", count: 1 }]));
    expect(sale.orderStatus.some((row) => row.count === 0)).toBe(false);
  });

  it("ages what customers owe and sums the overdue ones", () => {
    const { accounting } = buildDepartments(user({ department: "Accounting", role: "Manager" }), call, ctx);
    expect(accounting.receivableAging.map((row) => row.amount)).toEqual([100, 200, 0, 400]);
    expect(accounting.overdueCount).toBe(2);
    expect(accounting.overdueAmount).toBe(600);
    expect(accounting.receivedThisMonth).toBe(700);
    expect(accounting.cashFlow[5]).toEqual({ month: month(0), in: 700, out: 0 });
  });

  it("answers an empty panel when a list fails", () => {
    const broken = () => {
      throw new Error("down");
    };
    const { factory } = buildDepartments(user({ department: "Factory", role: "Worker" }), broken, ctx);
    expect(factory.inProcess).toBe(0);
    expect(factory.running).toEqual([]);
  });
});
