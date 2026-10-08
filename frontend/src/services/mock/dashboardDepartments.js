// The department panels of GET /dashboard (docs/specs/d2-dashboard-by-department.md, docs/api/dashboard.md).
// Everything is counted from the real documents through the same list routes the pages use (`call(key, query)` runs a list route
// as the system). Months are `YYYY-MM`, weeks are the date of their Monday.

const DAY = 86400000;
const isoDay = (date) => date.toISOString().slice(0, 10);

/** The last `count` months, oldest first, as `YYYY-MM`. */
function lastMonths(count, now = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index), 1));
    return date.toISOString().slice(0, 7);
  });
}

/** The Monday of the week of `day` (`YYYY-MM-DD`). */
function mondayOf(day) {
  const date = new Date(`${day}T00:00:00Z`);
  const back = (date.getUTCDay() + 6) % 7;
  return isoDay(new Date(date.getTime() - back * DAY));
}

/** The last `count` weeks, oldest first, as the date of their Monday. */
function lastWeeks(count, now = new Date()) {
  const monday = new Date(`${mondayOf(isoDay(now))}T00:00:00Z`).getTime();
  return Array.from({ length: count }, (_, index) => isoDay(new Date(monday - (count - 1 - index) * 7 * DAY)));
}

/** Which department panels this user may see: Admin all, others the departments they belong to ("Stock" is part of Purchase and Factory). */
export function visibleDepartments(user) {
  if (user.memberships.some((membership) => membership.role === "Admin")) return ["Sale", "Factory", "Purchase", "Accounting"];
  return [...new Set(user.memberships.map((membership) => membership.department).filter(Boolean))];
}

/**
 * `ctx.stockAlerts`: the short / near short materials (already computed for the dashboard); `ctx.kpis`: the KPI block.
 * A rule that fails counts as empty, so one broken list never hides the others.
 */
export function buildDepartments(user, call, ctx) {
  const rows = (key, query = { pageSize: 100 }) => {
    try {
      const result = call(key, query);
      return { items: Array.isArray(result?.data) ? result.data : [], counts: result?.meta?.statusCounts ?? {} };
    } catch {
      return { items: [], counts: {} };
    }
  };
  const today = isoDay(new Date());
  const months = lastMonths(6);
  const monthOf = (day) => (day ? String(day).slice(0, 7) : "");
  const sumBy = (items, dateOf, valueOf) => {
    const sums = Object.fromEntries(months.map((month) => [month, 0]));
    for (const item of items) {
      const month = monthOf(dateOf(item));
      if (month in sums) sums[month] += valueOf(item) ?? 0;
    }
    return months.map((month) => ({ month, value: sums[month] }));
  };

  const out = {};
  for (const department of visibleDepartments(user)) {
    if (department === "Sale") {
      const orders = rows("GET /sale/orders");
      const quotations = rows("GET /sale/quotations");
      const sent = quotations.items.filter((row) => row.status === "sent");
      const counted = orders.items.filter((order) => !["draft", "cancelled"].includes(order.status));
      const monthly = sumBy(counted, (order) => order.date, (order) => order.totals?.total);
      out.sale = {
        openOrders: ["confirmed", "in_production", "ready_to_deliver"].reduce((sum, status) => sum + (orders.counts[status] ?? 0), 0),
        readyToDeliver: orders.counts.ready_to_deliver ?? 0,
        quotationsWaiting: sent.length,
        oldestQuotationDays: sent.length ? Math.max(...sent.map((row) => Math.max(0, Math.round((new Date(today) - new Date(row.date)) / DAY)))) : 0,
        salesThisMonth: monthly[monthly.length - 1].value,
        monthlySales: monthly,
        orderStatus: Object.entries(orders.counts).map(([status, count]) => ({ status, count })).filter((row) => row.count > 0),
      };
    }

    if (department === "Factory") {
      const workOrders = rows("GET /factory/work-orders");
      const active = workOrders.items.filter((wo) => ["scheduled", "in_process"].includes(wo.status));
      const weeks = lastWeeks(6);
      const produced = Object.fromEntries(weeks.map((week) => [week, 0]));
      for (const wo of workOrders.items) {
        const last = wo.steps?.[wo.steps.length - 1];
        if (last?.status === "done" && last.endAt) {
          const week = mondayOf(last.endAt.slice(0, 10));
          if (week in produced) produced[week] += last.qtyDone ?? 0;
        }
      }
      out.factory = {
        inProcess: workOrders.counts.in_process ?? 0,
        scheduled: workOrders.counts.scheduled ?? 0,
        late: workOrders.items.filter((wo) => wo.progress?.late).length,
        toTransfer: workOrders.items.filter((wo) => wo.status === "finished" && wo.progress?.remainingToTransfer > 0).length,
        producedThisWeek: produced[weeks[weeks.length - 1]],
        weeklyProduced: weeks.map((week) => ({ week, value: produced[week] })),
        running: active
          .filter((wo) => wo.status === "in_process")
          .slice(0, 6)
          .map((wo) => ({ woId: wo.id, number: wo.number, product: wo.productCode, qty: wo.qty, stepsDone: wo.progress.stepsDone, stepsTotal: wo.progress.stepsTotal, planFinish: wo.planFinish, late: Boolean(wo.progress.late) })),
      };
    }

    if (department === "Purchase") {
      const orders = rows("GET /purchase/orders");
      const waiting = orders.items.filter((po) => ["sent", "partially_received"].includes(po.status));
      out.purchase = {
        shortage: ctx.kpis.materialsInShortage.count,
        nearShortage: ctx.kpis.materialsInShortage.nearShortage,
        poWaitingForGoods: waiting.length,
        nextDueDate: waiting.map((po) => po.expectedDate).filter(Boolean).sort()[0] ?? null,
        poToApprove: orders.counts.pending ?? 0,
        stockLevels: ctx.stockAlerts.map((alert) => ({ materialId: alert.materialId, code: alert.code, name: alert.name, uom: alert.uom, onHand: alert.qtyOnHand, reorderPoint: alert.reorderPoint, status: alert.status })),
      };
    }

    if (department === "Accounting") {
      const invoices = rows("GET /accounting/invoices");
      const bills = rows("GET /accounting/bills");
      const receipts = rows("GET /accounting/receipts").items.filter((row) => row.status === "confirmed");
      const payments = rows("GET /accounting/payments").items.filter((row) => row.status === "confirmed");
      const moneyIn = sumBy(receipts, (row) => row.date, (row) => row.amount);
      const moneyOut = sumBy(payments, (row) => row.date, (row) => row.amount);
      // what customers still owe, by how late: not yet due, up to 30 days late, 31-60, over 60
      const open = invoices.items.filter((doc) => ["issued", "partially_paid", "overdue"].includes(doc.status) && doc.balance > 0);
      const buckets = [
        { bucket: "notDue", amount: 0 },
        { bucket: "late30", amount: 0 },
        { bucket: "late60", amount: 0 },
        { bucket: "over60", amount: 0 },
      ];
      for (const doc of open) {
        const days = doc.overdueDays ?? 0;
        buckets[days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : 3].amount += doc.balance;
      }
      const soon = isoDay(new Date(Date.now() + 7 * DAY));
      const unpaid = bills.items.filter((doc) => ["approved", "partially_paid", "overdue", "issued"].includes(doc.status) && doc.balance > 0);
      out.accounting = {
        overdueCount: open.filter((doc) => (doc.overdueDays ?? 0) > 0).length,
        overdueAmount: open.filter((doc) => (doc.overdueDays ?? 0) > 0).reduce((sum, doc) => sum + doc.balance, 0),
        billsDueIn7Days: unpaid.filter((doc) => doc.dueDate && doc.dueDate <= soon).reduce((sum, doc) => sum + doc.balance, 0),
        receivedThisMonth: moneyIn[moneyIn.length - 1].value,
        cashFlow: months.map((month, index) => ({ month, in: moneyIn[index].value, out: moneyOut[index].value })),
        receivableAging: buckets,
      };
    }
  }
  return out;
}
