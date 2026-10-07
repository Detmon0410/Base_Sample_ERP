import { roleInDepartment } from "@/utils/permissions";

/** Statuses in the order a document goes through them (docs/specs/f10-accounting.md). "overdue" is shown, not stored. */
export const INVOICE_STATUSES = ["draft", "issued", "partially_paid", "paid", "overdue", "cancelled"];
export const BILL_STATUSES = ["draft", "approved", "partially_paid", "paid", "overdue", "cancelled"];
export const MONEY_STATUSES = ["draft", "confirmed", "cancelled"];
export const ENTRY_STATUSES = ["draft", "posted", "reversed"];
export const ACCOUNT_TYPES = ["asset", "liability", "equity", "income", "expense"];
export const ACCOUNT_ROLES = ["cash", "receivable", "raw_stock", "input_tax", "payable", "output_tax", "sales"];

export const accountingRole = (user) => roleInDepartment(user, "Accounting");
export const canWork = (user) => Boolean(accountingRole(user));
export const isAccountingManager = (user) => ["Manager", "Admin"].includes(accountingRole(user));

/** One description of the two directions: customers (invoices, receipts) and suppliers (bills, payments). */
export const DIRECTIONS = {
  ar: { docPath: "/accounting/invoices", moneyPath: "/accounting/receipts", approve: "issue", approved: "issued", statuses: INVOICE_STATUSES, moneyConfirmManager: false, ns: "invoices" },
  ap: { docPath: "/accounting/bills", moneyPath: "/accounting/payments", approve: "approve", approved: "approved", statuses: BILL_STATUSES, moneyConfirmManager: true, ns: "bills" },
};

/** A draft: its author and a Manager edit and delete it. */
export const canEditDoc = (doc, user) => doc.storedStatus === "draft" && canWork(user) && (isAccountingManager(user) || doc.createdById === user?.id);
export const canEditMoney = (m, user) => m.status === "draft" && canWork(user) && (isAccountingManager(user) || m.createdById === user?.id);
/** Money can still be received / paid: the document is issued / approved or partly paid and has a balance. */
export const canPay = (doc, user) => canWork(user) && ["issued", "approved", "partially_paid"].includes(doc.storedStatus) && doc.balance > 0;

/** The status buttons of an invoice or a bill for this user. "Receive payment" / "Pay supplier" open a new money document and are not here. */
export function documentActions(doc, user, direction) {
  const manager = isAccountingManager(user);
  const d = DIRECTIONS[direction];
  const list = [];
  const open = [d.approved, "partially_paid"].includes(doc.storedStatus);
  const paidAny = doc.payments?.some((payment) => payment.status === "confirmed");
  if (doc.storedStatus === "draft") {
    if (manager) list.push({ key: d.approve, primary: true, noteLabel: "optional" });
    if (canEditDoc(doc, user)) list.push({ key: "cancel", noteLabel: "optional", danger: true });
  }
  if (open && manager && !paidAny) list.push({ key: "cancel", noteLabel: "required", danger: true });
  if (doc.storedStatus === "cancelled" && manager) list.push({ key: "revert", noteLabel: "required" });
  return list;
}

export function moneyActions(m, user, direction) {
  const manager = isAccountingManager(user);
  const list = [];
  if (m.status === "draft" && canEditMoney(m, user)) {
    if (!DIRECTIONS[direction].moneyConfirmManager || manager) list.push({ key: "confirm", primary: true, noteLabel: "optional" });
    list.push({ key: "cancel", noteLabel: "optional", danger: true });
  }
  if (m.status === "confirmed" && manager) list.push({ key: "cancel", noteLabel: "required", danger: true });
  return list;
}

export const canEditEntry = (entry, user) => entry.source === "manual" && entry.status === "draft" && canWork(user) && (isAccountingManager(user) || entry.createdBy === user?.name);
export function entryActions(entry, user) {
  const manager = isAccountingManager(user);
  const list = [];
  if (entry.source === "manual" && entry.status === "draft" && manager) list.push({ key: "post", primary: true, noteLabel: "optional" });
  if (entry.source === "manual" && entry.status === "posted" && !entry.reversalOf && manager) list.push({ key: "reverse", noteLabel: "required", danger: true });
  return list;
}
