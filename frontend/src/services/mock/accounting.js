// In-memory Accounting for VITE_USE_MOCK=true (docs/specs/f10-accounting.md): the master lists of the accounting
// department, customer invoices and receipts, supplier bills and payments, and the journal that every money document
// writes. A status only changes when a person calls an action; the paid / partially paid status follows the confirmed
// receipts (payments). The data lives until a full reload.

import { EMPTY_SEED } from "./seedMode.js";
import { thai } from "./thai.js";
import { MockHttpError, MockResponse } from "./errors.js";
import { createMockCrud } from "./masterData.js";
import { INTERNAL_TOKEN } from "./users.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const matches = (value, text) => String(value ?? "").toLowerCase().includes(text);
const today = () => new Date().toISOString().slice(0, 10);
const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000);
const addDays = (date, days) => new Date(new Date(`${date}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10);
const at = (date, time) => `${date}T${time}:00.000Z`;
const TERMS_DAYS = { NET_15: 15, NET_30: 30, NET_45: 45, NET_60: 60, COD: 0 };

export const INVOICE_STATUSES = ["draft", "issued", "partially_paid", "paid", "overdue", "cancelled"];
export const BILL_STATUSES = ["draft", "approved", "partially_paid", "paid", "overdue", "cancelled"];
export const MONEY_STATUSES = ["draft", "confirmed", "cancelled"];
export const ACCOUNT_TYPES = ["asset", "liability", "equity", "income", "expense"];
export const ACCOUNT_ROLES = ["cash", "receivable", "raw_stock", "input_tax", "payable", "output_tax", "sales"];

const forbid = () => new MockHttpError(403, "FORBIDDEN", "You may not do this");
const wrongStatus = () => new MockHttpError(409, "INVALID_STATUS", "This is not possible in the current status");
const invalid = (path, message = "INVALID") => new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [{ path: [path], message }]);

// Who may do what (spec 4). Anybody else gets 403.
function accountingRole(user) {
  if (user.memberships.some((membership) => membership.role === "Admin")) return "Admin";
  return user.memberships.find((membership) => membership.department === "Accounting")?.role ?? null;
}
const isManager = (role) => role === "Manager" || role === "Admin";

const counters = {};
function nextNumber(prefix, date) {
  const key = `${prefix}-${String(date).slice(0, 4)}`;
  counters[key] = (counters[key] ?? 0) + 1;
  return `${key}-${String(counters[key]).padStart(4, "0")}`;
}

const withIds = (rows) => rows.map((row, index) => ({ id: index + 1, status: "active", createdAt: "2026-09-01T09:00:00.000Z", updatedAt: "2026-09-01T09:00:00.000Z", ...row }));

const sampleAccounts = () =>
  withIds([
    { code: "1100", name: "Cash", type: "asset", role: "cash" },
    { code: "1110", name: "Bank deposits - ordinary", type: "asset", role: "" },
    { code: "1115", name: "Bank deposits - savings", type: "asset", role: "" },
    { code: "1200", name: "Accounts receivable", type: "asset", role: "receivable" },
    { code: "1300", name: "Raw material stock", type: "asset", role: "raw_stock" },
    { code: "1310", name: "Finished goods stock", type: "asset", role: "" },
    { code: "1400", name: "Input consumption tax", type: "asset", role: "input_tax" },
    { code: "2100", name: "Accounts payable", type: "liability", role: "payable" },
    { code: "2200", name: "Output consumption tax", type: "liability", role: "output_tax" },
    { code: "2300", name: "Accrued expenses", type: "liability", role: "" },
    { code: "3000", name: "Capital", type: "equity", role: "" },
    { code: "3100", name: "Retained earnings", type: "equity", role: "" },
    { code: "4100", name: "Sales revenue", type: "income", role: "sales" },
    { code: "5100", name: "Purchases and cost of sales", type: "expense", role: "" },
    { code: "5200", name: "Salaries", type: "expense", role: "" },
    { code: "5300", name: "Utilities", type: "expense", role: "" },
  ]);
const sampleTaxRates = () =>
  withIds([
    { code: "VAT10", name: "Standard rate", kind: "vat", rate: 10, isDefault: "yes" },
    { code: "VAT8", name: "Reduced rate", kind: "vat", rate: 8, isDefault: "no" },
    { code: "VAT0", name: "Exempt", kind: "vat", rate: 0, isDefault: "no" },
    { code: "WHT10", name: "Withholding tax", kind: "wht", rate: 10, isDefault: "no" },
  ]);
const sampleMethods = () =>
  withIds([
    { code: "CASH", name: "Cash", type: "cash" },
    { code: "BANK", name: "Bank transfer", type: "bank" },
    { code: "CHEQUE", name: "Cheque", type: "cheque" },
  ]);
const sampleBanks = () =>
  withIds([
    { code: "BA-01", name: "Main account", bankName: "Mizuho Bank", branch: "Shinjuku", accountNo: "1234567", glAccountCode: "1110" },
    { code: "BA-02", name: "Savings account", bankName: "MUFG Bank", branch: "Marunouchi", accountNo: "7654321", glAccountCode: "1115" },
  ]);

export function accountingRoutes({ userFromAuthorization, getStore, getSale, getPurchase, onAccounting }) {
  const store = () => getStore();
  const accounts = thai("accounts", sampleAccounts());
  const taxRates = thai("taxRates", sampleTaxRates());
  const methods = thai("paymentMethods", sampleMethods());
  const banks = thai("bankAccounts", sampleBanks());
  const invoices = [];
  const receipts = [];
  const bills = [];
  const payments = [];
  const journal = [];
  let seq = { inv: 1, rc: 1, bill: 1, pay: 1, je: 1 };
  let logId = 1;

  const guard = (authorization) => {
    const user = userFromAuthorization(authorization);
    const role = accountingRole(user);
    if (!role) throw new MockHttpError(403, "FORBIDDEN", "Accounting department only");
    return { user, role };
  };
  const readGuard = (authorization) => guard(authorization);
  const managerGuard = (authorization) => {
    const { user, role } = guard(authorization);
    if (!isManager(role)) throw forbid();
    return user;
  };

  const customerOf = (id) => store().customers.find((row) => row.id === Number(id));
  const supplierOf = (id) => store().suppliers.find((row) => row.id === Number(id));
  const productOf = (id) => store().products.find((row) => row.id === Number(id));
  const materialOf = (id) => store().materials.find((row) => row.id === Number(id));
  const accountOf = (id) => accounts.find((row) => row.id === Number(id));
  const accountByRole = (role) => {
    const found = accounts.find((row) => row.role === role && row.status === "active");
    if (!found) throw new MockHttpError(409, "ACCOUNT_ROLE_MISSING", `Set the ${role} account in the Accounting master`, [{ path: ["role"], message: "ACCOUNT_ROLE_MISSING", role }]);
    return found;
  };
  const bankOf = (id) => banks.find((row) => row.id === Number(id));
  const methodOf = (id) => methods.find((row) => row.id === Number(id));
  const taxOf = (id) => taxRates.find((row) => row.id === Number(id));
  const findIn = (items, id) => {
    const found = items.find((item) => item.id === Number(id));
    if (!found) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
    return found;
  };
  const fail = (errors) => {
    if (errors.length) throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", errors);
  };
  const noteOf = (body) => String(body.note ?? "").trim();
  const needNote = (note) => {
    if (!note) throw invalid("note", "REQUIRED");
  };
  function logEntry(doc, action, status, actor, note, when = new Date().toISOString()) {
    doc.log.push({ id: logId++, action, status, actor, at: when, note });
  }
  const historyOf = (doc) => [...doc.log].sort((a, b) => b.id - a.id).map((entry) => ({ id: entry.id, action: entry.action, status: entry.status, actor: entry.actor, at: entry.at, note: entry.note ?? null }));
  const statusBefore = (doc) => {
    const changes = doc.log.filter((entry) => entry.status);
    return changes.length >= 2 ? changes[changes.length - 2].status : null;
  };

  // ---------------------------------------------------------------------------------------------------------
  // The journal: every posted money document writes one balanced entry (R6) with the accounts of the system roles
  // ---------------------------------------------------------------------------------------------------------
  function writeEntry({ date, memo, docType = null, doc = null, lines, source = "auto", by, when = new Date().toISOString(), status = "posted", reversalOf = null, reference = "" }) {
    const entry = {
      id: seq.je++,
      number: nextNumber("JE", date),
      date,
      memo,
      reference,
      source,
      docType,
      docId: doc?.id ?? null,
      docNumber: doc?.number ?? null,
      lines: lines.filter((line) => line.debit || line.credit).map((line) => ({ accountId: line.accountId, debit: line.debit ?? 0, credit: line.credit ?? 0, memo: line.memo ?? "" })),
      status,
      reversalOf,
      createdBy: by,
      log: [],
    };
    logEntry(entry, status === "posted" ? "entry-post" : "created", status, by, null, when);
    journal.push(entry);
    return entry;
  }
  function reverseEntry(entry, by, note, when = new Date().toISOString()) {
    const reversal = writeEntry({ date: today(), memo: `Reversal of ${entry.number}`, docType: entry.docType, doc: { id: entry.docId, number: entry.docNumber }, lines: entry.lines.map((line) => ({ accountId: line.accountId, debit: line.credit, credit: line.debit, memo: line.memo })), by, when, reversalOf: entry.id, source: entry.source });
    entry.status = "reversed";
    logEntry(entry, "reverse", "reversed", by, note, when);
    return reversal;
  }
  const entryOf = (docType, doc) => journal.find((entry) => entry.docType === docType && entry.docId === doc.id && entry.status === "posted" && !entry.reversalOf);

  // ---------------------------------------------------------------------------------------------------------
  // Money documents (invoice / bill) and the money (receipt / payment): one implementation for both directions
  // ---------------------------------------------------------------------------------------------------------
  const KINDS = {
    ar: {
      docs: invoices,
      money: receipts,
      docType: "INV",
      moneyType: "RC",
      docPrefix: "INV",
      moneyPrefix: "RC",
      approvedStatus: "issued",
      approveAction: "issue",
      docKey: "invoices",
      moneyKey: "receipts",
      partyOf: (doc) => customerOf(doc.partyId),
      moneyConfirmManager: false,
    },
    ap: {
      docs: bills,
      money: payments,
      docType: "BILL",
      moneyType: "PAY",
      docPrefix: "BILL",
      moneyPrefix: "PAY",
      approvedStatus: "approved",
      approveAction: "approve",
      docKey: "bills",
      moneyKey: "payments",
      partyOf: (doc) => supplierOf(doc.partyId),
      moneyConfirmManager: true,
    },
  };

  const totalsOf = (doc) => {
    const subtotal = doc.lines.reduce((sum, line) => sum + Math.round(line.qty * line.unitPrice), 0);
    const tax = Math.floor((subtotal * doc.taxRate) / 100);
    return { subtotal, tax, total: subtotal + tax };
  };
  const moneyOf = (kind, doc) => KINDS[kind].money.filter((m) => m.docId === doc.id);
  const paidOf = (kind, doc) => moneyOf(kind, doc).filter((m) => m.status === "confirmed").reduce((sum, m) => sum + m.amount, 0);
  const isOpenStatus = (kind, doc) => [KINDS[kind].approvedStatus, "partially_paid"].includes(doc.status);
  const overdueDaysOf = (kind, doc) => {
    if (!isOpenStatus(kind, doc)) return 0;
    const balance = totalsOf(doc).total - paidOf(kind, doc);
    return balance > 0 && doc.dueDate < today() ? daysBetween(doc.dueDate, today()) : 0;
  };
  const openBalanceOfParty = (kind, partyId) => KINDS[kind].docs.filter((doc) => doc.partyId === partyId && isOpenStatus(kind, doc)).reduce((sum, doc) => sum + totalsOf(doc).total - paidOf(kind, doc), 0);

  function shapeDoc(kind, doc) {
    const k = KINDS[kind];
    const totals = totalsOf(doc);
    const paid = paidOf(kind, doc);
    const overdueDays = overdueDaysOf(kind, doc);
    const party = k.partyOf(doc);
    const lines = doc.lines.map((line) => {
      const item = kind === "ar" ? productOf(line.itemId) : materialOf(line.itemId);
      return { itemId: line.itemId, productId: kind === "ar" ? line.itemId : undefined, materialId: kind === "ar" ? undefined : line.itemId, code: item?.code, name: item?.name, productCode: item?.code, productName: item?.name, materialCode: item?.code, materialName: item?.name, uom: item?.uom, qty: line.qty, maxQty: line.maxQty ?? line.qty, unitPrice: line.unitPrice, amount: Math.round(line.qty * line.unitPrice) };
    });
    const entry = entryOf(k.docType, doc);
    const base = {
      id: doc.id,
      number: doc.number,
      date: doc.date,
      dueDate: doc.dueDate,
      status: overdueDays > 0 ? "overdue" : doc.status,
      storedStatus: doc.status,
      overdueDays,
      partyId: doc.partyId,
      partyCode: party?.code,
      partyName: party?.name,
      taxRateId: doc.taxRateId,
      taxRatePercent: doc.taxRate,
      remarks: doc.remarks ?? "",
      createdById: doc.createdById,
      createdBy: doc.createdBy,
      lines,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      totals: { ...totals, taxRate: doc.taxRate / 100 },
      paid,
      balance: totals.total - paid,
      payments: moneyOf(kind, doc).map((m) => ({ id: m.id, number: m.number, date: m.date, amount: m.amount, status: m.status })),
      history: historyOf(doc),
      journalEntryId: entry?.id ?? null,
    };
    const links = [];
    if (kind === "ar") {
      const dn = getSale().deliveries.find((row) => row.id === doc.sourceId);
      const so = getSale().orders.find((row) => row.id === dn?.saleOrderId);
      Object.assign(base, { customerCode: party?.code, customerName: party?.name, deliveryId: doc.sourceId, deliveryNumber: dn?.number, saleOrderId: so?.id, saleOrderNumber: so?.number });
      const account = { openBalance: openBalanceOfParty("ar", doc.partyId), creditLimit: party?.creditLimit ?? null };
      base.customerAccount = { ...account, overLimit: account.creditLimit != null && account.openBalance > account.creditLimit };
      base.payTo = banks.find((bank) => bank.status === "active") ? `${banks[0].bankName} ${banks[0].branch} · ${banks[0].accountNo}` : "";
      if (so) links.push({ id: `so-${so.id}`, type: "order", number: so.number, status: so.status, to: `/sale/orders/${so.id}` });
      if (dn) links.push({ id: `dn-${dn.id}`, type: "delivery", number: dn.number, status: dn.status, to: `/sale/deliveries/${dn.id}` });
    } else {
      const gr = getPurchase().receipts.find((row) => row.id === doc.sourceId);
      const po = getPurchase().orders.find((row) => row.id === gr?.poId);
      Object.assign(base, { supplierCode: party?.code, supplierName: party?.name, receiptId: doc.sourceId, receiptNumber: gr?.number, poId: po?.id, poNumber: po?.number, supplierInvoiceNo: doc.supplierInvoiceNo ?? "" });
      if (po) links.push({ id: `po-${po.id}`, type: "purchaseOrder", number: po.number, status: po.status, to: `/purchase/orders/${po.id}` });
      if (gr) links.push({ id: `gr-${gr.id}`, type: "goodsReceipt", number: gr.number, status: gr.status, to: `/purchase/receipts/${gr.id}` });
    }
    for (const m of moneyOf(kind, doc)) links.push({ id: `${k.moneyType}-${m.id}`, type: kind === "ar" ? "customerReceipt" : "supplierPayment", number: m.number, status: m.status, to: `/accounting/${k.moneyKey}/${m.id}` });
    if (entry) links.push({ id: `je-${entry.id}`, type: "journalEntry", number: entry.number, status: entry.status, to: `/accounting/journal/${entry.id}` });
    base.links = links;
    base.partyName = party?.name;
    return base;
  }

  function shapeMoney(kind, m) {
    const k = KINDS[kind];
    const doc = k.docs.find((row) => row.id === m.docId);
    const party = doc ? k.partyOf(doc) : null;
    const entry = entryOf(k.moneyType, m);
    const links = [];
    if (doc) links.push({ id: `${k.docType}-${doc.id}`, type: kind === "ar" ? "customerInvoice" : "supplierBill", number: doc.number, status: shapeDoc(kind, doc).status, to: `/accounting/${k.docKey}/${doc.id}` });
    if (entry) links.push({ id: `je-${entry.id}`, type: "journalEntry", number: entry.number, status: entry.status, to: `/accounting/journal/${entry.id}` });
    return {
      id: m.id,
      number: m.number,
      date: m.date,
      status: m.status,
      docId: m.docId,
      docNumber: doc?.number,
      docStatus: doc ? shapeDoc(kind, doc).status : null,
      docBalance: doc ? totalsOf(doc).total - paidOf(kind, doc) : 0,
      docTotal: doc ? totalsOf(doc).total : 0,
      partyId: doc?.partyId,
      partyCode: party?.code,
      partyName: party?.name,
      amount: m.amount,
      methodId: m.methodId,
      methodName: methodOf(m.methodId)?.name,
      methodType: methodOf(m.methodId)?.type,
      bankAccountId: m.bankAccountId ?? null,
      bankAccountName: bankOf(m.bankAccountId)?.name ?? null,
      reference: m.reference ?? "",
      remarks: m.remarks ?? "",
      createdById: m.createdById,
      createdBy: m.createdBy,
      history: historyOf(m),
      links,
      journalEntryId: entry?.id ?? null,
    };
  }

  // ---- posting ----
  function postDocument(kind, doc, by, when) {
    const k = KINDS[kind];
    const totals = totalsOf(doc);
    const lines =
      kind === "ar"
        ? [{ accountId: accountByRole("receivable").id, debit: totals.total }, { accountId: accountByRole("sales").id, credit: totals.subtotal }, { accountId: accountByRole("output_tax").id, credit: totals.tax }]
        : [{ accountId: accountByRole("raw_stock").id, debit: totals.subtotal }, { accountId: accountByRole("input_tax").id, debit: totals.tax }, { accountId: accountByRole("payable").id, credit: totals.total }];
    // the roles must exist before anything is written
    return writeEntry({ date: doc.date, memo: `${kind === "ar" ? "Invoice" : "Bill"} ${doc.number}`, docType: k.docType, doc, lines, by, when });
  }
  function cashAccountOf(m) {
    const method = methodOf(m.methodId);
    if (method?.type === "cash") return accountByRole("cash");
    const bank = bankOf(m.bankAccountId);
    return accounts.find((account) => account.code === bank?.glAccountCode) ?? accountByRole("cash");
  }
  function postMoney(kind, m, by, when) {
    const k = KINDS[kind];
    const cash = cashAccountOf(m);
    const lines = kind === "ar" ? [{ accountId: cash.id, debit: m.amount }, { accountId: accountByRole("receivable").id, credit: m.amount }] : [{ accountId: accountByRole("payable").id, debit: m.amount }, { accountId: cash.id, credit: m.amount }];
    const doc = k.docs.find((row) => row.id === m.docId);
    return writeEntry({ date: m.date, memo: `${kind === "ar" ? "Receipt" : "Payment"} ${m.number} for ${doc?.number}`, docType: k.moneyType, doc: m, lines, by, when });
  }

  /** After a receipt / payment was confirmed or cancelled: the document is Paid, Partially paid or open again. */
  function refreshStatus(kind, doc, by, label, when) {
    const k = KINDS[kind];
    if (![k.approvedStatus, "partially_paid", "paid"].includes(doc.status)) return;
    const total = totalsOf(doc).total;
    const paid = paidOf(kind, doc);
    const next = paid >= total ? "paid" : paid > 0 ? "partially_paid" : k.approvedStatus;
    if (next === doc.status) return;
    doc.status = next;
    logEntry(doc, "pay", next, by, label, when);
  }

  // ---- validation ----
  const intOk = (value, min = 0) => typeof value === "number" && Number.isInteger(value) && value >= min;
  function checkTax(body, errors) {
    const tax = taxOf(body.taxRateId);
    if (!tax || tax.kind !== "vat" || tax.status === "inactive") errors.push({ path: ["taxRateId"], message: "REQUIRED" });
    return tax;
  }
  function checkDates(body, errors) {
    if (!DATE_RE.test(String(body.date ?? ""))) errors.push({ path: ["date"], message: "REQUIRED" });
    if (body.dueDate && !DATE_RE.test(String(body.dueDate))) errors.push({ path: ["dueDate"], message: "INVALID" });
    else if (body.dueDate && body.date && body.dueDate < body.date) errors.push({ path: ["dueDate"], message: "DATE_ORDER" });
    if (String(body.remarks ?? "").length > 500) errors.push({ path: ["remarks"], message: "TOO_LONG" });
  }

  /** The source of a new invoice: a delivered delivery note that is not invoiced yet; of a bill: a posted goods receipt that is not billed. */
  const sourceTaken = (kind, sourceId, exceptId) => KINDS[kind].docs.some((doc) => doc.sourceId === Number(sourceId) && doc.status !== "cancelled" && doc.id !== exceptId);
  function sourceLines(kind, sourceId) {
    if (kind === "ar") {
      const dn = getSale().deliveries.find((row) => row.id === Number(sourceId));
      if (!dn || dn.status !== "delivered") return null;
      const order = getSale().orders.find((row) => row.id === dn.saleOrderId);
      return {
        partyId: dn.customerId,
        lines: dn.lines.filter((line) => line.deliverNow > 0).map((line) => ({ itemId: line.productId, qty: line.deliverNow, maxQty: line.deliverNow, unitPrice: order?.lines.find((item) => item.productId === line.productId)?.unitPrice ?? productOf(line.productId)?.sellingPrice ?? 0 })),
      };
    }
    const gr = getPurchase().receipts.find((row) => row.id === Number(sourceId));
    if (!gr || gr.status !== "posted") return null;
    const po = getPurchase().orders.find((row) => row.id === gr.poId);
    return {
      partyId: po.supplierId,
      lines: gr.lines.filter((line) => line.accepted > 0).map((line) => ({ itemId: line.materialId, qty: line.accepted, maxQty: line.accepted, unitPrice: po.lines.find((item) => item.materialId === line.materialId)?.unitPrice ?? 0 })),
    };
  }
  function checkDocLines(kind, body, source, errors) {
    const sent = Array.isArray(body.lines) ? body.lines : source.lines.map((line) => ({ itemId: line.itemId, qty: line.qty, unitPrice: line.unitPrice }));
    const result = [];
    sent.forEach((line, index) => {
      const itemId = Number(line.itemId ?? line.productId ?? line.materialId);
      const original = source.lines.find((item) => item.itemId === itemId);
      if (!original) errors.push({ path: ["lines", index, "itemId"], message: "INVALID" });
      else if (typeof line.qty !== "number" || !(line.qty > 0) || line.qty > original.maxQty) errors.push({ path: ["lines", index, "qty"], message: line.qty > original.maxQty ? "TOO_MANY" : "INVALID" });
      if (!intOk(line.unitPrice)) errors.push({ path: ["lines", index, "unitPrice"], message: line.unitPrice == null ? "REQUIRED" : "INVALID" });
      if (original) result.push({ itemId, qty: line.qty, maxQty: original.maxQty, unitPrice: line.unitPrice });
    });
    if (result.length === 0) errors.push({ path: ["lines"], message: "REQUIRED" });
    return result;
  }
  const describeLines = (kind, lines) =>
    lines.map((line) => {
      const item = kind === "ar" ? productOf(line.itemId) : materialOf(line.itemId);
      return { itemId: line.itemId, code: item?.code, name: item?.name, uom: item?.uom, qty: line.qty, maxQty: line.maxQty, unitPrice: line.unitPrice };
    });
  const dueFrom = (kind, party, date) => addDays(date, TERMS_DAYS[party?.paymentTerms] ?? 30);

  function checkMoney(kind, body, errors, existing) {
    const k = KINDS[kind];
    const doc = k.docs.find((row) => row.id === Number(body.docId ?? existing?.docId));
    if (!doc || ![k.approvedStatus, "partially_paid"].includes(doc.status)) errors.push({ path: ["docId"], message: doc ? "INVALID_STATUS" : "REQUIRED" });
    if (!DATE_RE.test(String(body.date ?? ""))) errors.push({ path: ["date"], message: "REQUIRED" });
    const method = methodOf(body.methodId);
    if (!method || method.status === "inactive") errors.push({ path: ["methodId"], message: "REQUIRED" });
    if (method && method.type !== "cash") {
      const bank = bankOf(body.bankAccountId);
      if (!bank || bank.status === "inactive") errors.push({ path: ["bankAccountId"], message: "REQUIRED" });
    }
    if (!intOk(body.amount, 1)) errors.push({ path: ["amount"], message: body.amount == null ? "REQUIRED" : "INVALID" });
    else if (doc && body.amount > totalsOf(doc).total - paidOf(kind, doc)) errors.push({ path: ["amount"], message: "TOO_MANY" });
    if (String(body.reference ?? "").length > 100) errors.push({ path: ["reference"], message: "TOO_LONG" });
    if (String(body.remarks ?? "").length > 500) errors.push({ path: ["remarks"], message: "TOO_LONG" });
  }

  // ---- list helper ----
  function listOf(rows, { query, searchFields, sorts, defaultSort, dateField = "date", extra = () => true, sumFields = [] }) {
    const text = String(query.q ?? "").trim().toLowerCase();
    const status = query.status && query.status !== "all" ? query.status : null;
    const others = rows.filter(
      (row) =>
        (!query.from || (row[dateField] ?? "") >= query.from) &&
        (!query.to || (row[dateField] ?? "") <= query.to) &&
        extra(row, query) &&
        (!text || searchFields.some((field) => matches(row[field], text))),
    );
    const statusCounts = {};
    others.forEach((row) => (statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1));
    let result = status ? others.filter((row) => row.status === status) : others;
    const sortKey = String(query.sort ?? defaultSort);
    const descending = sortKey.startsWith("-");
    const field = descending ? sortKey.slice(1) : sortKey;
    if (sorts.includes(field)) {
      result = [...result].sort((a, b) => {
        const left = a[field];
        const right = b[field];
        let order;
        if (left == null || left === "") order = right == null || right === "" ? 0 : 1;
        else if (right == null || right === "") order = -1;
        else order = typeof left === "number" ? left - right : String(left).localeCompare(String(right));
        return (descending ? -order : order) || b.id - a.id;
      });
    }
    const pageSize = Math.min(Number(query.pageSize) || 20, 100);
    const total = result.length;
    const page = Math.min(Math.max(Number(query.page) || 1, 1), Math.max(1, Math.ceil(total / pageSize)));
    const sums = sumFields.length ? Object.fromEntries(sumFields.map((fieldName) => [fieldName, result.reduce((sum, row) => sum + (row[fieldName] ?? 0), 0)])) : undefined;
    return new MockResponse({ data: result.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total, statusCounts, ...(sums ? { sums } : {}) } });
  }

  // ---------------------------------------------------------------------------------------------------------
  // Routes
  // ---------------------------------------------------------------------------------------------------------
  const routes = {};

  for (const kind of ["ar", "ap"]) {
    const k = KINDS[kind];
    const docBase = `/accounting/${k.docKey}`;
    const moneyBase = `/accounting/${k.moneyKey}`;
    const mayEdit = (doc, user, role) => isManager(role) || doc.createdById === user.id;

    routes[`GET ${docBase}`] = ({ authorization, query }) => {
      guard(authorization);
      const rows = k.docs.map((doc) => shapeDoc(kind, doc));
      return listOf(rows, {
        query,
        searchFields: kind === "ar" ? ["number", "partyCode", "partyName", "deliveryNumber", "saleOrderNumber"] : ["number", "partyCode", "partyName", "poNumber", "receiptNumber", "supplierInvoiceNo"],
        sorts: ["number", "date", "dueDate", "partyCode", "total", "paid", "balance", "status"],
        defaultSort: "-date",
        sumFields: ["total", "paid", "balance"],
        extra: (row, q) => (!q.party || row.partyId === Number(q.party)) && (!q.dueFrom || row.dueDate >= q.dueFrom) && (!q.dueTo || row.dueDate <= q.dueTo) && (!q.open || (row.balance > 0 && ["issued", "approved", "partially_paid"].includes(row.storedStatus))),
      });
    };
    routes[`GET ${docBase}/sources`] = ({ authorization }) => {
      guard(authorization);
      // the delivery notes (receipts) that can still be invoiced (billed)
      if (kind === "ar") {
        return getSale()
          .deliveries.filter((dn) => dn.status === "delivered" && !sourceTaken("ar", dn.id))
          .map((dn) => ({ id: dn.id, number: dn.number, date: dn.date, partyId: dn.customerId, partyName: customerOf(dn.customerId)?.name, ref: getSale().orders.find((row) => row.id === dn.saleOrderId)?.number, lines: describeLines(kind, sourceLines(kind, dn.id).lines) }));
      }
      return getPurchase()
        .receipts.filter((gr) => gr.status === "posted" && !sourceTaken("ap", gr.id))
        .map((gr) => {
          const po = getPurchase().orders.find((row) => row.id === gr.poId);
          return { id: gr.id, number: gr.number, date: gr.date, partyId: po.supplierId, partyName: supplierOf(po.supplierId)?.name, ref: po.number, supplierTerms: supplierOf(po.supplierId)?.paymentTerms, lines: describeLines(kind, sourceLines(kind, gr.id).lines) };
        });
    };
    routes[`GET ${docBase}/:id`] = ({ authorization, params }) => {
      guard(authorization);
      return shapeDoc(kind, findIn(k.docs, params.id));
    };
    routes[`POST ${docBase}`] = ({ authorization, body }) => {
      const { user } = guard(authorization);
      const errors = [];
      const source = sourceLines(kind, body.sourceId);
      if (!source) errors.push({ path: ["sourceId"], message: "REQUIRED" });
      else if (sourceTaken(kind, body.sourceId)) errors.push({ path: ["sourceId"], message: "ALREADY_USED" });
      checkDates(body, errors);
      const tax = checkTax(body, errors);
      const lines = source ? checkDocLines(kind, body, source, errors) : [];
      fail(errors);
      const party = k.partyOf({ partyId: source.partyId });
      const doc = {
        id: kind === "ar" ? seq.inv++ : seq.bill++,
        number: nextNumber(k.docPrefix, body.date),
        date: body.date,
        dueDate: body.dueDate || dueFrom(kind, party, body.date),
        partyId: source.partyId,
        sourceId: Number(body.sourceId),
        taxRateId: tax.id,
        taxRate: tax.rate,
        supplierInvoiceNo: kind === "ap" ? String(body.supplierInvoiceNo ?? "").trim() : undefined,
        remarks: String(body.remarks ?? ""),
        lines,
        status: "draft",
        createdById: user.id,
        createdBy: user.name,
        log: [],
      };
      logEntry(doc, "created", "draft", user.name, null);
      k.docs.push(doc);
      return new MockResponse({ data: shapeDoc(kind, doc), status: 201, message: "Created" });
    };
    routes[`PUT ${docBase}/:id`] = ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const doc = findIn(k.docs, params.id);
      if (doc.status !== "draft") throw wrongStatus();
      if (!mayEdit(doc, user, role)) throw forbid();
      const errors = [];
      checkDates({ ...body, date: body.date ?? doc.date }, errors);
      const tax = checkTax(body, errors);
      const source = sourceLines(kind, doc.sourceId);
      const lines = checkDocLines(kind, body, source, errors);
      fail(errors);
      Object.assign(doc, { date: body.date, dueDate: body.dueDate || doc.dueDate, taxRateId: tax.id, taxRate: tax.rate, remarks: String(body.remarks ?? ""), lines });
      if (kind === "ap") doc.supplierInvoiceNo = String(body.supplierInvoiceNo ?? "").trim();
      return shapeDoc(kind, doc);
    };
    routes[`DELETE ${docBase}/:id`] = ({ authorization, params }) => {
      const { user, role } = guard(authorization);
      const doc = findIn(k.docs, params.id);
      if (doc.status !== "draft") throw wrongStatus();
      if (!mayEdit(doc, user, role)) throw forbid();
      k.docs.splice(k.docs.indexOf(doc), 1);
      return null;
    };
    routes[`POST ${docBase}/:id/:action`] = ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const doc = findIn(k.docs, params.id);
      const note = noteOf(body);
      const paidAny = moneyOf(kind, doc).some((m) => m.status === "confirmed");
      if (params.action === k.approveAction) {
        if (!isManager(role)) throw forbid();
        if (doc.status !== "draft") throw wrongStatus();
        postDocument(kind, doc, user.name); // refused with ACCOUNT_ROLE_MISSING before the status changes
        doc.status = k.approvedStatus;
        logEntry(doc, kind === "ar" ? "issue" : "bill-approve", k.approvedStatus, user.name, note || null);
      } else if (params.action === "cancel") {
        if (doc.status === "draft") {
          if (!mayEdit(doc, user, role)) throw forbid();
        } else if (isOpenStatus(kind, doc)) {
          if (!isManager(role)) throw forbid();
          needNote(note);
          if (paidAny) throw wrongStatus();
          const entry = entryOf(k.docType, doc);
          if (entry) reverseEntry(entry, user.name, note);
        } else throw wrongStatus();
        for (const m of moneyOf(kind, doc).filter((row) => row.status === "draft")) {
          m.status = "cancelled";
          logEntry(m, "cancel", "cancelled", user.name, "The document was cancelled");
        }
        doc.status = "cancelled";
        logEntry(doc, "cancel", "cancelled", user.name, note || null);
      } else if (params.action === "revert") {
        if (!isManager(role)) throw forbid();
        needNote(note);
        const previous = statusBefore(doc);
        if (doc.status !== "cancelled" || !previous) throw wrongStatus();
        if (sourceTaken(kind, doc.sourceId, doc.id)) throw new MockHttpError(409, "ALREADY_USED", "The source document has another invoice or bill");
        if (previous !== "draft") postDocument(kind, doc, user.name);
        doc.status = previous === "paid" || previous === "partially_paid" ? k.approvedStatus : previous;
        logEntry(doc, "revert", doc.status, user.name, note);
      } else {
        throw new MockHttpError(404, "ROUTE_NOT_FOUND", "Unknown action");
      }
      return shapeDoc(kind, doc);
    };

    // ---- the money ----
    routes[`GET ${moneyBase}`] = ({ authorization, query }) => {
      guard(authorization);
      const rows = k.money.map((m) => shapeMoney(kind, m));
      return listOf(rows, {
        query,
        searchFields: ["number", "docNumber", "partyCode", "partyName", "reference"],
        sorts: ["number", "date", "docNumber", "partyCode", "amount", "status"],
        defaultSort: "-date",
        sumFields: ["amount"],
        extra: (row, q) => (!q.party || row.partyId === Number(q.party)) && (!q.method || row.methodId === Number(q.method)) && (!q.doc || row.docId === Number(q.doc)),
      });
    };
    routes[`GET ${moneyBase}/:id`] = ({ authorization, params }) => {
      guard(authorization);
      return shapeMoney(kind, findIn(k.money, params.id));
    };
    routes[`POST ${moneyBase}`] = ({ authorization, body }) => {
      const { user } = guard(authorization);
      const errors = [];
      checkMoney(kind, body, errors);
      fail(errors);
      const m = {
        id: kind === "ar" ? seq.rc++ : seq.pay++,
        number: nextNumber(k.moneyPrefix, body.date),
        date: body.date,
        docId: Number(body.docId),
        amount: body.amount,
        methodId: Number(body.methodId),
        bankAccountId: methodOf(body.methodId)?.type === "cash" ? null : Number(body.bankAccountId),
        reference: String(body.reference ?? "").trim(),
        remarks: String(body.remarks ?? ""),
        status: "draft",
        createdById: user.id,
        createdBy: user.name,
        log: [],
      };
      logEntry(m, "created", "draft", user.name, `For ${k.docs.find((row) => row.id === m.docId).number}`);
      k.money.push(m);
      return new MockResponse({ data: shapeMoney(kind, m), status: 201, message: "Created" });
    };
    routes[`PUT ${moneyBase}/:id`] = ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const m = findIn(k.money, params.id);
      if (m.status !== "draft") throw wrongStatus();
      if (!mayEdit(m, user, role)) throw forbid();
      const errors = [];
      checkMoney(kind, { ...body, docId: m.docId }, errors, m);
      fail(errors);
      Object.assign(m, { date: body.date, amount: body.amount, methodId: Number(body.methodId), bankAccountId: methodOf(body.methodId)?.type === "cash" ? null : Number(body.bankAccountId), reference: String(body.reference ?? "").trim(), remarks: String(body.remarks ?? "") });
      return shapeMoney(kind, m);
    };
    routes[`DELETE ${moneyBase}/:id`] = ({ authorization, params }) => {
      const { user, role } = guard(authorization);
      const m = findIn(k.money, params.id);
      if (m.status !== "draft") throw wrongStatus();
      if (!mayEdit(m, user, role)) throw forbid();
      k.money.splice(k.money.indexOf(m), 1);
      return null;
    };
    routes[`POST ${moneyBase}/:id/:action`] = ({ authorization, params, body }) => {
      const { user, role } = guard(authorization);
      const m = findIn(k.money, params.id);
      const doc = k.docs.find((row) => row.id === m.docId);
      const note = noteOf(body);
      if (params.action === "confirm") {
        if (k.moneyConfirmManager && !isManager(role)) throw forbid();
        if (m.status !== "draft") throw wrongStatus();
        const errors = [];
        checkMoney(kind, m, errors, m); // checked again: two drafts cannot pay the same money twice
        fail(errors);
        postMoney(kind, m, user.name);
        m.status = "confirmed";
        logEntry(m, "money-confirm", "confirmed", user.name, note || null);
        refreshStatus(kind, doc, user.name, m.number);
      } else if (params.action === "cancel") {
        if (m.status === "draft") {
          if (!mayEdit(m, user, role)) throw forbid();
        } else if (m.status === "confirmed") {
          if (!isManager(role)) throw forbid();
          needNote(note);
          const entry = entryOf(k.moneyType, m);
          if (entry) reverseEntry(entry, user.name, note);
        } else throw wrongStatus();
        const wasConfirmed = m.status === "confirmed";
        m.status = "cancelled";
        logEntry(m, "cancel", "cancelled", user.name, note || null);
        if (wasConfirmed) refreshStatus(kind, doc, user.name, m.number);
      } else {
        throw new MockHttpError(404, "ROUTE_NOT_FOUND", "Unknown action");
      }
      return shapeMoney(kind, m);
    };
  }

  // ---- the journal (C5) ----
  const sumOf = (entry, side) => entry.lines.reduce((sum, line) => sum + line[side], 0);
  function shapeEntry(entry) {
    const debit = sumOf(entry, "debit");
    const credit = sumOf(entry, "credit");
    return {
      id: entry.id,
      number: entry.number,
      date: entry.date,
      memo: entry.memo,
      reference: entry.reference,
      source: entry.source,
      status: entry.status,
      docType: entry.docType,
      docId: entry.docId,
      docNumber: entry.docNumber,
      reversalOf: entry.reversalOf,
      reversalOfNumber: journal.find((row) => row.id === entry.reversalOf)?.number ?? null,
      debit,
      credit,
      createdBy: entry.createdBy,
      lines: entry.lines.map((line) => ({ accountId: line.accountId, accountCode: accountOf(line.accountId)?.code, accountName: accountOf(line.accountId)?.name, debit: line.debit, credit: line.credit, memo: line.memo })),
      history: historyOf(entry),
      links: entry.docType ? [docLink(entry)].filter(Boolean) : [],
    };
  }
  function docLink(entry) {
    const map = { INV: ["invoices", "customerInvoice"], RC: ["receipts", "customerReceipt"], BILL: ["bills", "supplierBill"], PAY: ["payments", "supplierPayment"] };
    const [path, type] = map[entry.docType] ?? [];
    return path ? { id: `${entry.docType}-${entry.docId}`, type, number: entry.docNumber, status: null, to: `/accounting/${path}/${entry.docId}` } : null;
  }
  function checkEntry(body, errors) {
    if (!DATE_RE.test(String(body.date ?? ""))) errors.push({ path: ["date"], message: "REQUIRED" });
    if (!String(body.memo ?? "").trim()) errors.push({ path: ["memo"], message: "REQUIRED" });
    if (String(body.memo ?? "").length > 200) errors.push({ path: ["memo"], message: "TOO_LONG" });
    const lines = Array.isArray(body.lines) ? body.lines : [];
    if (lines.length < 2) errors.push({ path: ["lines"], message: "REQUIRED" });
    lines.forEach((line, index) => {
      const account = accountOf(line.accountId);
      if (!account || account.status === "inactive") errors.push({ path: ["lines", index, "accountId"], message: "REQUIRED" });
      const debit = line.debit ?? 0;
      const credit = line.credit ?? 0;
      if (!intOk(debit) || !intOk(credit)) errors.push({ path: ["lines", index, "debit"], message: "INVALID" });
      else if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) errors.push({ path: ["lines", index, "debit"], message: "ONE_SIDE" });
    });
  }
  const balanced = (entry) => entry.lines.length >= 2 && sumOf(entry, "debit") === sumOf(entry, "credit") && sumOf(entry, "debit") > 0;

  routes["GET /accounting/journal"] = ({ authorization, query }) => {
    guard(authorization);
    const account = query.account ? Number(query.account) : null;
    const rows = journal.map(shapeEntry);
    const result = listOf(rows, {
      query,
      searchFields: ["number", "docNumber", "memo", "reference"],
      sorts: ["number", "date", "debit", "credit", "status"],
      defaultSort: "-date",
      extra: (row, q) => (!account || row.lines.some((line) => line.accountId === account)) && (!q.source || row.source === q.source),
    });
    if (account) {
      // the ledger of one account: the lines that touch it (reversed entries count, their reversal cancels them)
      const touched = journal.filter((entry) => entry.lines.some((line) => line.accountId === account));
      const debit = touched.reduce((sum, entry) => sum + entry.lines.filter((line) => line.accountId === account).reduce((s, line) => s + line.debit, 0), 0);
      const credit = touched.reduce((sum, entry) => sum + entry.lines.filter((line) => line.accountId === account).reduce((s, line) => s + line.credit, 0), 0);
      const type = accountOf(account)?.type;
      result.meta.account = { id: account, code: accountOf(account)?.code, name: accountOf(account)?.name, debit, credit, balance: ["asset", "expense"].includes(type) ? debit - credit : credit - debit };
    }
    return result;
  };
  routes["GET /accounting/journal/:id"] = ({ authorization, params }) => {
    guard(authorization);
    return shapeEntry(findIn(journal, params.id));
  };
  routes["POST /accounting/journal"] = ({ authorization, body }) => {
    const { user } = guard(authorization);
    const errors = [];
    checkEntry(body, errors);
    fail(errors);
    const entry = writeEntry({ date: body.date, memo: String(body.memo).trim(), reference: String(body.reference ?? "").trim(), lines: body.lines.map((line) => ({ ...line, accountId: Number(line.accountId) })), source: "manual", by: user.name, status: "draft" });
    return new MockResponse({ data: shapeEntry(entry), status: 201, message: "Created" });
  };
  routes["PUT /accounting/journal/:id"] = ({ authorization, params, body }) => {
    const { user, role } = guard(authorization);
    const entry = findIn(journal, params.id);
    if (entry.source !== "manual" || entry.status !== "draft") throw wrongStatus();
    if (!(isManager(role) || entry.createdBy === user.name)) throw forbid();
    const errors = [];
    checkEntry(body, errors);
    fail(errors);
    Object.assign(entry, { date: body.date, memo: String(body.memo).trim(), reference: String(body.reference ?? "").trim(), lines: body.lines.filter((line) => line.debit || line.credit).map((line) => ({ accountId: Number(line.accountId), debit: line.debit ?? 0, credit: line.credit ?? 0, memo: line.memo ?? "" })) });
    return shapeEntry(entry);
  };
  routes["DELETE /accounting/journal/:id"] = ({ authorization, params }) => {
    const { user, role } = guard(authorization);
    const entry = findIn(journal, params.id);
    if (entry.source !== "manual" || entry.status !== "draft") throw wrongStatus();
    if (!(isManager(role) || entry.createdBy === user.name)) throw forbid();
    journal.splice(journal.indexOf(entry), 1);
    return null;
  };
  routes["POST /accounting/journal/:id/:action"] = ({ authorization, params, body }) => {
    const { user, role } = guard(authorization);
    const entry = findIn(journal, params.id);
    const note = noteOf(body);
    if (!isManager(role)) throw forbid();
    if (params.action === "post") {
      if (entry.source !== "manual" || entry.status !== "draft") throw wrongStatus();
      if (!balanced(entry)) throw new MockHttpError(409, "NOT_BALANCED", "The entry is not balanced");
      entry.status = "posted";
      logEntry(entry, "entry-post", "posted", user.name, note || null);
    } else if (params.action === "reverse") {
      needNote(note);
      if (entry.source !== "manual" || entry.status !== "posted" || entry.reversalOf) throw wrongStatus();
      reverseEntry(entry, user.name, note);
    } else {
      throw new MockHttpError(404, "ROUTE_NOT_FOUND", "Unknown action");
    }
    return shapeEntry(entry);
  };

  // ---- the master lists (C6): the same six calls as the master data; everybody in Accounting reads, a Manager changes ----
  const requiredText = (body, field, errors) => {
    if (!String(body[field] ?? "").trim()) errors.push({ path: [field], message: "REQUIRED" });
  };
  const masterRoutes = {
    ...createMockCrud("/master/accounts", accounts, {
      searchFields: ["code", "name"],
      sortable: ["code", "name", "type", "role", "status"],
      validate: (body) => {
        const errors = [];
        requiredText(body, "code", errors);
        requiredText(body, "name", errors);
        if (!ACCOUNT_TYPES.includes(body.type)) errors.push({ path: ["type"], message: "REQUIRED" });
        if (body.role && !ACCOUNT_ROLES.includes(body.role)) errors.push({ path: ["role"], message: "INVALID" });
        return errors;
      },
      isInUse: (row) => journal.some((entry) => entry.lines.some((line) => line.accountId === row.id)) || banks.some((bank) => bank.glAccountCode === row.code) || Boolean(row.role),
      guard: managerGuard,
    }),
    ...createMockCrud("/master/taxRates", taxRates, {
      searchFields: ["code", "name"],
      sortable: ["code", "name", "kind", "rate", "status"],
      validate: (body) => {
        const errors = [];
        requiredText(body, "code", errors);
        requiredText(body, "name", errors);
        if (!["vat", "wht"].includes(body.kind)) errors.push({ path: ["kind"], message: "REQUIRED" });
        if (!intOk(body.rate) || body.rate > 100) errors.push({ path: ["rate"], message: body.rate == null ? "REQUIRED" : "INVALID" });
        if (!["yes", "no"].includes(body.isDefault)) errors.push({ path: ["isDefault"], message: "REQUIRED" });
        if (body.isDefault === "yes" && body.kind === "wht") errors.push({ path: ["isDefault"], message: "INVALID" });
        return errors;
      },
      isInUse: (row) => [...invoices, ...bills].some((doc) => doc.taxRateId === row.id) || row.isDefault === "yes",
      guard: managerGuard,
    }),
    ...createMockCrud("/master/paymentMethods", methods, {
      searchFields: ["code", "name"],
      sortable: ["code", "name", "type", "status"],
      validate: (body) => {
        const errors = [];
        requiredText(body, "code", errors);
        requiredText(body, "name", errors);
        if (!["cash", "bank", "cheque"].includes(body.type)) errors.push({ path: ["type"], message: "REQUIRED" });
        return errors;
      },
      isInUse: (row) => [...receipts, ...payments].some((m) => m.methodId === row.id),
      guard: managerGuard,
    }),
    ...createMockCrud("/master/bankAccounts", banks, {
      searchFields: ["code", "name", "bankName", "accountNo"],
      sortable: ["code", "name", "bankName", "accountNo", "status"],
      validate: (body) => {
        const errors = [];
        requiredText(body, "code", errors);
        requiredText(body, "name", errors);
        requiredText(body, "bankName", errors);
        requiredText(body, "accountNo", errors);
        const account = accounts.find((row) => row.code === String(body.glAccountCode ?? "").trim());
        if (!account || account.type !== "asset") errors.push({ path: ["glAccountCode"], message: account ? "INVALID" : "REQUIRED" });
        return errors;
      },
      isInUse: (row) => [...receipts, ...payments].some((m) => m.bankAccountId === row.id),
      guard: managerGuard,
    }),
  };
  // reading is open to everybody in Accounting; and the rules that need the other rows: one account per system role, one default tax rate
  for (const key of Object.keys(masterRoutes)) {
    const handler = masterRoutes[key];
    if (key.startsWith("GET ")) {
      masterRoutes[key] = (context) => {
        readGuard(context.authorization);
        return handler({ ...context, authorization: INTERNAL_TOKEN }); // a system call: the list itself is only checked above
      };
    }
  }
  const withRules = (key, rule) => {
    const handler = masterRoutes[key];
    masterRoutes[key] = (context) => {
      managerGuard(context.authorization);
      rule(context);
      const result = handler(context);
      return result;
    };
  };
  const roleTaken = ({ body, params }) => {
    if (body.role && accounts.some((row) => row.role === body.role && row.status === "active" && row.id !== Number(params?.id))) throw new MockHttpError(409, "ROLE_TAKEN", "Another account already has this role");
  };
  withRules("POST /master/accounts", roleTaken);
  withRules("PUT /master/accounts/:id", roleTaken);
  const keepOneDefault = (handlerKey) => {
    const handler = masterRoutes[handlerKey];
    masterRoutes[handlerKey] = (context) => {
      const result = handler(context);
      const saved = result instanceof MockResponse ? result.data : result;
      if (saved?.isDefault === "yes") for (const row of taxRates) if (row.id !== saved.id) row.isDefault = "no";
      return result;
    };
  };
  keepOneDefault("POST /master/taxRates");
  keepOneDefault("PUT /master/taxRates/:id");
  Object.assign(routes, masterRoutes);

  // =========================================================================================================
  // Seed: invoices from the delivered delivery notes, bills from the posted goods receipts, their money and the journal
  // =========================================================================================================
  // The demo records exist only in the demo; the workflow test branch starts with none (docs/specs/f13-workflow-test.md)
  if (!EMPTY_SEED) {
  const SEED = "Mika Ono";
  function seedDoc(kind, { sourceId, date, status, by, byId, supplierInvoiceNo, remarks = "" }) {
    const k = KINDS[kind];
    const source = sourceLines(kind, sourceId);
    const party = k.partyOf({ partyId: source.partyId });
    const tax = taxRates[0];
    const doc = {
      id: kind === "ar" ? seq.inv++ : seq.bill++,
      number: nextNumber(k.docPrefix, date),
      date,
      dueDate: dueFrom(kind, party, date),
      partyId: source.partyId,
      sourceId,
      taxRateId: tax.id,
      taxRate: tax.rate,
      supplierInvoiceNo,
      remarks,
      lines: source.lines,
      status: "draft",
      createdById: byId,
      createdBy: by,
      log: [],
    };
    logEntry(doc, "created", "draft", by, null, at(date, "09:00"));
    k.docs.push(doc);
    if (status !== "draft") {
      postDocument(kind, doc, SEED, at(date, "10:00"));
      doc.status = k.approvedStatus;
      logEntry(doc, kind === "ar" ? "issue" : "bill-approve", k.approvedStatus, SEED, null, at(date, "10:00"));
    }
    return doc;
  }
  function seedMoney(kind, doc, { date, amount, bank = 1, method = 2, status = "confirmed", by, byId, reference = "", note }) {
    const k = KINDS[kind];
    const m = { id: kind === "ar" ? seq.rc++ : seq.pay++, number: nextNumber(k.moneyPrefix, date), date, docId: doc.id, amount, methodId: method, bankAccountId: methodOf(method).type === "cash" ? null : bank, reference, remarks: "", status: "draft", createdById: byId, createdBy: by, log: [] };
    logEntry(m, "created", "draft", by, `For ${doc.number}`, at(date, "13:00"));
    k.money.push(m);
    if (status === "confirmed") {
      postMoney(kind, m, SEED, at(date, "14:00"));
      m.status = "confirmed";
      logEntry(m, "money-confirm", "confirmed", SEED, null, at(date, "14:00"));
      refreshStatus(kind, doc, SEED, m.number, at(date, "14:00"));
    }
    if (status === "cancelled") {
      m.status = "cancelled";
      logEntry(m, "cancel", "cancelled", by, note, at(date, "15:00"));
    }
    return m;
  }
  // the capital at the start (a manual entry)
  writeEntry({ date: "2026-09-01", memo: "Capital paid in", reference: "Opening", lines: [{ accountId: accounts[1].id, debit: 5000000 }, { accountId: accounts[10].id, credit: 5000000 }], source: "manual", by: SEED, when: at("2026-09-01", "09:00") });
  const sale = getSale();
  const dn = (number) => sale.deliveries.find((row) => row.number === number).id;
  // 8 = Mika Ono (Accounting Manager), 9 = Sora Kato (Accounting Worker)
  const inv1 = seedDoc("ar", { sourceId: dn("DN-2026-0004"), date: "2026-09-05", status: "issued", by: "Sora Kato", byId: 9 });
  const inv2 = seedDoc("ar", { sourceId: dn("DN-2026-0001"), date: "2026-09-29", status: "issued", by: "Sora Kato", byId: 9 });
  const inv3 = seedDoc("ar", { sourceId: dn("DN-2026-0002"), date: "2026-10-04", status: "issued", by: "Sora Kato", byId: 9, remarks: "Wrong unit price" });
  seedMoney("ar", inv1, { date: "2026-09-30", amount: 200000, by: "Sora Kato", byId: 9, reference: "TR-0930" });
  seedMoney("ar", inv2, { date: "2026-10-02", amount: totalsOf(inv2).total, by: "Sora Kato", byId: 9, reference: "TR-1002" });
  reverseEntry(entryOf("INV", inv3), SEED, "Wrong unit price", at("2026-10-04", "16:00"));
  inv3.status = "cancelled";
  logEntry(inv3, "cancel", "cancelled", SEED, "Wrong unit price", at("2026-10-04", "16:00"));
  seedDoc("ar", { sourceId: dn("DN-2026-0002"), date: "2026-10-05", status: "issued", by: "Sora Kato", byId: 9 });
  seedMoney("ar", inv1, { date: "2026-10-06", amount: 100000, status: "draft", by: "Sora Kato", byId: 9, reference: "TR-1006" });

  const purchase = getPurchase();
  const gr = (number) => purchase.receipts.find((row) => row.number === number).id;
  const bill1 = seedDoc("ap", { sourceId: gr("GR-2026-0001"), date: "2026-09-11", status: "approved", by: "Sora Kato", byId: 9, supplierInvoiceNo: "CC-8801" });
  seedDoc("ap", { sourceId: gr("GR-2026-0002"), date: "2026-09-13", status: "approved", by: "Sora Kato", byId: 9, supplierInvoiceNo: "SC-5521" });
  seedDoc("ap", { sourceId: gr("GR-2026-0003"), date: "2026-10-02", status: "draft", by: "Sora Kato", byId: 9, supplierInvoiceNo: "SC-5530" });
  const bill4 = seedDoc("ap", { sourceId: gr("GR-2026-0004"), date: "2026-10-01", status: "approved", by: "Sora Kato", byId: 9, supplierInvoiceNo: "BC-9102" });
  seedMoney("ap", bill1, { date: "2026-09-30", amount: totalsOf(bill1).total, by: "Sora Kato", byId: 9, reference: "OUT-0930" });
  seedMoney("ap", bill4, { date: "2026-10-05", amount: 100000, by: "Sora Kato", byId: 9, reference: "OUT-1005" });

  }

  onAccounting?.({
    invoices,
    bills,
    receipts,
    payments,
    journal,
    // what the Dashboard needs
    overdueInvoices: () => invoices.filter((doc) => overdueDaysOf("ar", doc) > 0).map((doc) => ({ balance: totalsOf(doc).total - paidOf("ar", doc) })),
    unpaidBills: () =>
      bills
        .filter((doc) => isOpenStatus("ap", doc) && totalsOf(doc).total - paidOf("ap", doc) > 0)
        .map((doc) => ({ balance: totalsOf(doc).total - paidOf("ap", doc), dueDate: doc.dueDate })),
    drafts: () => [
      ...invoices.filter((doc) => doc.status === "draft").map((doc) => ({ type: "INVOICE", id: doc.id, number: doc.number, party: customerOf(doc.partyId)?.name, amountJpy: totalsOf(doc).total, createdAt: doc.log[0]?.at })),
      ...bills.filter((doc) => doc.status === "draft").map((doc) => ({ type: "BILL", id: doc.id, number: doc.number, party: supplierOf(doc.partyId)?.name, amountJpy: totalsOf(doc).total, createdAt: doc.log[0]?.at })),
    ],
    invoicesOfOrder: (orderId) => invoices.filter((doc) => getSale().deliveries.find((row) => row.id === doc.sourceId)?.saleOrderId === orderId).map((doc) => shapeDoc("ar", doc)),
    invoicesOfDelivery: (deliveryId) => invoices.filter((doc) => doc.sourceId === deliveryId).map((doc) => shapeDoc("ar", doc)),
    billsOfReceipt: (receiptId) => bills.filter((doc) => doc.sourceId === receiptId).map((doc) => shapeDoc("ap", doc)),
    billsOfOrder: (poId) => bills.filter((doc) => getPurchase().receipts.find((row) => row.id === doc.sourceId)?.poId === poId).map((doc) => shapeDoc("ap", doc)),
    inUse: (kind, id) => {
      if (kind === "customer") return invoices.some((doc) => doc.partyId === id);
      if (kind === "supplier") return bills.some((doc) => doc.partyId === id);
      if (kind === "product") return invoices.some((doc) => doc.lines.some((line) => line.itemId === id));
      if (kind === "material") return bills.some((doc) => doc.lines.some((line) => line.itemId === id));
      return false;
    },
  });
  return routes;
}
