import { prisma } from "../lib/prisma.js";
import { isAdmin } from "../lib/permissions.js";
import { orderStatus } from "./order.service.js";

export async function get(user) {
  const orders = await prisma.productionOrder.findMany({ include: { lines: { include: { processes: true } } } });
  const counts = { Draft: 0, InProgress: 0, Completed: 0 };
  for (const o of orders) counts[orderStatus(o).replace(" ", "")] += 1;

  let invoicing = null;
  if (isAdmin(user)) {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const [unpaid, paid] = await Promise.all([
      prisma.invoice.aggregate({ where: { status: "Unpaid" }, _count: true, _sum: { total: true } }),
      prisma.payment.aggregate({ where: { paymentDate: { gte: monthStart, lt: nextMonth } }, _count: true, _sum: { amount: true } })
    ]);
    invoicing = {
      unpaid: { count: unpaid._count, total: unpaid._sum.total ?? 0 },
      paidThisMonth: { count: paid._count, total: paid._sum.amount ?? 0 }
    };
  }
  return { orders: counts, invoicing };
}
