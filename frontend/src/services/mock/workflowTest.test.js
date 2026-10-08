// The workflow test branch (docs/specs/f13-workflow-test.md): the mock starts with no business records, a user for every
// department, and counts the requests that wait for each department from the real documents.
const ACCOUNTS = ["admin@gmail.com", "sale.manager@kanou.test", "sale.worker@kanou.test", "factory.manager@kanou.test", "factory.worker@kanou.test", "purchase.manager@kanou.test", "purchase.worker@kanou.test", "accounting.manager@kanou.test", "accounting.worker@kanou.test"];

async function start() {
  vi.resetModules();
  vi.stubEnv("VITE_MOCK_SEED", "empty");
  const auth = await import("../auth.service.js");
  const { setToken } = await import("@/utils/session");
  const sale = await import("../sale.service.js");
  const { getNotifications } = await import("../notification.service.js");
  const { api } = await import("../api.js");
  const { getDashboard } = await import("../dashboard.service.js");
  const as = async (email) => {
    const { token } = await auth.login({ email, password: email === "admin@gmail.com" ? "admin" : "test1234" });
    setToken(token);
  };
  const counts = async () => Object.fromEntries(Object.entries((await getNotifications()).groups).map(([group, value]) => [group, value.total]));
  return { as, sale, api, counts, getNotifications, getDashboard };
}

afterEach(() => vi.unstubAllEnvs());

describe("an empty start", () => {
  it("has a user for every department, the master data, and no documents at all", async () => {
    const t = await start();
    await t.as("admin@gmail.com");
    const users = (await t.api.get("/admin/users", { params: { pageSize: 100 } })).data;
    expect(users.meta.total).toBe(9);
    expect(users.data.map((user) => user.email).sort()).toEqual([...ACCOUNTS].sort());
    for (const path of ["/sale/quotations", "/sale/orders", "/sale/deliveries", "/factory/work-orders", "/factory/transfers", "/purchase/orders", "/purchase/receipts", "/accounting/invoices", "/accounting/bills", "/accounting/journal", "/stock/movements", "/stock/adjustments", "/serials"]) {
      expect((await t.api.get(path)).data.meta.total, path).toBe(0);
    }
    // the master data is there, and the stock of every material starts at zero
    for (const path of ["/master/customers", "/master/suppliers", "/master/products", "/master/materials", "/master/machines", "/master/employees"]) {
      expect((await t.api.get(path)).data.meta.total, path).toBeGreaterThan(0);
    }
    const balances = (await t.api.get("/stock/balances", { params: { kind: "material", pageSize: 100 } })).data.data;
    expect(balances.every((row) => row.onHand === 0)).toBe(true);
    // the settings the system needs are there
    expect((await t.api.get("/master/uom")).data.meta.total).toBe(5);
    expect((await t.api.get("/master/warehouses")).data.meta.total).toBe(2);
    expect((await t.api.get("/master/accounts")).data.meta.total).toBeGreaterThan(5);
  });

  it("has Thai names for the people and the master data", async () => {
    const t = await start();
    await t.as("admin@gmail.com");
    const users = (await t.api.get("/admin/users", { params: { pageSize: 100 } })).data.data;
    expect(users.find((user) => user.email === "sale.manager@kanou.test").name).toBe("สมชาย ใจดี");
    expect(users.every((user) => /[ก-๙]/.test(user.name))).toBe(true);
    for (const path of ["/master/customers", "/master/suppliers", "/master/materials", "/master/products", "/master/machines", "/master/employees", "/master/accounts"]) {
      const { data } = (await t.api.get(path, { params: { pageSize: 100 } })).data;
      expect(data.every((row) => /[ก-๙]/.test(row.name)), path).toBe(true);
    }
  });

  it("shows no made-up numbers on the dashboard", async () => {
    const t = await start();
    await t.as("sale.manager@kanou.test");
    const dashboard = await t.getDashboard();
    expect(dashboard.kpis.openSaleOrders).toEqual({ count: 0, readyToDeliver: 0 });
    expect(dashboard.approvals).toEqual([]);
    expect(dashboard.production).toEqual([]);
    expect(dashboard.activity).toEqual([]);
  });

  it("lets the master data be added to, changed and deleted, and refuses to delete what a document uses", async () => {
    const t = await start();
    await t.as("admin@gmail.com");
    const before = (await t.api.get("/master/customers")).data.meta.total;
    const customer = { code: "C100", name: "New customer", taxId: "", address: "", contactPerson: "", contactPhone: "", contactEmail: "", paymentTerms: "NET_30", creditLimit: null };
    const created = (await t.api.post("/master/customers", customer)).data.data;
    expect((await t.api.put(`/master/customers/${created.id}`, { ...customer, name: "Changed" })).data.data.name).toBe("Changed");
    await t.api.delete(`/master/customers/${created.id}`);
    expect((await t.api.get("/master/customers")).data.meta.total).toBe(before);
    // the seeded customer C001 is not "in use" until a document uses it
    await t.api.delete("/master/customers/1");
    expect((await t.api.get("/master/customers")).data.meta.total).toBe(before - 1);
  });
});

describe("the request counters of the menu", () => {
  async function withOrder(t) {
    await t.as("sale.worker@kanou.test");
    const quotation = await t.sale.quotationService.create({ customerId: 1, date: "2026-10-08", validUntil: "2026-11-08", salesPersonId: null, remarks: "", lines: [{ productId: 1, qty: 2, unitPrice: 50000 }] });
    await t.sale.quotationService.run(quotation.id, "send", {});
    await t.sale.quotationService.run(quotation.id, "accept", {});
    return t.sale.quotationService.run(quotation.id, "create-order", {});
  }

  it("is zero everywhere at the start, and only for the departments of the user", async () => {
    const t = await start();
    await t.as("sale.worker@kanou.test");
    expect(await t.counts()).toEqual({ sale: 0 });
    await t.as("factory.manager@kanou.test");
    expect(await t.counts()).toEqual({ factory: 0, stock: 0 });
    await t.as("accounting.worker@kanou.test");
    expect(await t.counts()).toEqual({ accounting: 0 });
    await t.as("admin@gmail.com");
    expect(Object.keys(await t.counts()).sort()).toEqual(["accounting", "factory", "purchase", "sale", "stock"]);
  });

  it("counts a sale order that waits for a Manager for the Manager only, then moves the request to the Factory", async () => {
    const t = await start();
    const order = await withOrder(t);
    await t.sale.saleOrderService.run(order.id, "request-confirm", { note: "please" });
    expect(await t.counts()).toEqual({ sale: 0 }); // a Worker cannot decide it
    await t.as("sale.manager@kanou.test");
    expect((await t.getNotifications()).groups.sale.items.saleOrders).toBe(1);
    await t.sale.saleOrderService.run(order.id, "approve", {});
    expect(await t.counts()).toEqual({ sale: 0 });
    await t.sale.saleOrderService.run(order.id, "send-to-factory", {});
    await t.as("factory.worker@kanou.test");
    expect((await t.getNotifications()).groups.factory.items.workOrders).toBe(1); // an order line waits for a work order
    await t.as("admin@gmail.com");
    expect((await t.counts()).factory).toBe(1);
  });

  it("does not let an order be marked ready before its goods are in the warehouse, so the Factory still sees it waiting", async () => {
    const t = await start();
    const order = await withOrder(t);
    await t.sale.saleOrderService.run(order.id, "request-confirm", { note: "" });
    await t.as("sale.manager@kanou.test");
    await t.sale.saleOrderService.run(order.id, "approve", {});
    await t.sale.saleOrderService.run(order.id, "send-to-factory", {});
    let error;
    try {
      await t.sale.saleOrderService.run(order.id, "mark-ready", {});
    } catch (failure) {
      error = failure;
    }
    expect(error.code).toBe("NOT_READY");
    expect(error.details[0].items).toEqual([expect.objectContaining({ needed: 2, has: 0 })]);
    expect((await t.sale.saleOrderService.get(order.id)).status).toBe("in_production");
    await t.as("factory.worker@kanou.test");
    expect((await t.api.get("/factory/waiting-orders")).data.data).toHaveLength(1); // the order is still waiting for a work order
  });

  it("changes when a document changes (the dashboard counts the same order)", async () => {
    const t = await start();
    const order = await withOrder(t);
    await t.sale.saleOrderService.run(order.id, "request-confirm", { note: "" });
    await t.as("sale.manager@kanou.test");
    expect((await t.getDashboard()).approvals).toEqual([expect.objectContaining({ type: "SO", number: "SO-2026-0001", party: expect.any(String) })]);
    await t.sale.saleOrderService.run(order.id, "approve", {});
    expect((await t.getDashboard()).approvals).toEqual([]);
  });
});
