// The request counters of the menu (docs/specs/f13-workflow-test.md): how many documents of each department wait for somebody
// of that department to do something. They are counted from the real documents (through the same list calls the pages use),
// never made up, and only what the signed-in user can act on is counted:
//   worker   something any user of the department can do (make, receive, post, confirm ...)
//   manager  something that needs a Manager of the department (approve, schedule, send, issue ...); a Manager sees both
// Shape of the answer: { generatedAt, groups: { <menu group>: { total, items: { <menu item>: count } } } }

const WORKER = "worker";
const MANAGER = "manager";

/** The department whose role decides what a user sees in a menu group. Stock is shared by Factory and Purchase. */
const GROUP_DEPARTMENTS = { sale: ["Sale"], factory: ["Factory"], stock: ["Factory", "Purchase"], purchase: ["Purchase"], accounting: ["Accounting"] };

/** What the user may act on in a group: "manager" (everything), "worker" (the worker part) or null (the group is not theirs). */
function levelOf(user, group) {
  if (user.memberships.some((membership) => membership.role === "Admin")) return MANAGER;
  const roles = user.memberships.filter((membership) => GROUP_DEPARTMENTS[group].includes(membership.department)).map((membership) => membership.role);
  if (roles.includes("Manager")) return MANAGER;
  return roles.includes("Worker") ? WORKER : null;
}

/**
 * `call(key, query)` runs a list route of the mock as the system and answers `{ items, meta }`.
 * Every rule is `[group, menu item, who can act, how many]`; a failing rule counts as 0 so one broken list never hides the rest.
 */
export function buildNotifications(user, call) {
  const rows = (key, query = { pageSize: 100 }) => {
    try {
      const result = call(key, query);
      const items = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
      return { items, meta: result?.meta ?? {}, counts: result?.meta?.statusCounts ?? {} };
    } catch {
      return { items: [], meta: {}, counts: {} };
    }
  };
  const safe = (fn) => {
    try {
      return fn();
    } catch {
      return 0;
    }
  };

  const orders = rows("GET /sale/orders");
  const deliveries = rows("GET /sale/deliveries");
  const workOrders = rows("GET /factory/work-orders");
  const transfers = rows("GET /factory/transfers");
  const adjustments = rows("GET /stock/adjustments");
  const board = rows("GET /purchase/stock-status");
  const purchaseOrders = rows("GET /purchase/orders");
  const receivable = rows("GET /purchase/orders", { receivable: 1, pageSize: 100 });
  const receipts = rows("GET /purchase/receipts");
  const invoices = rows("GET /accounting/invoices");
  const invoiceSources = rows("GET /accounting/invoices/sources");
  const bills = rows("GET /accounting/bills");
  const billSources = rows("GET /accounting/bills/sources");
  const moneyIn = rows("GET /accounting/receipts");
  const moneyOut = rows("GET /accounting/payments");
  const journal = rows("GET /accounting/journal");
  const waiting = rows("GET /factory/waiting-orders");

  const rules = [
    // Sale
    ["sale", "saleOrders", MANAGER, safe(() => orders.items.filter((order) => order.status === "draft" && order.approval === "requested").length)], // waiting for the confirmation of a Manager
    ["sale", "saleOrders", WORKER, safe(() => orders.counts.ready_to_deliver ?? 0)], // ready: a delivery note is to be made
    ["sale", "deliveryNotes", WORKER, safe(() => deliveries.counts.draft ?? 0)], // to confirm when the goods leave
    // Factory
    ["factory", "workOrders", WORKER, safe(() => (waiting.items.length || 0) + (workOrders.counts.scheduled ?? 0))], // order lines waiting for a work order, work orders to start
    ["factory", "workOrders", MANAGER, safe(() => (workOrders.counts.draft ?? 0) + workOrders.items.filter((wo) => wo.status === "in_process" && wo.progress.stepsDone === wo.progress.stepsTotal).length)], // to schedule, to finish
    ["factory", "fgTransfer", WORKER, safe(() => workOrders.items.filter((wo) => wo.status === "finished" && wo.progress.remainingToTransfer > 0).length)], // finished, not yet moved to the warehouse
    ["factory", "fgTransfer", MANAGER, safe(() => transfers.counts.draft ?? 0)], // transfers to post
    // Stock
    ["stock", "stockAdjustment", MANAGER, safe(() => adjustments.counts.pending ?? 0)],
    // Purchase
    ["purchase", "stockStatus", WORKER, safe(() => board.items.filter((row) => ["shortage", "near_shortage"].includes(row.status) && !(row.onOrder > 0)).length)], // short and not on order
    ["purchase", "purchaseOrders", WORKER, safe(() => purchaseOrders.counts.rejected ?? 0)], // to correct
    ["purchase", "purchaseOrders", MANAGER, safe(() => (purchaseOrders.counts.pending ?? 0) + (purchaseOrders.counts.approved ?? 0))], // to approve, to send
    ["purchase", "goodsReceipt", WORKER, safe(() => (receivable.meta.total ?? receivable.items.length) + (receipts.counts.draft ?? 0))], // goods to receive, receipts to post
    // Accounting
    ["accounting", "invoices", WORKER, safe(() => invoiceSources.items.length)], // delivered, not yet invoiced
    ["accounting", "invoices", MANAGER, safe(() => invoices.counts.draft ?? 0)], // to issue
    ["accounting", "bills", WORKER, safe(() => billSources.items.length)], // goods received, no bill yet
    ["accounting", "bills", MANAGER, safe(() => bills.counts.draft ?? 0)], // to approve
    ["accounting", "receipts", WORKER, safe(() => moneyIn.counts.draft ?? 0)], // to confirm
    ["accounting", "payments", MANAGER, safe(() => moneyOut.counts.draft ?? 0)], // to confirm
    ["accounting", "journal", MANAGER, safe(() => journal.counts.draft ?? 0)], // to post
  ];

  const groups = {};
  for (const [group, item, who, count] of rules) {
    const level = levelOf(user, group);
    if (!level || (who === MANAGER && level !== MANAGER)) continue;
    groups[group] ??= { total: 0, items: {} };
    groups[group].items[item] = (groups[group].items[item] ?? 0) + count;
    groups[group].total += count;
  }
  return { generatedAt: new Date().toISOString(), groups };
}
