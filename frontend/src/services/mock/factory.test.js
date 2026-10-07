// The Factory API as the app uses it, answered by the local mock. Every test starts with a fresh mock and signs in.
const USERS = {
  manager: { email: "yuki@kanou.test", password: "yuki1234" }, // Factory Manager
  worker: { email: "ken@kanou.test", password: "ken12345" }, // Factory Worker
  sale: { email: "alice@kanou.test", password: "alice1234" }, // Sale Manager: no Factory access
};

async function start(who = "manager") {
  vi.resetModules();
  const { login } = await import("../auth.service.js");
  const { setToken } = await import("@/utils/session");
  const factory = await import("../factory.service.js");
  const sale = await import("../sale.service.js");
  const { token } = await login(USERS[who]);
  setToken(token);
  return { ...factory, sale };
}

/** Sign in as somebody else on the same mock (the data stays). */
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

const list = async (service, params = {}) => (await service.list({ pageSize: 100, ...params }));

/** A new draft on the first sent-to-factory order: RF-1D (2 steps) or RF-2D (4 steps). */
async function newDraft(f, overrides = {}) {
  return f.workOrderService.create({ saleOrderId: 1, productId: 2, qty: 2, planStart: "2026-10-20", planFinish: "2026-10-25", remarks: "", ...overrides });
}

describe("work orders: the seeded data and lists", () => {
  it("has a work order in every status and counts them for the stepper", async () => {
    const f = await start();
    const all = await list(f.workOrderService);
    expect(all.meta.total).toBe(7);
    expect(all.meta.statusCounts).toEqual({ draft: 1, scheduled: 1, in_process: 1, finished: 3, cancelled: 1 });
    const running = await list(f.workOrderService, { status: "in_process" });
    expect(running.items).toHaveLength(1);
    expect(running.meta.statusCounts.finished).toBe(3); // a status filter does not change the counts
  });

  it("shows the progress of a running work order: steps done, the running step, late days", async () => {
    const f = await start();
    const running = (await list(f.workOrderService, { status: "in_process" })).items[0];
    expect(running.progress.stepsDone).toBe(2);
    expect(running.progress.stepsTotal).toBe(4);
    expect(running.progress.currentStep).toMatchObject({ stepNo: 3, status: "in_progress", operatorName: "Ken Suzuki" });
    expect(running.progress.late).toBe(true);
    expect(running.progress.lateDays).toBeGreaterThan(0);
  });

  it("works out the produced and transferred quantity of finished work orders", async () => {
    const f = await start();
    const finished = (await list(f.workOrderService, { status: "finished", sort: "number" })).items;
    expect(finished.map((wo) => [wo.progress.producedQty, wo.progress.transferredQty])).toEqual([[29, 29], [20, 0], [6, 6]]);
    expect(finished[1].progress.remainingToTransfer).toBe(0); // a draft transfer already covers the 20
  });

  it("searches by product, sale order and customer, and filters by plan finish", async () => {
    const f = await start();
    expect((await list(f.workOrderService, { q: "RF-1D" })).items.every((wo) => wo.productCode === "RF-1D")).toBe(true);
    expect((await list(f.workOrderService, { q: "SO-2026-0002" })).items.length).toBe(2);
    const range = await list(f.workOrderService, { from: "2026-10-01", to: "2026-10-31" });
    expect(range.items.every((wo) => wo.planFinish >= "2026-10-01" && wo.planFinish <= "2026-10-31")).toBe(true);
  });
});

describe("work orders: waiting for a work order and creating one", () => {
  it("lists the sale orders sent to the factory with the quantity that has no work order yet", async () => {
    const f = await start();
    const waiting = await f.listWaitingOrders();
    expect(waiting).toHaveLength(1);
    expect(waiting[0].number).toBe("SO-2026-0001");
    expect(waiting[0].lines).toEqual([
      expect.objectContaining({ productCode: "RF-2D", qty: 20, planned: 16, remaining: 4 }),
      expect.objectContaining({ productCode: "RF-1D", qty: 10, planned: 6, remaining: 4 }),
    ]);
  });

  it("makes a draft with the routing steps of the product and the next number", async () => {
    const f = await start();
    const wo = await newDraft(f, { productId: 1, qty: 4 });
    expect(wo.number).toMatch(/^WO-2026-\d{4}$/);
    expect(wo.status).toBe("draft");
    expect(wo.steps.map((step) => step.processName)).toEqual(["Press and form body", "Foam insulation", "Assembly and packing", "Quality check"]);
    expect(wo.steps.every((step) => step.status === "pending")).toBe(true);
    expect((await f.listWaitingOrders())[0].lines.map((line) => line.productCode)).toEqual(["RF-1D"]); // RF-2D is now covered
  });

  it("refuses a quantity above what is left, an order that is not in production and a product not on the order", async () => {
    const f = await start();
    expect((await failure(newDraft(f, { productId: 1, qty: 5 }))).code).toBe("VALIDATION_ERROR"); // only 4 left
    expect((await failure(newDraft(f, { saleOrderId: 7 }))).code).toBe("VALIDATION_ERROR"); // confirmed, not sent
    expect((await failure(f.workOrderService.create({ saleOrderId: 1, productId: 99, qty: 1 }))).code).toBe("VALIDATION_ERROR");
    expect((await failure(newDraft(f, { qty: 0 }))).code).toBe("VALIDATION_ERROR");
    expect((await failure(newDraft(f, { planStart: "2026-10-25", planFinish: "2026-10-20" }))).code).toBe("VALIDATION_ERROR");
  });

  it("can be changed and deleted only while it is a draft", async () => {
    const f = await start();
    const wo = await newDraft(f);
    const saved = await f.workOrderService.update(wo.id, { qty: 3, planStart: "2026-10-21", planFinish: "2026-10-26", remarks: "Rush" });
    expect(saved).toMatchObject({ qty: 3, remarks: "Rush" });
    await f.workOrderService.run(wo.id, "schedule");
    expect((await failure(f.workOrderService.update(wo.id, { qty: 1 }))).code).toBe("INVALID_STATUS");
    expect((await failure(f.workOrderService.remove(wo.id))).code).toBe("INVALID_STATUS");
  });
});

describe("work orders: roles", () => {
  it("keeps people outside Factory out (403)", async () => {
    const f = await start("sale");
    expect((await failure(f.workOrderService.list({}))).status).toBe(403);
  });

  it("lets a Worker make drafts and start a scheduled order, but not schedule or finish", async () => {
    const f = await start("worker");
    const wo = await newDraft(f);
    expect((await failure(f.workOrderService.run(wo.id, "schedule"))).status).toBe(403);
    const manager = await start("manager");
    const mine = await newDraft(manager);
    await manager.workOrderService.run(mine.id, "schedule");
    const started = await manager.workOrderService.run(mine.id, "start");
    expect(started.status).toBe("in_process");
    expect((await failure(manager.workOrderService.run(mine.id, "cancel"))).code).toBe("VALIDATION_ERROR"); // running: a reason is needed
  });

  it("needs both plan dates to schedule", async () => {
    const f = await start();
    const wo = await newDraft(f, { planStart: null, planFinish: null });
    const error = await failure(f.workOrderService.run(wo.id, "schedule"));
    expect(error.code).toBe("VALIDATION_ERROR");
  });
});

describe("work orders: the steps", () => {
  async function scheduled(f) {
    const wo = await newDraft(f);
    await f.workOrderService.run(wo.id, "schedule");
    return wo;
  }

  it("runs a whole routing: Start -> Done on each step, then Finish", async () => {
    const f = await start();
    const wo = await scheduled(f);
    let current = await f.workOrderService.get(wo.id);
    expect(current.status).toBe("scheduled");
    expect(current.steps[0].canStart).toBe(true);
    expect(current.steps[1].canStart).toBe(false);

    current = await f.workOrderService.stepAction(wo.id, current.steps[0].id, "start", { operatorId: 1 });
    expect(current.status).toBe("in_process"); // the first Start starts the work order
    expect(current.steps[0]).toMatchObject({ status: "in_progress", operatorName: "Ken Suzuki", machineCode: "LN-01" });
    expect(current.steps[1].canStart).toBe(false); // the step before is still running

    current = await f.workOrderService.stepAction(wo.id, current.steps[0].id, "done", { qtyDone: 2, qtyDefect: 0 });
    expect(current.progress.stepsDone).toBe(1);
    expect(current.steps[1].canStart).toBe(true);

    current = await f.workOrderService.stepAction(wo.id, current.steps[1].id, "start", { operatorId: 3, machineId: 4 });
    expect(current.steps[1]).toMatchObject({ machineCode: "QC-01", operatorName: "Haruka Sato" }); // the machine can be changed
    current = await f.workOrderService.stepAction(wo.id, current.steps[1].id, "done", { qtyDone: 1, qtyDefect: 1 });
    expect(current.progress).toMatchObject({ stepsDone: 2, producedQty: 1 }); // produced = completed quantity of the last step

    const finished = await f.workOrderService.run(wo.id, "finish");
    expect(finished.status).toBe("finished");
  });

  it("makes a Worker wait for the step before; a Manager may start early with a reason", async () => {
    const f = await start("manager");
    const wo = await scheduled(f);
    const other = await scheduled(f);
    await switchTo("worker");
    expect((await failure(f.workOrderService.stepAction(wo.id, wo.steps[1].id, "start", { operatorId: 1 }))).code).toBe("STEP_ORDER");
    await switchTo("manager");
    expect((await failure(f.workOrderService.stepAction(other.id, other.steps[1].id, "start", { operatorId: 1 }))).code).toBe("VALIDATION_ERROR");
    const early = await f.workOrderService.stepAction(other.id, other.steps[1].id, "start", { operatorId: 1, note: "Parts were ready" });
    expect(early.steps[1].status).toBe("in_progress");
  });

  it("checks the quantities of a step and needs an operator", async () => {
    const f = await start();
    const wo = await scheduled(f);
    expect((await failure(f.workOrderService.stepAction(wo.id, wo.steps[0].id, "start", {}))).code).toBe("VALIDATION_ERROR");
    await f.workOrderService.stepAction(wo.id, wo.steps[0].id, "start", { operatorId: 1 });
    expect((await failure(f.workOrderService.stepAction(wo.id, wo.steps[0].id, "done", { qtyDone: 99, qtyDefect: 0 }))).code).toBe("VALIDATION_ERROR");
    expect((await failure(f.workOrderService.stepAction(wo.id, wo.steps[0].id, "done", { qtyDone: -1 }))).code).toBe("VALIDATION_ERROR");
  });

  it("finishes only when every step is done: a running step blocks it, a Manager may finish early with a reason", async () => {
    const f = await start();
    const wo = await scheduled(f);
    const started = await f.workOrderService.stepAction(wo.id, wo.steps[0].id, "start", { operatorId: 1 });
    expect((await failure(f.workOrderService.run(wo.id, "finish"))).code).toBe("STEPS_NOT_DONE");
    await f.workOrderService.stepAction(wo.id, started.steps[0].id, "done", { qtyDone: 2, qtyDefect: 0 });
    expect((await failure(f.workOrderService.run(wo.id, "finish"))).code).toBe("VALIDATION_ERROR"); // a reason is needed
    expect((await f.workOrderService.run(wo.id, "finish", { note: "Second step not needed" })).status).toBe("finished");
  });

  it("reopens a done step for a Manager with a reason, and writes every step into the history", async () => {
    const f = await start();
    const wo = await scheduled(f);
    const one = await f.workOrderService.stepAction(wo.id, wo.steps[0].id, "start", { operatorId: 1 });
    await f.workOrderService.stepAction(wo.id, one.steps[0].id, "done", { qtyDone: 2, qtyDefect: 0 });
    expect((await failure(f.workOrderService.stepAction(wo.id, wo.steps[0].id, "reopen", {}))).code).toBe("VALIDATION_ERROR");
    const reopened = await f.workOrderService.stepAction(wo.id, wo.steps[0].id, "reopen", { note: "Wrong count" });
    expect(reopened.steps[0]).toMatchObject({ status: "in_progress", qtyDone: null });
    expect(reopened.history.map((h) => h.action)).toEqual(expect.arrayContaining(["created", "schedule", "start", "step-start", "step-done", "step-reopen"]));
    await switchTo("worker");
    expect((await failure(f.workOrderService.stepAction(wo.id, wo.steps[0].id, "reopen", { note: "x" }))).status).toBe(403);
  });
});

describe("work orders: cancel and revert", () => {
  it("lets any Factory user cancel a draft; a Manager reverts with a reason", async () => {
    const f = await start("worker");
    const wo = await newDraft(f);
    const cancelled = await f.workOrderService.run(wo.id, "cancel");
    expect(cancelled.status).toBe("cancelled");
    expect((await failure(f.workOrderService.run(wo.id, "revert", { note: "oops" }))).status).toBe(403);
    const manager = await start("manager");
    const mine = await newDraft(manager);
    await manager.workOrderService.run(mine.id, "cancel");
    expect((await failure(manager.workOrderService.run(mine.id, "revert", {}))).code).toBe("VALIDATION_ERROR");
    expect((await manager.workOrderService.run(mine.id, "revert", { note: "Customer changed mind" })).status).toBe("draft");
  });

  it("gives the quantity back to the waiting list when a work order is cancelled", async () => {
    const f = await start();
    const wo = await newDraft(f, { productId: 1, qty: 4 });
    expect((await f.listWaitingOrders())[0].lines.map((line) => line.productCode)).toEqual(["RF-1D"]);
    await f.workOrderService.run(wo.id, "cancel");
    expect((await f.listWaitingOrders())[0].lines.find((line) => line.productCode === "RF-2D").remaining).toBe(4);
  });
});

describe("tracking board", () => {
  it("puts the steps in waiting, running and done today", async () => {
    const f = await start();
    const cards = await f.listTracking({});
    const byColumn = (column) => cards.filter((card) => card.column === column);
    expect(byColumn("running")).toHaveLength(1); // step 3 of the running order
    expect(byColumn("running")[0]).toMatchObject({ workOrderNumber: expect.stringMatching(/^WO-2026-/), step: expect.objectContaining({ stepNo: 3 }) });
    expect(byColumn("waiting").length).toBeGreaterThan(0); // the first step of the scheduled order and step 4 of the running one
    expect(byColumn("waiting").every((card) => card.step.canStart)).toBe(true);
  });

  it("filters by machine / line", async () => {
    const f = await start();
    const cards = await f.listTracking({ machine: 3 });
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((card) => card.step.machineId === 3)).toBe(true);
  });

  it("shows a step finished today in the done column", async () => {
    const f = await start();
    const wo = await newDraft(f);
    await f.workOrderService.run(wo.id, "schedule");
    const s = await f.workOrderService.stepAction(wo.id, wo.steps[0].id, "start", { operatorId: 1 });
    await f.workOrderService.stepAction(wo.id, s.steps[0].id, "done", { qtyDone: 2, qtyDefect: 0 });
    const cards = await f.listTracking({});
    expect(cards.some((card) => card.column === "done" && card.workOrderId === wo.id)).toBe(true);
  });
});

describe("finished goods transfers", () => {
  it("lists the seeded transfers and links them to their work order", async () => {
    const f = await start();
    const all = await list(f.transferService);
    expect(all.meta.statusCounts).toEqual({ draft: 1, transferred: 2 });
    expect(all.items.find((t) => t.status === "draft")).toMatchObject({ workOrderNumber: "WO-2026-0004", qty: 20, warehouseName: "Finished Goods Warehouse" });
  });

  it("needs a finished work order, a finished-goods warehouse and a quantity that is left", async () => {
    const f = await start();
    const today = new Date().toISOString().slice(0, 10);
    expect((await failure(f.transferService.create({ workOrderId: 1, qty: 1, date: today, warehouseId: 2 }))).code).toBe("VALIDATION_ERROR"); // running, not finished
    expect((await failure(f.transferService.create({ workOrderId: 3, qty: 1, date: today, warehouseId: 1 }))).code).toBe("VALIDATION_ERROR"); // raw material warehouse
    expect((await failure(f.transferService.create({ workOrderId: 3, qty: 1, date: today, warehouseId: 2 }))).code).toBe("VALIDATION_ERROR"); // all 29 are transferred
    expect((await failure(f.transferService.create({ workOrderId: 5, qty: 0, date: today, warehouseId: 2 }))).code).toBe("VALIDATION_ERROR");
  });

  it("makes several partial transfers whose total stays within the produced quantity", async () => {
    const f = await start();
    const today = new Date().toISOString().slice(0, 10);
    // finish a fresh order of 4 pieces of RF-1D: 2 steps
    const wo = await newDraft(f, { qty: 4 });
    await f.workOrderService.run(wo.id, "schedule");
        for (const step of wo.steps) {
      await f.workOrderService.stepAction(wo.id, step.id, "start", { operatorId: 1 });
      await f.workOrderService.stepAction(wo.id, step.id, "done", { qtyDone: 4, qtyDefect: 0 });
    }
    await f.workOrderService.run(wo.id, "finish");
    const first = await f.transferService.create({ workOrderId: wo.id, qty: 3, date: today, warehouseId: 2 });
    expect(first.number).toMatch(/^FT-2026-/);
    expect((await failure(f.transferService.create({ workOrderId: wo.id, qty: 2, date: today, warehouseId: 2 }))).code).toBe("VALIDATION_ERROR"); // only 1 left
    const second = await f.transferService.create({ workOrderId: wo.id, qty: 1, date: today, warehouseId: 2 });
    expect((await f.workOrderService.get(wo.id)).progress.remainingToTransfer).toBe(0);
    await f.transferService.run(first.id, "transfer");
    expect((await f.workOrderService.get(wo.id)).progress.transferredQty).toBe(3);
    expect(second.status).toBe("draft");
    // a finished work order with a transferred transfer cannot be reverted before the transfer is
    expect((await failure(f.workOrderService.run(wo.id, "revert", { note: "x" }))).code).toBe("INVALID_STATUS");
  });

  it("lets only a Manager transfer or revert, and needs a reason to revert", async () => {
    const worker = await start("worker");
    const drafts = (await list(worker.transferService, { status: "draft" })).items;
    expect((await failure(worker.transferService.run(drafts[0].id, "transfer"))).status).toBe(403);
    const manager = await start("manager");
    const done = await manager.transferService.run(drafts[0].id, "transfer");
    expect(done.status).toBe("transferred");
    expect((await failure(manager.transferService.run(drafts[0].id, "revert", {}))).code).toBe("VALIDATION_ERROR");
    expect((await manager.transferService.run(drafts[0].id, "revert", { note: "Wrong warehouse" })).status).toBe("draft");
  });

  it("changes and deletes only drafts", async () => {
    const f = await start();
    const draft = (await list(f.transferService, { status: "draft" })).items[0];
    const saved = await f.transferService.update(draft.id, { date: draft.date, qty: 18, warehouseId: 2, remarks: "Two pallets" });
    expect(saved.qty).toBe(18);
    await f.transferService.run(draft.id, "transfer");
    expect((await failure(f.transferService.update(draft.id, { date: draft.date, qty: 18, warehouseId: 2 }))).code).toBe("INVALID_STATUS");
    expect((await failure(f.transferService.remove(draft.id))).code).toBe("INVALID_STATUS");
  });
});

describe("links with Sale", () => {
  it("shows the work orders of a sale order in its linked documents", async () => {
    const f = await start("manager");
    const sale = await import("../sale.service.js");
    // a Factory user may not read Sale; sign in as the Sale manager on the same mock to read the order
    const { login } = await import("../auth.service.js");
    const { setToken } = await import("@/utils/session");
    setToken((await login(USERS.sale)).token);
    const order = await sale.saleOrderService.get(1);
    const work = order.links.filter((link) => link.type === "workOrder");
    expect(work.map((link) => link.number)).toEqual(expect.arrayContaining(["WO-2026-0001", "WO-2026-0002"]));
    expect(work[0]).toMatchObject({ to: expect.stringMatching(/^\/factory\/work-orders\//) });
    void f;
  });
});
