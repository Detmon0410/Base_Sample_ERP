// The Dashboard, the first page. One call, the numbers of every block:
//
//   orders       how many production orders are Draft / InProgress / Completed (every signed-in user)
//   invoicing    Admin only (null for a Worker): unpaid { count, total }, paidThisMonth { count, total }

import { invoices, orderStatus, orders } from "./orders.js";
import { userFromAuthorization } from "./users.js";

const pad = (n) => String(n).padStart(2, "0");
const monthOf = (date) => String(date).slice(0, 7); // "YYYY-MM" of "YYYY-MM-DD"

export const dashboardRoutes = {
  "GET /dashboard": ({ authorization }) => {
    const user = userFromAuthorization(authorization);
    const count = (status) => orders.filter((order) => orderStatus(order) === status).length;

    let invoicing = null;
    if (user.role === "Admin") {
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
      const unpaid = invoices.filter((invoice) => invoice.status === "Unpaid");
      const paidNow = invoices.filter((invoice) => invoice.payment && monthOf(invoice.payment.date) === thisMonth);
      invoicing = {
        unpaid: { count: unpaid.length, total: unpaid.reduce((sum, invoice) => sum + invoice.total, 0) },
        paidThisMonth: { count: paidNow.length, total: paidNow.reduce((sum, invoice) => sum + invoice.payment.amount, 0) },
      };
    }

    return {
      orders: { Draft: count("Draft"), InProgress: count("In Progress"), Completed: count("Completed") },
      invoicing,
    };
  },
};
