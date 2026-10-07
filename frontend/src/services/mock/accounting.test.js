// The Accounting API as the app uses it, answered by the local mock. Every test starts with a fresh mock and signs in.
const USERS = {
  manager: { email: "mika@kanou.test", password: "mika1234" }, // Accounting Manager
  worker: { email: "sora@kanou.test", password: "sora1234" }, // Accounting Worker
  admin: { email: "admin@gmail.com", password: "admin" },
  purchase: { email: "hana@kanou.test", password: "hana1234" }, // Purchase Manager: no Accounting
  factory: { email: "yuki@kanou.test", password: "yuki1234" },
  sale: { email: "nina@kanou.test", password: "nina1234" },
  saleManager: { email: "alice@kanou.test", password: "alice1234" },
};

async function start(who = "manager") {
  vi.resetModules();
  const { login } = await import("../auth.service.js");
  const { setToken } = await import("@/utils/session");
  const accounting = await import("../accounting.service.js");
  const { simpleMasterServices } = await import("../simpleMaster.service.js");
  const sale = await import("../sale.service.js");
  const purchase = await import("../purchase.service.js");
  const { customerService } = await import("../customer.service.js");
  const { getDashboard } = await import("../dashboard.service.js");
  setToken((await login(USERS[who])).token);
  return { ...accounting, master: simpleMasterServices, sale, purchase, customerService, getDashboard };
}

async function switchTo(who) {
  const { login } = await import("../auth.service.js");
  const { setToken } = await import("@/utils/session");
  setToken((await login(USERS[who])).token);
}

const failure = async (promise) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("The call was expected to fail");
};
const all = { pageSize: 100 };
const byNumber = async (service, number) => (await service.list({ q: number, ...all })).items.find((row) => row.number === number);
const fields = (error) => error.details.map((item) => `${item.path.join(".")}:${item.message}`);
const today = () => new Date().toISOString().slice(0, 10);

/** The invoice of DN-2026-0002 is cancelled so that the note is free again: returns the free source. */
async function freeNote(a) {
  const inv = await byNumber(a.customerInvoiceService, "INV-2026-0004");
  await a.customerInvoiceService.run(inv.id, "cancel", { note: "Make it again" });
  return (await a.customerInvoiceService.sources())[0];
}
const newInvoice = async (a, overrides = {}) => {
  const source = await freeNote(a);
  return a.customerInvoiceService.create({ sourceId: source.id, date: "2026-10-07", taxRateId: 1, remarks: "", ...overrides });
};

describe("seeded invoices and bills", () => {
  it("has invoices from the delivered notes: partly paid and overdue, paid, cancelled, issued, with their balances", async () => {
    const a = await start();
    const { items, meta } = await a.customerInvoiceService.list({ sort: "number", ...all });
    expect(items.map((row) => [row.number, row.status, row.total, row.paid, row.balance])).toEqual([
      ["INV-2026-0001", "overdue", 508200, 200000, 308200],
      ["INV-2026-0002", "paid", 435600, 435600, 0],
      ["INV-2026-0003", "cancelled", 2238500, 0, 2238500],
      ["INV-2026-0004", "issued", 2238500, 0, 2238500],
    ]);
    expect(items[0]).toMatchObject({ storedStatus: "partially_paid", overdueDays: expect.any(Number), partyCode: "C001", deliveryNumber: "DN-2026-0004", saleOrderNumber: "SO-2026-0005", dueDate: "2026-10-05" });
    expect(meta.statusCounts).toEqual({ overdue: 1, paid: 1, cancelled: 1, issued: 1 });
    expect(meta.sums).toEqual({ total: 508200 + 435600 + 2238500 * 2, paid: 635600, balance: 308200 + 2238500 * 2 });
  });

  it("has bills from the posted goods receipts, with the supplier's invoice number", async () => {
    const a = await start();
    const { items, meta } = await a.supplierBillService.list({ sort: "number", ...all });
    expect(items.map((row) => [row.number, row.status, row.total, row.balance, row.receiptNumber])).toEqual([
      ["BILL-2026-0001", "paid", 418000, 0, "GR-2026-0001"],
      ["BILL-2026-0002", "approved", 118800, 118800, "GR-2026-0002"],
      ["BILL-2026-0003", "draft", 48400, 48400, "GR-2026-0003"],
      ["BILL-2026-0004", "partially_paid", 171600, 71600, "GR-2026-0004"],
    ]);
    expect(items[0]).toMatchObject({ supplierInvoiceNo: "CC-8801", poNumber: "PO-2026-0001", dueDate: "2026-10-11" });
    expect(meta.statusCounts).toEqual({ paid: 1, approved: 1, draft: 1, partially_paid: 1 });
  });

  it("has receipts and payments, and a balanced journal that the documents wrote", async () => {
    const a = await start();
    expect((await a.customerReceiptService.list({ sort: "number", ...all })).items.map((row) => [row.number, row.status, row.amount, row.methodName, row.bankAccountName])).toEqual([
      ["RC-2026-0001", "confirmed", 200000, "Bank transfer", "Main account"],
      ["RC-2026-0002", "confirmed", 435600, "Bank transfer", "Main account"],
      ["RC-2026-0003", "draft", 100000, "Bank transfer", "Main account"],
    ]);
    expect((await a.supplierPaymentService.list(all)).meta.total).toBe(2);
    const { items } = await a.journalService.list({ sort: "number", ...all });
    expect(items).toHaveLength(13);
    for (const entry of items) expect(entry.debit).toBe(entry.credit);
    expect(items.find((entry) => entry.memo === "Invoice INV-2026-0003").status).toBe("reversed");
    expect(items.filter((entry) => entry.source === "manual")).toHaveLength(1);
  });

  it("gives the ledger of one account with its balance", async () => {
    const a = await start();
    const receivable = (await a.master.accounts.list({ q: "receivable", ...all })).items[0];
    const result = await a.journalService.list({ account: receivable.id, ...all });
    expect(result.meta.account).toMatchObject({ code: "1200", debit: 5420800, credit: 2874100, balance: 2546700 });
    expect(result.items.every((entry) => entry.lines.some((line) => line.accountId === receivable.id))).toBe(true);
    const payable = (await a.master.accounts.list({ q: "payable", ...all })).items[0];
    expect((await a.journalService.list({ account: payable.id, ...all })).meta.account).toMatchObject({ code: "2100", balance: 118800 + 71600 });
  });
});

describe("who can open Accounting", () => {
  it("is for Accounting users and Admin; Factory, Purchase and Sale get 403", async () => {
    const a = await start("worker");
    expect((await a.customerInvoiceService.list(all)).meta.total).toBe(4);
    await switchTo("admin");
    expect((await a.customerInvoiceService.list(all)).meta.total).toBe(4);
    for (const who of ["factory", "purchase", "sale"]) {
      await switchTo(who);
      expect((await failure(a.customerInvoiceService.list(all))).status).toBe(403);
      expect((await failure(a.supplierBillService.list(all))).status).toBe(403);
      expect((await failure(a.journalService.list(all))).status).toBe(403);
      expect((await failure(a.master.accounts.list(all))).status).toBe(403);
    }
  });
});

describe("the accounting master", () => {
  it("has the chart with its system roles, the tax rates, the payment methods and the bank accounts", async () => {
    const a = await start("worker");
    const accounts = (await a.master.accounts.list({ sort: "code", ...all })).items;
    expect(accounts).toHaveLength(16);
    expect(Object.fromEntries(accounts.filter((row) => row.role).map((row) => [row.role, row.code]))).toEqual({ cash: "1100", receivable: "1200", raw_stock: "1300", input_tax: "1400", payable: "2100", output_tax: "2200", sales: "4100" });
    expect((await a.master.taxRates.list(all)).items.map((row) => [row.code, row.rate, row.isDefault])).toEqual(expect.arrayContaining([["VAT10", 10, "yes"], ["VAT8", 8, "no"], ["WHT10", 10, "no"]]));
    expect((await a.master.paymentMethods.list(all)).items).toHaveLength(3);
    expect((await a.master.bankAccounts.list(all)).items.map((row) => row.glAccountCode)).toEqual(["1110", "1115"]);
  });

  it("is changed by a Manager only", async () => {
    const a = await start("worker");
    const body = { code: "9000", name: "Misc", type: "expense", role: "" };
    expect((await failure(a.master.accounts.create(body))).status).toBe(403);
    await switchTo("manager");
    expect(await a.master.accounts.create(body)).toMatchObject({ code: "9000", status: "active" });
    expect((await failure(a.master.accounts.create({ ...body, name: "" }))).details).toEqual([{ path: ["name"], message: "REQUIRED" }]);
    expect((await failure(a.master.accounts.create(body))).code).toBe("CODE_ALREADY_EXISTS");
  });

  it("keeps one account per system role, one default tax rate, and does not delete what is used", async () => {
    const a = await start();
    expect((await failure(a.master.accounts.create({ code: "9100", name: "Second receivable", type: "asset", role: "receivable" }))).code).toBe("ROLE_TAKEN");
    const vat8 = (await a.master.taxRates.list({ q: "VAT8", ...all })).items[0];
    await a.master.taxRates.update(vat8.id, { code: "VAT8", name: "Reduced rate", kind: "vat", rate: 8, isDefault: "yes" });
    const rates = (await a.master.taxRates.list(all)).items;
    expect(rates.filter((row) => row.isDefault === "yes").map((row) => row.code)).toEqual(["VAT8"]);
    expect((await failure(a.master.taxRates.create({ code: "WHT5", name: "W", kind: "wht", rate: 5, isDefault: "yes" }))).details).toEqual([{ path: ["isDefault"], message: "INVALID" }]);
    const receivable = (await a.master.accounts.list({ q: "receivable", ...all })).items[0];
    expect((await failure(a.master.accounts.remove(receivable.id))).code).toBe("IN_USE");
    const bank = (await a.master.bankAccounts.list(all)).items[0];
    expect((await failure(a.master.bankAccounts.remove(bank.id))).code).toBe("IN_USE");
    expect((await failure(a.master.bankAccounts.create({ code: "BA-03", name: "X", bankName: "B", branch: "", accountNo: "1", glAccountCode: "4100" }))).details).toEqual([{ path: ["glAccountCode"], message: "INVALID" }]);
  });
});

describe("customer invoices", () => {
  it("lists the delivery notes that can still be invoiced, once", async () => {
    const a = await start();
    expect(await a.customerInvoiceService.sources()).toEqual([]); // all three delivered notes have an invoice
    const free = await freeNote(a);
    expect(free).toMatchObject({ number: "DN-2026-0002", ref: "SO-2026-0002" });
  });

  it("is made from a delivered note with its lines, due date from the payment terms and the default tax", async () => {
    const a = await start("worker");
    await switchTo("manager");
    const source = await freeNote(a);
    await switchTo("worker");
    const inv = await a.customerInvoiceService.create({ sourceId: source.id, date: "2026-10-07", taxRateId: 1, remarks: "" });
    expect(inv).toMatchObject({ number: "INV-2026-0005", status: "draft", dueDate: "2026-10-22", partyCode: "C003", subtotal: 2035000, tax: 203500, total: 2238500, createdBy: "Sora Kato", journalEntryId: null });
    expect(inv.lines.map((line) => [line.productCode, line.qty, line.unitPrice, line.amount])).toEqual([["RF-2D", 18, 67500, 1215000], ["RF-1D", 20, 41000, 820000]]);
    expect(inv.customerAccount).toMatchObject({ openBalance: 0, overLimit: false });
    expect((await failure(a.customerInvoiceService.create({ sourceId: source.id, date: "2026-10-07", taxRateId: 1 }))).details).toEqual([{ path: ["sourceId"], message: "ALREADY_USED" }]);
  });

  it("checks the form: tax rate, dates, quantity not above the delivered, price whole and not negative", async () => {
    const a = await start("manager");
    const source = await freeNote(a);
    const create = (extra) => a.customerInvoiceService.create({ sourceId: source.id, date: "2026-10-07", taxRateId: 1, ...extra });
    expect(fields(await failure(create({ taxRateId: 4 })))).toEqual(["taxRateId:REQUIRED"]); // a withholding rate is not a VAT rate
    expect(fields(await failure(create({ dueDate: "2026-09-01" })))).toEqual(["dueDate:DATE_ORDER"]);
    expect(fields(await failure(create({ lines: [{ itemId: 1, qty: 19, unitPrice: 1 }] })))).toEqual(["lines.0.qty:TOO_MANY"]);
    expect(fields(await failure(create({ lines: [{ itemId: 1, qty: 18, unitPrice: -1 }] })))).toEqual(["lines.0.unitPrice:INVALID"]);
    expect(fields(await failure(create({ lines: [{ itemId: 99, qty: 1, unitPrice: 1 }] })))).toEqual(["lines.0.itemId:INVALID", "lines:REQUIRED"]);
    expect(fields(await failure(create({ lines: [] })))).toEqual(["lines:REQUIRED"]);
    const corrected = await create({ lines: [{ itemId: 1, qty: 10, unitPrice: 60000 }, { itemId: 2, qty: 20, unitPrice: 41000 }] });
    expect(corrected).toMatchObject({ subtotal: 1420000, tax: 142000 });
  });

  it("is edited and deleted by its author or a Manager while a draft; issued by a Manager only, and the issue writes the journal entry", async () => {
    const a = await start("manager");
    const inv = await newInvoice(a);
    await switchTo("worker");
    expect((await failure(a.customerInvoiceService.run(inv.id, "issue"))).status).toBe(403);
    expect((await failure(a.customerInvoiceService.update(inv.id, { date: "2026-10-07", taxRateId: 1, remarks: "x" }))).status).toBe(403); // made by the Manager
    await switchTo("manager");
    expect(await a.customerInvoiceService.update(inv.id, { date: "2026-10-07", taxRateId: 2, remarks: "Reduced", lines: [{ itemId: 1, qty: 18, unitPrice: 67500 }] })).toMatchObject({ taxRatePercent: 8, tax: 97200, remarks: "Reduced" });
    const issued = await a.customerInvoiceService.run(inv.id, "issue");
    expect(issued).toMatchObject({ status: "issued", storedStatus: "issued" });
    expect((await failure(a.customerInvoiceService.update(inv.id, { date: "2026-10-07", taxRateId: 1 }))).code).toBe("INVALID_STATUS");
    const entry = await a.journalService.get(issued.journalEntryId);
    expect(entry).toMatchObject({ source: "auto", status: "posted", docNumber: issued.number, debit: 1312200, credit: 1312200 });
    expect(entry.lines.map((line) => [line.accountCode, line.debit, line.credit])).toEqual([["1200", 1312200, 0], ["4100", 0, 1215000], ["2200", 0, 97200]]);
  });

  it("is cancelled with a reason and the entry is reversed; refused once a receipt is confirmed; reverted by a Manager", async () => {
    const a = await start("manager");
    const inv = await newInvoice(a);
    await a.customerInvoiceService.run(inv.id, "issue");
    expect((await failure(a.customerInvoiceService.run(inv.id, "cancel"))).details).toEqual([{ path: ["note"], message: "REQUIRED" }]);
    const cancelled = await a.customerInvoiceService.run(inv.id, "cancel", { note: "Wrong customer" });
    expect(cancelled.status).toBe("cancelled");
    const entries = (await a.journalService.list({ q: inv.number, ...all })).items;
    expect(entries.map((entry) => entry.status).sort()).toEqual(["posted", "reversed"]);
    expect((await a.customerInvoiceService.sources()).map((row) => row.number)).toEqual(["DN-2026-0002"]); // the note is free again
    expect(await a.customerInvoiceService.run(inv.id, "revert", { note: "It was right" })).toMatchObject({ storedStatus: "issued" });
    const paid = await byNumber(a.customerInvoiceService, "INV-2026-0001");
    expect((await failure(a.customerInvoiceService.run(paid.id, "cancel", { note: "x" }))).code).toBe("INVALID_STATUS"); // a receipt is confirmed
  });

  it("refuses to issue when a system role has no account", async () => {
    const a = await start("manager");
    const inv = await newInvoice(a);
    const sales = (await a.master.accounts.list({ q: "Sales revenue", ...all })).items[0];
    await a.master.accounts.setStatus(sales.id, "inactive");
    const error = await failure(a.customerInvoiceService.run(inv.id, "issue"));
    expect(error.code).toBe("ACCOUNT_ROLE_MISSING");
    expect((await a.customerInvoiceService.get(inv.id)).storedStatus).toBe("draft");
  });
});

describe("customer receipts", () => {
  const receiptBody = (inv, extra = {}) => ({ docId: inv.id, date: today(), amount: inv.balance, methodId: 2, bankAccountId: 1, reference: "TR-1", remarks: "", ...extra });

  it("pays an invoice in parts and in full: the status follows, the entry debits the bank account", async () => {
    const a = await start("worker");
    const inv = await byNumber(a.customerInvoiceService, "INV-2026-0004");
    const first = await a.customerReceiptService.create(receiptBody(inv, { amount: 1000000 }));
    expect(first).toMatchObject({ status: "draft", docBalance: 2238500, partyCode: "C003" });
    expect((await a.customerInvoiceService.get(inv.id)).paid).toBe(0); // a draft is no money yet
    const confirmed = await a.customerReceiptService.run(first.id, "confirm");
    expect(confirmed.status).toBe("confirmed");
    expect(await a.customerInvoiceService.get(inv.id)).toMatchObject({ storedStatus: "partially_paid", paid: 1000000, balance: 1238500 });
    const entry = await a.journalService.get(confirmed.journalEntryId);
    expect(entry.lines.map((line) => [line.accountCode, line.debit, line.credit])).toEqual([["1110", 1000000, 0], ["1200", 0, 1000000]]);
    const second = await a.customerReceiptService.create(receiptBody(inv, { amount: 1238500, methodId: 1, bankAccountId: null }));
    await a.customerReceiptService.run(second.id, "confirm");
    expect(await a.customerInvoiceService.get(inv.id)).toMatchObject({ status: "paid", balance: 0 });
    const cash = await a.journalService.get((await a.customerReceiptService.get(second.id)).journalEntryId);
    expect(cash.lines.map((line) => line.accountCode)).toEqual(["1100", "1200"]); // cash goes to the cash account
  });

  it("refuses an amount above the balance (also when two drafts compete), a bank method without a bank account, and an invoice that is not open", async () => {
    const a = await start("worker");
    const inv = await byNumber(a.customerInvoiceService, "INV-2026-0004");
    expect(fields(await failure(a.customerReceiptService.create(receiptBody(inv, { amount: inv.balance + 1 }))))).toEqual(["amount:TOO_MANY"]);
    expect(fields(await failure(a.customerReceiptService.create(receiptBody(inv, { bankAccountId: null }))))).toEqual(["bankAccountId:REQUIRED"]);
    expect(fields(await failure(a.customerReceiptService.create(receiptBody(inv, { amount: 0 }))))).toEqual(["amount:INVALID"]);
    const paid = await byNumber(a.customerInvoiceService, "INV-2026-0002");
    expect(fields(await failure(a.customerReceiptService.create({ ...receiptBody(inv), docId: paid.id })))).toEqual(["docId:INVALID_STATUS", "amount:TOO_MANY"]);
    const one = await a.customerReceiptService.create(receiptBody(inv, { amount: 2000000 }));
    const two = await a.customerReceiptService.create(receiptBody(inv, { amount: 2000000 }));
    await a.customerReceiptService.run(one.id, "confirm");
    expect(fields(await failure(a.customerReceiptService.run(two.id, "confirm")))).toEqual(["amount:TOO_MANY"]);
    expect((await failure(a.customerReceiptService.run(one.id, "confirm"))).code).toBe("INVALID_STATUS"); // once
  });

  it("is cancelled: a draft by its author, a confirmed one by a Manager with a reason, which reverses the entry and reopens the invoice", async () => {
    const a = await start("worker");
    const inv = await byNumber(a.customerInvoiceService, "INV-2026-0004");
    const gr = await a.customerReceiptService.create(receiptBody(inv));
    await a.customerReceiptService.run(gr.id, "confirm");
    expect(await a.customerInvoiceService.get(inv.id)).toMatchObject({ status: "paid" });
    expect((await failure(a.customerReceiptService.run(gr.id, "cancel", { note: "x" }))).status).toBe(403);
    await switchTo("manager");
    expect((await failure(a.customerReceiptService.run(gr.id, "cancel"))).details).toEqual([{ path: ["note"], message: "REQUIRED" }]);
    await a.customerReceiptService.run(gr.id, "cancel", { note: "Bounced" });
    expect(await a.customerInvoiceService.get(inv.id)).toMatchObject({ storedStatus: "issued", paid: 0 });
    const entries = (await a.journalService.list({ q: gr.number, ...all })).items;
    expect(entries.map((entry) => entry.status).sort()).toEqual(["posted", "reversed"]);
  });
});

describe("supplier bills and payments", () => {
  it("makes a bill from a posted receipt at the PO price, approved by a Manager only, with Dr stock and Dr input tax / Cr payable", async () => {
    const a = await start("worker");
    const bill = await byNumber(a.supplierBillService, "BILL-2026-0003");
    expect((await failure(a.supplierBillService.run(bill.id, "approve"))).status).toBe(403);
    await switchTo("manager");
    const approved = await a.supplierBillService.run(bill.id, "approve");
    expect(approved.storedStatus).toBe("approved");
    const entry = await a.journalService.get(approved.journalEntryId);
    expect(entry.lines.map((line) => [line.accountCode, line.debit, line.credit])).toEqual([["1300", 44000, 0], ["1400", 4400, 0], ["2100", 0, 48400]]);
    expect(await a.supplierBillService.sources()).toEqual([]); // every posted receipt is billed
  });

  it("pays a bill: a Worker may make the payment, only a Manager confirms it", async () => {
    const a = await start("worker");
    const bill = await byNumber(a.supplierBillService, "BILL-2026-0002");
    const pay = await a.supplierPaymentService.create({ docId: bill.id, date: today(), amount: 118800, methodId: 2, bankAccountId: 2, reference: "OUT-1", remarks: "" });
    expect(pay).toMatchObject({ status: "draft", partyCode: "S002", docBalance: 118800 });
    expect((await failure(a.supplierPaymentService.run(pay.id, "confirm"))).status).toBe(403);
    await switchTo("manager");
    const confirmed = await a.supplierPaymentService.run(pay.id, "confirm");
    expect(await a.supplierBillService.get(bill.id)).toMatchObject({ status: "paid", balance: 0 });
    const entry = await a.journalService.get(confirmed.journalEntryId);
    expect(entry.lines.map((line) => [line.accountCode, line.debit, line.credit])).toEqual([["2100", 118800, 0], ["1115", 0, 118800]]);
    expect(fields(await failure(a.supplierPaymentService.create({ docId: bill.id, date: today(), amount: 1, methodId: 1 })))).toEqual(["docId:INVALID_STATUS", "amount:TOO_MANY"]);
  });

  it("cancels a draft bill with its draft payments, and keeps the supplier invoice number", async () => {
    const a = await start("manager");
    const bill = await byNumber(a.supplierBillService, "BILL-2026-0003");
    expect(bill.supplierInvoiceNo).toBe("SC-5530");
    expect(await a.supplierBillService.update(bill.id, { date: "2026-10-02", taxRateId: 1, remarks: "", supplierInvoiceNo: "SC-5531", lines: [{ itemId: 2, qty: 20, unitPrice: 2200 }] })).toMatchObject({ supplierInvoiceNo: "SC-5531" });
    expect((await a.supplierBillService.run(bill.id, "cancel")).status).toBe("cancelled");
    expect((await a.supplierBillService.sources()).map((row) => row.number)).toEqual(["GR-2026-0003"]);
  });
});

describe("manual journal entries", () => {
  const line = (accountId, debit, credit, memo = "") => ({ accountId, debit, credit, memo });
  it("is a draft until a Manager posts it, and only when it is balanced", async () => {
    const a = await start("worker");
    const utilities = (await a.master.accounts.list({ q: "Utilities", ...all })).items[0];
    const cash = (await a.master.accounts.list({ q: "Cash", ...all })).items[0];
    expect(fields(await failure(a.journalService.create({ date: "2026-10-07", memo: "Electricity", lines: [line(utilities.id, 5000, 0)] })))).toEqual(["lines:REQUIRED"]);
    expect(fields(await failure(a.journalService.create({ date: "2026-10-07", memo: "Electricity", lines: [line(utilities.id, 5000, 100), line(cash.id, 0, 5000)] })))).toEqual(["lines.0.debit:ONE_SIDE"]);
    const draft = await a.journalService.create({ date: "2026-10-07", memo: "Electricity", lines: [line(utilities.id, 5000, 0), line(cash.id, 0, 4000)] });
    expect(draft).toMatchObject({ status: "draft", source: "manual", debit: 5000, credit: 4000 });
    expect((await failure(a.journalService.run(draft.id, "post"))).status).toBe(403);
    await switchTo("manager");
    expect((await failure(a.journalService.run(draft.id, "post"))).code).toBe("NOT_BALANCED");
    await a.journalService.update(draft.id, { date: "2026-10-07", memo: "Electricity", lines: [line(utilities.id, 5000, 0), line(cash.id, 0, 5000)] });
    expect(await a.journalService.run(draft.id, "post")).toMatchObject({ status: "posted" });
    expect((await failure(a.journalService.update(draft.id, { date: "2026-10-07", memo: "x", lines: [] }))).code).toBe("INVALID_STATUS");
    expect((await failure(a.journalService.run(draft.id, "reverse"))).details).toEqual([{ path: ["note"], message: "REQUIRED" }]);
    await a.journalService.run(draft.id, "reverse", { note: "Booked twice" });
    const both = (await a.journalService.list({ q: draft.number, ...all })).items;
    expect(both.map((entry) => entry.status).sort()).toEqual(["posted", "reversed"]);
  });

  it("does not edit or delete an entry that the system wrote, and deletes a draft", async () => {
    const a = await start("manager");
    const auto = (await a.journalService.list({ q: "INV-2026-0002", ...all })).items.find((entry) => entry.source === "auto");
    expect((await failure(a.journalService.remove(auto.id))).code).toBe("INVALID_STATUS");
    expect((await failure(a.journalService.run(auto.id, "reverse", { note: "x" }))).code).toBe("INVALID_STATUS");
    const cash = (await a.master.accounts.list({ q: "Cash", ...all })).items[0];
    const draft = await a.journalService.create({ date: "2026-10-07", memo: "Test", lines: [line(cash.id, 10, 0), line(cash.id, 0, 10)] });
    await a.journalService.remove(draft.id);
    expect((await failure(a.journalService.get(draft.id))).status).toBe(404);
  });
});

describe("links with Sale, Purchase, master data and the Dashboard", () => {
  it("shows the invoice on the sale order and the delivery note, and the bill on the purchase order and the goods receipt", async () => {
    const a = await start("saleManager");
    const order = (await a.sale.saleOrderService.list({ q: "SO-2026-0005", ...all })).items[0];
    expect(order.links.find((link) => link.type === "invoice")).toMatchObject({ number: "INV-2026-0001", to: expect.stringMatching(/^\/accounting\/invoices\//) });
    const note = (await a.sale.deliveryNoteService.list({ q: "DN-2026-0002", ...all })).items[0];
    expect(note.links.filter((link) => link.type === "invoice").map((link) => link.number).sort()).toEqual(["INV-2026-0003", "INV-2026-0004"]);
    const po = (await a.purchase.purchaseOrderService.list({ q: "PO-2026-0001", ...all })).items[0];
    expect(po.links.find((link) => link.type === "supplierBill")).toMatchObject({ number: "BILL-2026-0001" });
    const gr = (await a.purchase.goodsReceiptService.list({ q: "GR-2026-0002", ...all })).items[0];
    expect(gr.links.find((link) => link.type === "supplierBill")).toMatchObject({ number: "BILL-2026-0002" });
  });

  it("does not delete a customer, a supplier, a product or a material that an invoice or a bill uses", async () => {
    const a = await start("admin");
    const customers = (await a.customerService.list({ q: "C003", ...all })).items[0];
    expect((await failure(a.customerService.remove(customers.id))).code).toBe("IN_USE");
  });

  it("makes the dashboard count the overdue invoices and the unpaid bills, and lists the drafts for the Manager", async () => {
    const a = await start("manager");
    const dashboard = await a.getDashboard();
    expect(dashboard.kpis.overdueInvoices).toEqual({ count: 1, amountJpy: 308200 });
    expect(dashboard.kpis.unpaidSupplierBills).toMatchObject({ count: 2, amountJpy: 118800 + 71600 });
    const approvals = dashboard.approvals.filter((item) => ["INVOICE", "BILL"].includes(item.type));
    expect(approvals).toEqual([expect.objectContaining({ type: "BILL", number: "BILL-2026-0003", amountJpy: 48400, department: "Accounting" })]);
  });
});
