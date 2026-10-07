import { NAV_GROUPS } from "@/config/navigation";
import { documentActions, entryActions, isAccountingManager, moneyActions, canWork as canWorkAccounting } from "@/config/accounting";
import { canWork as canWorkFactory, stepAbilities, transferActions, workOrderActions } from "@/config/factory";
import { canEditOrder, canReceive, canWork as canWorkPurchase, purchaseOrderActions, receiptActions } from "@/config/purchase";
import { canWork as canWorkSale, deliveryActions, orderActions, quotationActions } from "@/config/sale";
import { adjustmentActions, canWork as canWorkStock } from "@/config/stock";
import { canApprove, canUse } from "@/utils/permissions";

// The U3 table "what each role can do" (docs/specs/f11-users.md). It has no data of its own: every cell asks the same
// rule that shows or hides the button in the application, with a sample user of the role and a sample document, so the
// table cannot disagree with the program (R7). A sample user is the *author* (id 1) of the draft documents and not the
// author of the others, so "approve somebody else's" and "work on your own" are both asked the way the program asks them.

export const ROLES = ["Admin", "Manager", "Worker"];
export const DEPARTMENTS = ["Sale", "Factory", "Purchase", "Accounting"];

const ADMIN = { id: 1, memberships: [{ department: null, role: "Admin" }] };
/** The sample user of a role: an Admin has no department, a Manager / Worker belongs to the department of the row. */
const sampleUser = (role, department) => (role === "Admin" ? ADMIN : { id: 1, memberships: [{ department, role }] });

const has = (list, key) => list.some((action) => action.key === key);
const changes = [{ status: "draft" }, { status: "next" }];
const own = { createdById: 1, createdBy: "Sample" };
const other = { createdById: 99, createdBy: "Somebody else" };

const wo = (status, extra = {}) => ({ status, history: changes, steps: [{ stepNo: 1, status: "done" }], ...extra });
const step = { stepNo: 1, status: "pending", canStart: true };
const runningStep = { stepNo: 1, status: "in_progress" };

/** The rows, by department; `key` is the text (users:matrix.<department>.<key>), `test(user)` is the real rule. */
export const MATRIX = [
  {
    department: "Sale",
    rows: [
      { key: "work", test: canWorkSale },
      { key: "sendQuotation", test: (u) => has(quotationActions({ status: "draft", history: [] }, u), "send") },
      { key: "acceptQuotation", test: (u) => has(quotationActions({ status: "sent", history: [] }, u), "accept") },
      { key: "requestConfirm", test: (u) => has(orderActions({ status: "draft", history: [] }, u), "request-confirm") },
      { key: "approveOrder", test: (u) => has(orderActions({ status: "draft", history: [] }, u), "approve") },
      { key: "sendToFactory", test: (u) => has(orderActions({ status: "confirmed", history: [] }, u), "send-to-factory") },
      { key: "cancelRunningOrder", test: (u) => has(orderActions({ status: "in_production", history: [] }, u), "cancel") },
      { key: "confirmDelivery", test: (u) => has(deliveryActions({ status: "draft" }, u), "confirm") },
      { key: "closeOrder", test: (u) => has(orderActions({ status: "delivered", history: [] }, u), "close") },
      { key: "revertOrder", test: (u) => has(orderActions({ status: "confirmed", history: changes }, u), "revert") },
    ],
  },
  {
    department: "Factory",
    rows: [
      { key: "work", test: canWorkFactory },
      { key: "schedule", test: (u) => has(workOrderActions(wo("draft"), u), "schedule") },
      { key: "start", test: (u) => has(workOrderActions(wo("scheduled"), u), "start") },
      { key: "startStep", test: (u) => stepAbilities(wo("scheduled", { steps: [step] }), step, u).start },
      { key: "doneStep", test: (u) => stepAbilities(wo("in_process", { steps: [runningStep] }), runningStep, u).done },
      { key: "reopenStep", test: (u) => stepAbilities(wo("in_process", { steps: [{ stepNo: 1, status: "done" }] }), { stepNo: 1, status: "done" }, u).reopen },
      { key: "finish", test: (u) => has(workOrderActions(wo("in_process"), u), "finish") },
      { key: "cancelRunning", test: (u) => has(workOrderActions(wo("in_process"), u), "cancel") },
      { key: "transfer", test: (u) => has(transferActions({ status: "draft" }, u), "transfer") },
      { key: "revertWorkOrder", test: (u) => has(workOrderActions(wo("scheduled"), u), "revert") },
    ],
  },
  {
    department: "Stock",
    sampleDepartment: "Factory",
    rows: [
      { key: "view", test: canWorkStock },
      { key: "createAdjustment", test: (u) => has(adjustmentActions({ ...own, status: "draft" }, u), "request") },
      { key: "approveAdjustment", test: (u) => has(adjustmentActions({ ...other, status: "pending" }, u), "approve") },
    ],
  },
  {
    department: "Purchase",
    rows: [
      { key: "work", test: canWorkPurchase },
      { key: "editOrder", test: (u) => canEditOrder({ ...own, status: "draft" }, u) },
      { key: "sendOrder", test: (u) => has(purchaseOrderActions({ ...own, status: "draft", receipts: [] }, u), "send") },
      { key: "receiveGoods", test: (u) => canReceive({ status: "sent" }, u) },
      { key: "postReceipt", test: (u) => has(receiptActions({ ...own, status: "draft" }, u), "post") },
      { key: "closeOrder", test: (u) => has(purchaseOrderActions({ ...own, status: "received", receipts: [] }, u), "close") },
      { key: "cancelPostedReceipt", test: (u) => has(receiptActions({ ...own, status: "posted", poStatus: "received" }, u), "cancel") },
    ],
  },
  {
    department: "Accounting",
    rows: [
      { key: "work", test: canWorkAccounting },
      { key: "issueInvoice", test: (u) => has(documentActions({ ...own, storedStatus: "draft", payments: [] }, u, "ar"), "issue") },
      { key: "approveBill", test: (u) => has(documentActions({ ...own, storedStatus: "draft", payments: [] }, u, "ap"), "approve") },
      { key: "confirmReceipt", test: (u) => has(moneyActions({ ...own, status: "draft" }, u, "ar"), "confirm") },
      { key: "confirmPayment", test: (u) => has(moneyActions({ ...own, status: "draft" }, u, "ap"), "confirm") },
      { key: "cancelConfirmedMoney", test: (u) => has(moneyActions({ ...own, status: "confirmed" }, u, "ar"), "cancel") },
      { key: "postEntry", test: (u) => has(entryActions({ source: "manual", status: "draft", createdBy: "Sample" }, u), "post") },
      { key: "changeMaster", test: (u) => canApprove(u, "Accounting") && isAccountingManager(u) },
    ],
  },
  {
    department: "Administration",
    sampleDepartment: "Sale",
    rows: [
      { key: "users", test: (u) => canUse(u, { type: "admin" }) },
      { key: "masterData", test: (u) => canUse(u, { type: "admin" }) },
    ],
  },
];

/** [{ department, rows: [{ key, cells: { Admin, Manager, Worker } }] }], computed from the real rules. */
export function permissionTable() {
  return MATRIX.map(({ department, sampleDepartment, rows }) => ({
    department,
    rows: rows.map(({ key, test }) => ({ key, cells: Object.fromEntries(ROLES.map((role) => [role, Boolean(test(sampleUser(role, sampleDepartment ?? department)))])) })),
  }));
}

/** The menu groups with who sees them: a user of each department (a Worker of it) and an Admin, asked with `canUse` like the menu. */
export const MENU_AUDIENCES = ["Sale", "Factory", "Purchase", "Accounting", "Admin"];
export function menuTable() {
  return NAV_GROUPS.map((group) => ({
    key: group.key,
    labelKey: group.labelKey,
    sees: Object.fromEntries(MENU_AUDIENCES.map((who) => [who, canUse(who === "Admin" ? ADMIN : sampleUser("Worker", who), group.access)])),
  }));
}
