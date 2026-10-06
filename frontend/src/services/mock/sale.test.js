// The Sale API as the app uses it, answered by the local mock (services/mock). Every test starts with a fresh mock
// (fresh data, numbers from the beginning) and signs in as a user first.
const USERS = {
  manager: { email: "alice@kanou.test", password: "alice1234" }, // Sale Manager
  worker: { email: "nina@kanou.test", password: "nina1234" }, // Sale Worker
  factory: { email: "ken@kanou.test", password: "ken12345" }, // Factory Worker: no access to Sale
};

async function start(who = "manager") {
  vi.resetModules();
  const { login } = await import("../auth.service.js");
  const { setToken } = await import("@/utils/session");
  const sale = await import("../sale.service.js");
  const { token } = await login(USERS[who]);
  setToken(token);
  return sale;
}

const line = (productId, qty, unitPrice) => ({ productId, qty, unitPrice, priceEdited: false });
const draft = (overrides = {}) => ({
  customerId: 1,
  date: "2026-10-06",
  validUntil: "2026-11-05",
  salesPersonId: null,
  remarks: "",
  lines: [line(1, 2, 68000), line(2, 1, 41005)],
  ...overrides,
});

/** The code the UI translates: what a failed call rejects with. */
const failure = async (promise) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("The call was expected to fail");
};

describe("quotations: creating", () => {
  it("numbers a new quotation and works out the totals with tax rounded down", async () => {
    const { quotationService } = await start();
    const first = await quotationService.create(draft());
    const second = await quotationService.create(draft());
    expect(first.number).toMatch(/^QT-2026-\d{4}$/);
    expect(Number(second.number.slice(-4))).toBe(Number(first.number.slice(-4)) + 1);
    expect(first.status).toBe("draft");
    expect(first.totals).toMatchObject({ subtotal: 177005, tax: 17700, total: 194705 });
  });

  it("refuses a quotation without lines", async () => {
    const { quotationService } = await start();
    const error = await failure(quotationService.create(draft({ lines: [] })));
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.status).toBe(400);
  });

  it("refuses a product twice, a quantity of 0 and a valid-until before the date", async () => {
    const { quotationService } = await start();
    expect((await failure(quotationService.create(draft({ lines: [line(1, 1, 100), line(1, 2, 100)] })))).code).toBe("VALIDATION_ERROR");
    expect((await failure(quotationService.create(draft({ lines: [line(1, 0, 100)] })))).code).toBe("VALIDATION_ERROR");
    expect((await failure(quotationService.create(draft({ validUntil: "2026-10-01" })))).code).toBe("VALIDATION_ERROR");
  });

  it("may only be changed or deleted while it is a draft", async () => {
    const { quotationService } = await start();
    const doc = await quotationService.create(draft());
    await quotationService.update(doc.id, draft({ remarks: "changed" }));
    await quotationService.run(doc.id, "send");
    expect((await failure(quotationService.update(doc.id, draft()))).code).toBe("INVALID_STATUS");
    expect((await failure(quotationService.remove(doc.id))).code).toBe("INVALID_STATUS");
  });
});

describe("quotations: status flow", () => {
  it("goes draft -> sent -> accepted and writes a history line for each step", async () => {
    const { quotationService } = await start();
    const doc = await quotationService.create(draft());
    await quotationService.run(doc.id, "send");
    const accepted = await quotationService.run(doc.id, "accept");
    expect(accepted.status).toBe("accepted");
    expect(accepted.history.map((entry) => entry.action)).toEqual(expect.arrayContaining(["created", "send", "accept"]));
  });

  it("does not accept a draft (409) and needs a note to reject", async () => {
    const { quotationService } = await start();
    const doc = await quotationService.create(draft());
    expect((await failure(quotationService.run(doc.id, "accept"))).code).toBe("INVALID_STATUS");
    await quotationService.run(doc.id, "send");
    expect((await failure(quotationService.run(doc.id, "reject", { note: "  " }))).code).toBe("VALIDATION_ERROR");
    const rejected = await quotationService.run(doc.id, "reject", { note: "Too expensive" });
    expect(rejected.status).toBe("rejected");
  });

  it("makes one draft sale order from an accepted quotation, and only one", async () => {
    const { quotationService, saleOrderService } = await start();
    const doc = await quotationService.create(draft());
    await quotationService.run(doc.id, "send");
    await quotationService.run(doc.id, "accept");
    const order = await quotationService.createOrder(doc.id);
    expect(order.status).toBe("draft");
    expect(order.customerId).toBe(1);
    expect(order.lines.map((l) => [l.productId, l.qty, l.unitPrice])).toEqual([[1, 2, 68000], [2, 1, 41005]]);
    expect((await saleOrderService.get(order.id)).quotationNumber).toBe(doc.number);
    expect((await failure(quotationService.createOrder(doc.id))).code).toBe("ALREADY_LINKED");
  });
});

describe("quotations: copy", () => {
  it("makes a new draft with a new number and the same customer and lines", async () => {
    const { quotationService } = await start();
    const doc = await quotationService.create(draft({ remarks: "Deliver in two parts" }));
    await quotationService.run(doc.id, "send");
    const copy = await quotationService.duplicate(doc.id);
    expect(copy.id).not.toBe(doc.id);
    expect(copy.number).not.toBe(doc.number);
    expect(copy.status).toBe("draft");
    expect(copy.customerId).toBe(doc.customerId);
    expect(copy.remarks).toBe("Deliver in two parts");
    expect(copy.lines.map((l) => [l.productId, l.qty, l.unitPrice])).toEqual(doc.lines.map((l) => [l.productId, l.qty, l.unitPrice]));
    expect(copy.history[copy.history.length - 1]).toMatchObject({ action: "created", note: `Copied from ${doc.number}` });
    // the original is untouched
    expect((await quotationService.get(doc.id)).status).toBe("sent");
  });

  it("gives the copy a valid-until 30 days after today", async () => {
    const { quotationService } = await start();
    const doc = await quotationService.create(draft());
    const copy = await quotationService.duplicate(doc.id);
    const days = (new Date(copy.validUntil) - new Date(copy.date)) / 86400000;
    expect(days).toBe(30);
  });
});

describe("lists", () => {
  it("counts the documents per status for the stepper and sums the totals of the whole filtered list", async () => {
    const { quotationService } = await start();
    const all = await quotationService.list({ pageSize: 100 });
    const { statusCounts, sums, total } = all.meta;
    expect(Object.values(statusCounts).reduce((a, b) => a + b, 0)).toBe(total);
    expect(sums.total).toBe(all.items.reduce((sum, row) => sum + row.totals.total, 0));

    // a status filter shrinks the list but not the counts, so the stepper still shows every step
    const sent = await quotationService.list({ status: "sent", pageSize: 100 });
    expect(sent.items.every((row) => row.status === "sent")).toBe(true);
    expect(sent.meta.total).toBe(statusCounts.sent);
    expect(sent.meta.statusCounts).toEqual(statusCounts);
  });

  it("sums over all pages, not only the page that is shown", async () => {
    const { quotationService } = await start();
    const everything = await quotationService.list({ pageSize: 100 });
    const firstPage = await quotationService.list({ pageSize: 5, page: 1 });
    expect(firstPage.items).toHaveLength(5);
    expect(firstPage.meta.total).toBe(everything.meta.total);
    expect(firstPage.meta.sums.total).toBe(everything.meta.sums.total);
  });

  it("filters by search text, customer and date range", async () => {
    const { quotationService } = await start();
    const byCustomer = await quotationService.list({ customer: 1, pageSize: 100 });
    expect(byCustomer.items.length).toBeGreaterThan(0);
    expect(byCustomer.items.every((row) => row.customerId === 1)).toBe(true);
    const byDate = await quotationService.list({ from: "2026-10-01", to: "2026-10-31", pageSize: 100 });
    expect(byDate.items.every((row) => row.date >= "2026-10-01" && row.date <= "2026-10-31")).toBe(true);
    const byText = await quotationService.list({ q: "QT-2026-0001", pageSize: 100 });
    expect(byText.items.map((row) => row.number)).toContain("QT-2026-0001");
  });
});

describe("search by product", () => {
  it("finds quotations by the code or the name of a product on their lines", async () => {
    const { quotationService } = await start();
    const doc = await quotationService.create(draft({ lines: [line(2, 1, 41005)] }));
    const product = doc.lines[0];

    const byCode = await quotationService.list({ q: product.productCode, pageSize: 100 });
    expect(byCode.items.map((row) => row.id)).toContain(doc.id);

    const byName = await quotationService.list({ q: product.productName.toLowerCase(), pageSize: 100 });
    expect(byName.items.map((row) => row.id)).toContain(doc.id);

    const nothing = await quotationService.list({ q: "no-such-product-zzz", pageSize: 100 });
    expect(nothing.items).toHaveLength(0);
    expect(nothing.meta.total).toBe(0);
  });

  it("keeps the product search together with the other filters", async () => {
    const { quotationService } = await start();
    const doc = await quotationService.create(draft({ customerId: 1, lines: [line(2, 1, 41005)] }));
    const code = doc.lines[0].productCode;
    const other = await quotationService.list({ q: code, customer: 999, pageSize: 100 });
    expect(other.items).toHaveLength(0);
    const same = await quotationService.list({ q: code, customer: 1, pageSize: 100 });
    expect(same.items.map((row) => row.id)).toContain(doc.id);
  });

  it("works for sale orders and delivery notes too", async () => {
    const { saleOrderService, deliveryNoteService } = await start();
    const orders = await saleOrderService.list({ pageSize: 100 });
    const code = orders.items[0].lines[0].productCode;
    const found = await saleOrderService.list({ q: code, pageSize: 100 });
    expect(found.items.length).toBeGreaterThan(0);
    expect(found.items.every((row) => row.lines.some((l) => l.productCode === code) || row.number.includes(code))).toBe(true);
    const notes = await deliveryNoteService.list({ q: code, pageSize: 100 });
    expect(notes.items.every((row) => row.lines.some((l) => l.productCode === code))).toBe(true);
  });
});

describe("roles", () => {
  it("keeps people outside the Sale department out (403)", async () => {
    const { quotationService } = await start("factory");
    expect((await failure(quotationService.list({}))).status).toBe(403);
  });

  it("lets a Worker ask for a confirmation but not approve; the Manager approves", async () => {
    const worker = await start("worker");
    const doc = await worker.quotationService.create(draft());
    await worker.quotationService.run(doc.id, "send");
    await worker.quotationService.run(doc.id, "accept");
    const order = await worker.quotationService.createOrder(doc.id);

    await worker.saleOrderService.run(order.id, "request-confirm", {});
    expect((await failure(worker.saleOrderService.run(order.id, "approve", {}))).status).toBe(403);

    const manager = await start("manager");
    // a fresh mock: the order made above is gone, so make one the Manager owns
    const mine = await manager.quotationService.create(draft());
    await manager.quotationService.run(mine.id, "send");
    await manager.quotationService.run(mine.id, "accept");
    const managerOrder = await manager.quotationService.createOrder(mine.id);
    const confirmed = await manager.saleOrderService.run(managerOrder.id, "approve", {});
    expect(confirmed.status).toBe("confirmed");
  });
});

describe("sale order and delivery", () => {
  async function readyOrder(sale) {
    const doc = await sale.quotationService.create(draft({ lines: [line(1, 10, 68000)] }));
    await sale.quotationService.run(doc.id, "send");
    await sale.quotationService.run(doc.id, "accept");
    const order = await sale.quotationService.createOrder(doc.id);
    for (const action of ["approve", "send-to-factory", "mark-ready"]) await sale.saleOrderService.run(order.id, action, {});
    return order;
  }

  it("follows draft -> confirmed -> in production -> ready to deliver", async () => {
    const sale = await start();
    const order = await readyOrder(sale);
    expect((await sale.saleOrderService.get(order.id)).status).toBe("ready_to_deliver");
  });

  it("delivers in parts: the order is delivered only when everything is delivered", async () => {
    const sale = await start();
    const order = await readyOrder(sale);
    const note = await sale.saleOrderService.createDeliveryNote(order.id);
    expect(note.lines[0].deliverNow).toBe(10);

    // too many pieces is refused, 4 is fine
    expect((await failure(sale.deliveryNoteService.update(note.id, { date: "2026-10-07", warehouseId: note.warehouseId, lines: [{ productId: 1, deliverNow: 11 }] }))).code).toBe("VALIDATION_ERROR");
    await sale.deliveryNoteService.update(note.id, { date: "2026-10-07", warehouseId: note.warehouseId, lines: [{ productId: 1, deliverNow: 4 }] });
    await sale.deliveryNoteService.run(note.id, "confirm", {});
    let current = await sale.saleOrderService.get(order.id);
    expect(current.status).toBe("ready_to_deliver");
    expect(current.lines[0].delivered).toBe(4);

    // the second note offers the 6 that are left
    const second = await sale.saleOrderService.createDeliveryNote(order.id);
    expect(second.lines[0].deliverNow).toBe(6);
    await sale.deliveryNoteService.run(second.id, "confirm", {});
    current = await sale.saleOrderService.get(order.id);
    expect(current.status).toBe("delivered");
    expect(current.lines[0].delivered).toBe(10);
  });
});
