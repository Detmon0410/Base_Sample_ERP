// The Summary page (docs/specs/s1-mini-erp-workflow.md, section 7): a few numbers, nothing more.
//   orders:          how many production orders are New / In Progress / Completed (every signed-in user)
//   unpaidInvoices:  how many invoices are Unpaid and their total (Admin only; null for a Worker)

import { invoices, orderStatus, orders } from "./orders.js";
import { userFromAuthorization } from "./users.js";

export const summaryRoutes = {
  "GET /summary": ({ authorization }) => {
    const user = userFromAuthorization(authorization);
    const count = (status) => orders.filter((order) => orderStatus(order) === status).length;
    const unpaid = invoices.filter((invoice) => invoice.status === "Unpaid");
    return {
      orders: { New: count("New"), InProgress: count("In Progress"), Completed: count("Completed") },
      unpaidInvoices: user.role === "Admin" ? { count: unpaid.length, total: unpaid.reduce((sum, invoice) => sum + invoice.total, 0) } : null,
    };
  },
};
