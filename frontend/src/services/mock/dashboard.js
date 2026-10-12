// The Dashboard, the first page (docs/specs/s3-dashboard-crud-pdf.md, section 4). One call, the numbers of every block:
//
//   orders       how many production orders are New / InProgress / Completed (every signed-in user)
//   inProgress   the orders in progress, with their progress over all processes: { id, orderNumber, customerName, done, required, percent }
//   leastStock   the 5 materials with the lowest total quantity, with their stock status (null without a minimum level); every signed-in user
//   invoicing    Admin only (null for a Worker):
//                  unpaid { count, total }, paidThisMonth { count, total },
//                  months  the last 6 months, oldest first: { month: "YYYY-MM", invoiced, paid } (sums of money),
//                  unpaidList  the 5 unpaid invoices with the oldest date: { id, invoiceNumber, customerName, invoiceDate, total }

import { customers, materials } from "./master.js";
import { invoices, orderStatus, orders } from "./orders.js";
import { materialView } from "./stockStatus.js";
import { userFromAuthorization } from "./users.js";

const LISTED = 5;
const pad = (n) => String(n).padStart(2, "0");
const customerNameOf = (order) => customers.find((customer) => customer.id === order.customerId)?.name ?? "";
const monthOf = (date) => String(date).slice(0, 7); // "YYYY-MM" of "YYYY-MM-DD"

/** The last 6 months as "YYYY-MM", oldest first, the current one last. */
function lastMonths(now) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  });
}

function progressOf(order) {
  let done = 0;
  let required = 0;
  for (const line of order.lines) {
    for (const process of line.processes) {
      done += process.completedQuantity;
      required += line.quantity;
    }
  }
  return { done, required, percent: required > 0 ? Math.round((done / required) * 100) : 0 };
}

export const dashboardRoutes = {
  "GET /dashboard": ({ authorization }) => {
    const user = userFromAuthorization(authorization);
    const count = (status) => orders.filter((order) => orderStatus(order) === status).length;

    const inProgress = orders
      .filter((order) => orderStatus(order) === "In Progress")
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, LISTED)
      .map((order) => ({ id: order.id, orderNumber: order.orderNumber, customerName: customerNameOf(order), ...progressOf(order) }));

    const leastStock = materials
      .map((material) => ({ id: material.id, code: material.code, name: material.name, total: materialView(material).total, stockStatus: materialView(material).stockStatus }))
      .sort((a, b) => a.total - b.total || a.code.localeCompare(b.code))
      .slice(0, LISTED);

    let invoicing = null;
    if (user.role === "Admin") {
      const now = new Date();
      const thisMonth = lastMonths(now)[5];
      const unpaid = invoices.filter((invoice) => invoice.status === "Unpaid");
      const paidNow = invoices.filter((invoice) => invoice.payment && monthOf(invoice.payment.date) === thisMonth);
      invoicing = {
        unpaid: { count: unpaid.length, total: unpaid.reduce((sum, invoice) => sum + invoice.total, 0) },
        paidThisMonth: { count: paidNow.length, total: paidNow.reduce((sum, invoice) => sum + invoice.payment.amount, 0) },
        months: lastMonths(now).map((month) => ({
          month,
          invoiced: invoices.filter((invoice) => monthOf(invoice.invoiceDate) === month).reduce((sum, invoice) => sum + invoice.total, 0),
          paid: invoices.filter((invoice) => invoice.payment && monthOf(invoice.payment.date) === month).reduce((sum, invoice) => sum + invoice.payment.amount, 0),
        })),
        unpaidList: [...unpaid]
          .sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate) || a.id - b.id)
          .slice(0, LISTED)
          .map((invoice) => ({ id: invoice.id, invoiceNumber: invoice.invoiceNumber, customerName: invoice.customerName, invoiceDate: invoice.invoiceDate, total: invoice.total })),
      };
    }

    return {
      orders: { New: count("New"), InProgress: count("In Progress"), Completed: count("Completed") },
      inProgress,
      leastStock,
      invoicing,
    };
  },
};
