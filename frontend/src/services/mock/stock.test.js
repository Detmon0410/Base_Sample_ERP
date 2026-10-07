// The Stock API as the app uses it, answered by the local mock. Every test starts with a fresh mock and signs in.
const USERS = {
  manager: { email: "yuki@kanou.test", password: "yuki1234" }, // Factory Manager
  worker: { email: "ken@kanou.test", password: "ken12345" }, // Factory Worker
  purchase: { email: "hana@kanou.test", password: "hana1234" }, // Purchase Manager
  sale: { email: "nina@kanou.test", password: "nina1234" }, // Sale Worker: no Stock access
  admin: { email: "admin@gmail.com", password: "admin" },
  saleManager: { email: "alice@kanou.test", password: "alice1234" }, // Sale Manager and Purchase Worker
};

async function start(who = "manager") {
  vi.resetModules();
  const { login } = await import("../auth.service.js");
  const { setToken } = await import("@/utils/session");
  const stock = await import("../stock.service.js");
  const factory = await import("../factory.service.js");
  const sale = await import("../sale.service.js");
  const master = await import("../material.service.js");
  setToken((await login(USERS[who])).token);
  return { ...stock, factory, sale, master };
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
const onHandOf = async (s, kind, code) => (await s.balanceService.list({ kind, q: code, ...all })).items.find((row) => row.code === code).onHand;

describe("balances: the overview", () => {
  it("lists the materials in the raw material warehouse with the numbers of the demo and the status rule", async () => {
    const s = await start();
    const { items, meta } = await s.balanceService.list({ kind: "material", sort: "code", ...all });
    expect(items.map((row) => [row.code, row.onHand, row.status])).toEqual([
      ["COMP", 35, "normal"],
      ["DOOR", 18, "shortage"],
      ["FOAM", 450, "normal"],
      ["SHELF", 300, "normal"],
      ["STEEL", 210, "near_shortage"],
      ["THERMO", 25, "shortage"],
    ]);
    expect(items.every((row) => row.warehouseCode === "WH-R")).toBe(true);
    expect(meta.statusCounts).toEqual({ normal: 3, shortage: 2, near_shortage: 1 });
  });

  it("lists the products in the finished goods warehouse, filters by status and searches", async () => {
    const s = await start();
    const products = await s.balanceService.list({ kind: "product", sort: "code", ...all });
    expect(products.items.map((row) => [row.code, row.onHand, row.status, row.warehouseCode])).toEqual([
      ["RF-1D", 25, "in_stock", "WH-F"],
      ["RF-2D", 40, "in_stock", "WH-F"],
    ]);
    const short = await s.balanceService.list({ kind: "material", status: "shortage", ...all });
    expect(short.items.map((row) => row.code).sort()).toEqual(["DOOR", "THERMO"]);
    expect((await s.balanceService.list({ kind: "material", q: "steel", ...all })).items).toHaveLength(1);
  });

  it("keeps the on-hand number of the material master data equal to the stock", async () => {
    const s = await start();
    const { items } = await s.master.materialService.list(all);
    expect(Object.fromEntries(items.map((row) => [row.code, row.onHand]))).toMatchObject({ COMP: 35, DOOR: 18, STEEL: 210 });
  });

  it("opens an item with its warehouses, last movements and the products that use a material", async () => {
    const s = await start();
    const comp = (await s.balanceService.list({ kind: "material", q: "COMP", ...all })).items[0];
    const item = await s.getStockItem("material", comp.itemId);
    expect(item).toMatchObject({ code: "COMP", onHand: 35, status: "normal" });
    expect(item.byWarehouse).toEqual([expect.objectContaining({ code: "WH-R", onHand: 35 })]);
    expect(item.lastMovements.length).toBeGreaterThan(3);
    expect(item.usedIn.map((row) => row.code).sort()).toEqual(["RF-1D", "RF-2D"]);
  });
});

describe("movements: the ledger", () => {
  it("is the sum of its lines: every item ends on its balance and never goes below zero on the way", async () => {
    const s = await start();
    const { items } = await s.movementService.list({ sort: "at", ...all });
    const rows = [...items].sort((a, b) => a.at.localeCompare(b.at) || a.id - b.id);
    const last = new Map();
    for (const row of rows) {
      expect(row.balanceAfter).toBeGreaterThanOrEqual(0);
      last.set(`${row.itemType}-${row.itemId}-${row.warehouseId}`, row.balanceAfter);
    }
    for (const kind of ["material", "product"]) {
      for (const balance of (await s.balanceService.list({ kind, ...all })).items) {
        expect(last.get(`${kind}-${balance.itemId}-${balance.warehouseId}`)).toBe(balance.onHand);
      }
    }
  });

  it("has every type with the document it came from, newest first by default", async () => {
    const s = await start();
    const { items } = await s.movementService.list(all);
    expect(new Set(items.map((row) => row.type))).toEqual(new Set(["opening", "receipt", "consume", "produce", "deliver", "adjust"]));
    expect(items[0].at >= items[items.length - 1].at).toBe(true);
    const consume = items.find((row) => row.type === "consume");
    expect(consume).toMatchObject({ docType: "WO" });
    expect(consume.qty).toBeLessThan(0);
    expect(items.find((row) => row.type === "produce").docNumber).toMatch(/^FT-/);
    expect(items.find((row) => row.type === "deliver").docNumber).toMatch(/^DN-/);
    expect(items.find((row) => row.type === "receipt").docNumber).toMatch(/^GR-/);
  });

  it("filters by type, kind, warehouse, item, document number and date", async () => {
    const s = await start();
    expect((await s.movementService.list({ type: "receipt", ...all })).items).toHaveLength(3);
    expect((await s.movementService.list({ kind: "product", ...all })).items.every((row) => row.itemType === "product")).toBe(true);
    expect((await s.movementService.list({ q: "GR-2026-0002", ...all })).items).toHaveLength(1);
    const comp = (await s.balanceService.list({ kind: "material", q: "COMP", ...all })).items[0];
    const mine = await s.movementService.list({ item: `material-${comp.itemId}`, ...all });
    expect(mine.items.every((row) => row.itemCode === "COMP")).toBe(true);
    expect((await s.movementService.list({ from: "2026-10-02", to: "2026-10-02", ...all })).items.every((row) => row.at.startsWith("2026-10-02"))).toBe(true);
  });
});

describe("who can open Stock", () => {
  it("is open to Factory and Purchase users, and to nobody else", async () => {
    const s = await start("worker");
    expect((await s.balanceService.list(all)).meta.total).toBe(6);
    await switchTo("purchase");
    expect((await s.balanceService.list(all)).meta.total).toBe(6);
    await switchTo("sale");
    expect((await failure(s.balanceService.list(all))).status).toBe(403);
    expect((await failure(s.movementService.list(all))).status).toBe(403);
  });
});

describe("links with Factory and Sale", () => {
  it("issues the materials when a work order starts and takes them back when it is reverted", async () => {
    const s = await start();
    const scheduled = (await s.factory.workOrderService.list({ status: "scheduled", ...all })).items[0]; // RF-1D x 6
    await s.factory.workOrderService.run(scheduled.id, "start");
    expect(await onHandOf(s, "material", "DOOR")).toBe(12); // 1 per unit
    expect(await onHandOf(s, "material", "COMP")).toBe(29);
    expect(await onHandOf(s, "material", "STEEL")).toBe(162); // 8 per unit
    const moves = (await s.movementService.list({ q: scheduled.number, ...all })).items;
    expect(moves.every((row) => row.type === "consume" && row.qty < 0)).toBe(true);
    expect((await s.master.materialService.list({ q: "DOOR", ...all })).items[0].onHand).toBe(12);

    await s.factory.workOrderService.run(scheduled.id, "revert", { note: "Wrong click" });
    expect(await onHandOf(s, "material", "DOOR")).toBe(18);
    expect(await onHandOf(s, "material", "STEEL")).toBe(210);
    const again = (await s.movementService.list({ q: scheduled.number, ...all })).items;
    expect(again.filter((row) => row.qty > 0 && row.type === "consume")).toHaveLength(5);
  });

  it("refuses to start a work order when a material is short and lists what is missing", async () => {
    const s = await start();
    const draft = (await s.factory.workOrderService.list({ status: "draft", ...all })).items[0]; // RF-2D x 4: 4 thermostats
    await s.factory.workOrderService.update(draft.id, { saleOrderId: draft.saleOrderId, productId: draft.productId, qty: draft.qty, planStart: "2026-10-20", planFinish: "2026-10-25", remarks: "" });
    await s.factory.workOrderService.run(draft.id, "schedule");
    const thermo = (await s.balanceService.list({ kind: "material", q: "THERMO", ...all })).items[0];
    const adj = await s.adjustmentService.create({ itemType: "material", itemId: thermo.itemId, warehouseId: thermo.warehouseId, countedQty: 2, reason: "lost", remarks: "", date: "2026-10-07" });
    await s.adjustmentService.run(adj.id, "request");
    await switchTo("purchase");
    await s.adjustmentService.run(adj.id, "approve");
    expect(await onHandOf(s, "material", "THERMO")).toBe(2);

    await switchTo("manager");
    const error = await failure(s.factory.workOrderService.run(draft.id, "start"));
    expect(error.status).toBe(409);
    expect(error.code).toBe("NOT_ENOUGH_STOCK");
    expect(error.details[0].items).toEqual([expect.objectContaining({ code: "THERMO", needed: 4, has: 2 })]);
    expect((await s.factory.workOrderService.get(draft.id)).status).toBe("scheduled");
    expect(await onHandOf(s, "material", "DOOR")).toBe(18); // nothing was booked
  });

  it("returns the materials of a running work order that is cancelled", async () => {
    const s = await start();
    const running = (await s.factory.workOrderService.list({ status: "in_process", ...all })).items[0];
    await s.factory.workOrderService.run(running.id, "cancel", { note: "Customer stopped it" });
    expect(await onHandOf(s, "material", "COMP")).toBe(47); // 12 compressors come back
    expect(await onHandOf(s, "material", "THERMO")).toBe(37);
  });

  it("brings the products into the warehouse when a transfer is made and out again when it is reverted", async () => {
    const s = await start();
    const draft = (await s.factory.transferService.list({ status: "draft", ...all })).items[0]; // RF-1D x 20
    await s.factory.transferService.run(draft.id, "transfer");
    expect(await onHandOf(s, "product", "RF-1D")).toBe(45);
    expect((await s.movementService.list({ q: draft.number, ...all })).items[0]).toMatchObject({ type: "produce", qty: 20, warehouseCode: "WH-F" });
    await s.factory.transferService.run(draft.id, "revert", { note: "Wrong quantity" });
    expect(await onHandOf(s, "product", "RF-1D")).toBe(25);
  });

  it("takes the products out when a delivery is confirmed, refuses when there is not enough, and gives them back on revert", async () => {
    const s = await start();
    await switchTo("saleManager");
    const draft = (await s.sale.deliveryNoteService.list({ status: "draft", ...all })).items[0]; // RF-2D x 12
    await s.sale.deliveryNoteService.run(draft.id, "confirm");
    expect(await onHandOf(s, "product", "RF-2D")).toBe(28);
    expect((await s.movementService.list({ q: draft.number, ...all })).items[0]).toMatchObject({ type: "deliver", qty: -12 });
    await s.sale.deliveryNoteService.run(draft.id, "revert", { note: "Wrong customer" });
    expect(await onHandOf(s, "product", "RF-2D")).toBe(40);
  });

  it("builds the dashboard stock alerts from the real balances", async () => {
    const s = await start();
    const { getDashboard } = await import("../dashboard.service.js");
    const dashboard = await getDashboard();
    expect(dashboard.stockAlerts.map((row) => [row.code, row.qtyOnHand, row.status])).toEqual([
      ["DOOR", 18, "SHORTAGE"],
      ["THERMO", 25, "SHORTAGE"],
      ["STEEL", 210, "NEAR_SHORTAGE"],
    ]);
    expect(dashboard.kpis.materialsInShortage).toEqual({ count: 2, nearShortage: 1 });
    expect(s).toBeTruthy();
  });
});

describe("adjustments", () => {
  const draftFor = async (s, code = "SHELF", counted = 290) => {
    const shelf = (await s.balanceService.list({ kind: "material", q: code, ...all })).items[0];
    return s.adjustmentService.create({ itemType: "material", itemId: shelf.itemId, warehouseId: shelf.warehouseId, countedQty: counted, reason: "recount", remarks: "", date: "2026-10-07" });
  };

  it("has one adjustment of every status and counts them for the stepper", async () => {
    const s = await start();
    const { items, meta } = await s.adjustmentService.list(all);
    expect(items).toHaveLength(5);
    expect(meta.statusCounts).toEqual({ approved: 1, pending: 1, rejected: 1, draft: 1, cancelled: 1 });
    const approved = items.find((row) => row.status === "approved");
    expect(approved).toMatchObject({ number: "ADJ-2026-0001", difference: -3, countedQty: 25, itemCode: "THERMO" });
    expect(approved.links).toEqual([expect.objectContaining({ type: "movement" })]);
  });

  it("follows draft -> pending -> approved and books the difference as one movement", async () => {
    const s = await start("worker");
    const adj = await draftFor(s);
    expect(adj).toMatchObject({ status: "draft", difference: -10, onHand: 300 });
    await s.adjustmentService.run(adj.id, "request");
    await switchTo("manager");
    const approved = await s.adjustmentService.run(adj.id, "approve", { note: "Checked" });
    expect(approved).toMatchObject({ status: "approved", difference: -10 });
    expect(await onHandOf(s, "material", "SHELF")).toBe(290);
    const moves = (await s.movementService.list({ q: adj.number, ...all })).items;
    expect(moves).toEqual([expect.objectContaining({ type: "adjust", qty: -10, balanceAfter: 290, docNumber: adj.number })]);
    expect(approved.history.map((entry) => entry.action)).toEqual(["adjustment-approve", "request", "created"]);
  });

  it("books the counted quantity even when the stock changed after the request, and says so", async () => {
    const s = await start("worker");
    const adj = await draftFor(s, "STEEL", 200); // 210 on hand
    await s.adjustmentService.run(adj.id, "request");
    await switchTo("manager");
    const running = (await s.factory.workOrderService.list({ status: "scheduled", ...all })).items[0]; // takes 48 steel
    await s.factory.workOrderService.run(running.id, "start");
    const approved = await s.adjustmentService.run(adj.id, "approve");
    expect(await onHandOf(s, "material", "STEEL")).toBe(200);
    expect(approved).toMatchObject({ onHandChanged: true, onHandAtRequest: 210, onHand: 162, difference: 38 });
  });

  it("is approved by a Manager who is not its author, and rejected only with a reason", async () => {
    const s = await start("manager");
    const own = await draftFor(s);
    await s.adjustmentService.run(own.id, "request");
    expect((await failure(s.adjustmentService.run(own.id, "approve"))).status).toBe(403); // not their own
    await switchTo("worker");
    expect((await failure(s.adjustmentService.run(own.id, "approve"))).status).toBe(403); // a Worker never approves
    await switchTo("purchase");
    const error = await failure(s.adjustmentService.run(own.id, "reject"));
    expect(error.details).toEqual([{ path: ["note"], message: "REQUIRED" }]);
    expect(await s.adjustmentService.run(own.id, "reject", { note: "Count it again" })).toMatchObject({ status: "rejected" });
    expect(await onHandOf(s, "material", "SHELF")).toBe(300); // nothing booked
  });

  it("can go back to draft and be cancelled; only a draft can be edited or deleted", async () => {
    const s = await start("worker");
    const adj = await draftFor(s);
    await s.adjustmentService.run(adj.id, "request");
    expect((await failure(s.adjustmentService.update(adj.id, { ...adj, countedQty: 1 }))).status).toBe(409);
    expect(await s.adjustmentService.run(adj.id, "back-to-draft")).toMatchObject({ status: "draft" });
    expect(await s.adjustmentService.update(adj.id, { date: "2026-10-07", countedQty: 295, reason: "recount", remarks: "" })).toMatchObject({ countedQty: 295, difference: -5 });
    expect(await s.adjustmentService.run(adj.id, "cancel")).toMatchObject({ status: "cancelled" });
    const other = await draftFor(s);
    await s.adjustmentService.remove(other.id);
    expect((await failure(s.adjustmentService.get(other.id))).status).toBe(404);
  });

  it("checks the form: item, warehouse of the right kind, quantity, reason (and a note for Other)", async () => {
    const s = await start("worker");
    const shelf = (await s.balanceService.list({ kind: "material", q: "SHELF", ...all })).items[0];
    const fieldsOf = async (body) => (await failure(s.adjustmentService.create({ itemType: "material", itemId: shelf.itemId, warehouseId: shelf.warehouseId, countedQty: 1, reason: "recount", remarks: "", date: "2026-10-07", ...body }))).details.map((e) => e.path[0]);
    expect(await fieldsOf({ countedQty: -1 })).toEqual(["countedQty"]);
    expect(await fieldsOf({ countedQty: null })).toEqual(["countedQty"]);
    expect(await fieldsOf({ reason: "other" })).toEqual(["remarks"]);
    expect(await fieldsOf({ reason: "" })).toEqual(["reason"]);
    expect(await fieldsOf({ warehouseId: 2 })).toEqual(["warehouseId"]); // a material is not kept in the finished goods warehouse
    expect(await fieldsOf({ itemId: 999 })).toContain("itemId");
    const product = (await s.balanceService.list({ kind: "product", ...all })).items[0];
    expect((await failure(s.adjustmentService.create({ itemType: "product", itemId: product.itemId, warehouseId: product.warehouseId, countedQty: 1.5, reason: "recount", remarks: "", date: "2026-10-07" }))).details[0].path).toEqual(["countedQty"]);
  });
});

describe("reserved and available (Sotck_req: available = on hand - reserved)", () => {
  it("reserves the materials of a scheduled work order and the products of a draft delivery note", async () => {
    const s = await start();
    const rows = (await s.balanceService.list({ kind: "material", sort: "code", ...all })).items;
    const byCode = Object.fromEntries(rows.map((row) => [row.code, row]));
    expect(byCode.DOOR).toMatchObject({ onHand: 18, reserved: 6, available: 12 }); // the scheduled work order: RF-1D x 6
    expect(byCode.STEEL).toMatchObject({ onHand: 210, reserved: 48, available: 162 });
    expect(byCode.THERMO).toMatchObject({ onHand: 25, reserved: 0, available: 25 });
    const products = Object.fromEntries((await s.balanceService.list({ kind: "product", ...all })).items.map((row) => [row.code, row]));
    expect(products["RF-2D"]).toMatchObject({ onHand: 40, reserved: 12, available: 28 }); // the draft delivery note
    expect(products["RF-1D"]).toMatchObject({ onHand: 25, reserved: 0, available: 25 });
    const door = await s.getStockItem("material", byCode.DOOR.itemId);
    expect(door).toMatchObject({ onHand: 18, reserved: 6, available: 12 });
  });

  it("gives the reservation up when the work order starts (the materials are issued instead) or is sent back to draft", async () => {
    const s = await start();
    const scheduled = (await s.factory.workOrderService.list({ status: "scheduled", ...all })).items[0];
    await s.factory.workOrderService.run(scheduled.id, "back-to-draft");
    expect((await s.balanceService.list({ kind: "material", q: "DOOR", ...all })).items[0]).toMatchObject({ reserved: 0, available: 18 });
    await s.factory.workOrderService.run(scheduled.id, "schedule");
    await s.factory.workOrderService.run(scheduled.id, "start");
    expect((await s.balanceService.list({ kind: "material", q: "DOOR", ...all })).items[0]).toMatchObject({ onHand: 12, reserved: 0, available: 12 });
  });

  it("makes the availability checks use the available quantity, but not for the work order that is being looked at", async () => {
    const s = await start();
    // RF-2D x 9 needs 18 doors: 18 on hand, 6 reserved by the scheduled work order -> 12 available, 6 missing
    await switchTo("saleManager");
    const sale = await s.sale.checkAvailability([{ productId: 1, qty: 9 }]);
    await switchTo("manager");
    expect(sale.materials.find((row) => row.materialCode === "DOOR")).toMatchObject({ required: 18, available: 12, missing: 6 });
    const scheduled = (await s.factory.workOrderService.list({ status: "scheduled", ...all })).items[0]; // RF-1D x 6
    const own = await s.factory.checkFactoryAvailability([{ productId: 2, qty: 6 }], scheduled.id);
    expect(own.canProduce).toBe(true);
    expect(own.materials.find((row) => row.materialCode === "DOOR")).toMatchObject({ required: 6, available: 18 });
    const other = await s.factory.checkFactoryAvailability([{ productId: 2, qty: 6 }]);
    expect(other.materials.find((row) => row.materialCode === "DOOR").available).toBe(12);
  });
});

describe("movement numbers and from / to (Sotck_req: Stock Movement)", () => {
  it("numbers the movements MV-year-0001 in time order, and the next booking gets the next number", async () => {
    const s = await start("worker");
    const { items } = await s.movementService.list({ sort: "at", ...all });
    const chronological = [...items].sort((a, b) => a.at.localeCompare(b.at) || a.id - b.id);
    expect(chronological[0].number).toBe("MV-2026-0001");
    expect(chronological.map((row) => row.number)).toEqual(chronological.map((_, index) => `MV-2026-${String(index + 1).padStart(4, "0")}`));
    const adj = await s.adjustmentService.create({ itemType: "material", itemId: 5, warehouseId: 1, countedQty: 290, reason: "recount", remarks: "", date: "2026-10-07" });
    await s.adjustmentService.run(adj.id, "request");
    await switchTo("manager");
    await s.adjustmentService.run(adj.id, "approve");
    const mine = (await s.movementService.list({ q: adj.number, ...all })).items[0];
    expect(mine.number).toBe(`MV-2026-${String(items.length + 1).padStart(4, "0")}`);
    expect((await s.movementService.list({ q: mine.number, ...all })).items).toHaveLength(1);
  });

  it("says where a quantity came from and where it went", async () => {
    const s = await start();
    const { items } = await s.movementService.list(all);
    const pick = (type) => items.find((row) => row.type === type);
    expect(pick("consume")).toMatchObject({ from: "WH-R", to: expect.stringMatching(/^WO-/) });
    expect(pick("produce")).toMatchObject({ from: expect.stringMatching(/^FT-/), to: "WH-F" });
    expect(pick("deliver")).toMatchObject({ from: "WH-F", to: expect.stringMatching(/^DN-/) });
    expect(pick("receipt")).toMatchObject({ from: expect.stringMatching(/^GR-/), to: "WH-R" });
    expect(pick("opening")).toMatchObject({ from: null, to: "WH-R" });
  });
});

describe("opening quantities", () => {
  const newMaterial = async (s) => {
    await switchTo("admin");
    const material = await s.master.materialService.create({ code: "RELAY", name: "Relay", uom: "pcs", reorderPoint: null, reorderQty: null });
    await switchTo("worker");
    return material;
  };

  it("lets a new item without a reorder point start with an approved opening quantity, booked as an Opening Balance", async () => {
    const s = await start();
    const material = await newMaterial(s);
    const row = (await s.balanceService.list({ kind: "material", q: "RELAY", ...all })).items[0];
    expect(row).toMatchObject({ onHand: 0, reorderPoint: null, status: "not_set" });
    expect(await s.getOnHand("material", material.id, row.warehouseId)).toMatchObject({ onHand: 0, hasMovements: false });

    const adj = await s.adjustmentService.create({ itemType: "material", itemId: material.id, warehouseId: row.warehouseId, countedQty: 100, reason: "opening", remarks: "", date: "2026-10-07" });
    await s.adjustmentService.run(adj.id, "request");
    await switchTo("purchase");
    await s.adjustmentService.run(adj.id, "approve");
    expect(await onHandOf(s, "material", "RELAY")).toBe(100);
    expect((await s.movementService.list({ q: adj.number, ...all })).items[0]).toMatchObject({ type: "opening", qty: 100 });
    expect((await s.getStockItem("material", material.id)).hasMovements).toBe(true);
  });

  it("refuses an opening quantity for an item that already has movements", async () => {
    const s = await start("worker");
    const comp = (await s.balanceService.list({ kind: "material", q: "COMP", ...all })).items[0];
    const error = await failure(s.adjustmentService.create({ itemType: "material", itemId: comp.itemId, warehouseId: comp.warehouseId, countedQty: 5, reason: "opening", remarks: "", date: "2026-10-07" }));
    expect(error.details).toEqual([{ path: ["reason"], message: "HAS_MOVEMENTS" }]);
  });
});
