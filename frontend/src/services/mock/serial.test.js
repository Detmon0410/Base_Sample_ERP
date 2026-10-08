// The Serial Number API as the app uses it, answered by the local mock (docs/specs/f12-requirements-2.md, part B).
const USERS = {
  factory: { email: "ken@kanou.test", password: "ken12345" }, // Factory Worker
  manager: { email: "yuki@kanou.test", password: "yuki1234" }, // Factory Manager
  sale: { email: "alice@kanou.test", password: "alice1234" }, // Sale Manager and Purchase Worker
  saleWorker: { email: "nina@kanou.test", password: "nina1234" }, // Sale Worker
  accounting: { email: "mika@kanou.test", password: "mika1234" }, // Accounting Manager
};

async function start(who = "factory") {
  vi.resetModules();
  const { login } = await import("../auth.service.js");
  const { setToken } = await import("@/utils/session");
  const serial = await import("../serial.service.js");
  const sale = await import("../sale.service.js");
  const switchTo = async (user) => setToken((await login(USERS[user])).token);
  await switchTo(who);
  return { ...serial, sale, switchTo };
}

const failure = async (promise) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("The call was expected to fail");
};
const all = { pageSize: 200 };
const codes = (error) => error.details.map((item) => `${item.path.join(".")}:${item.message}`);

describe("the seeded serial numbers", () => {
  it("has the units of the demo Work Orders, each with one status", async () => {
    const s = await start();
    const { items, meta } = await s.serialService.list(all);
    expect(meta.total).toBe(40);
    expect(meta.statusCounts).toEqual({ made: 5, in_stock: 11, delivered: 24 });
    expect(new Set(items.map((row) => row.sn)).size).toBe(40); // unique
    expect(items.every((row) => /^RF-2D-26-\d{6}$/.test(row.sn))).toBe(true);
    const wo5 = (await s.workOrderSerials.list(5)).items;
    expect(wo5).toHaveLength(6);
    expect(wo5.every((row) => row.status === "delivered" && row.deliveryNote.number === "DN-2026-0001" && row.customerName)).toBe(true);
  });

  it("makes the first 29 units of the finished Work Order 'in stock' (the 29 that were transferred), 18 of them delivered", async () => {
    const s = await start();
    const { items, meta } = await s.workOrderSerials.list(3);
    expect(meta).toMatchObject({ total: 30, qty: 30, made: 30, left: 0 });
    expect(items.filter((row) => row.status === "delivered")).toHaveLength(18);
    expect(items.filter((row) => row.status === "in_stock")).toHaveLength(11);
    expect(items.filter((row) => row.status === "made")).toHaveLength(1); // the thirtieth was never transferred
    expect(items.find((row) => row.status === "in_stock").transferNumber).toBe("FT-2026-0001");
  });

  it("searches and filters", async () => {
    const s = await start();
    expect((await s.serialService.list({ q: "WO-2026-0001", ...all })).items).toHaveLength(4);
    expect((await s.serialService.list({ status: "made", ...all })).meta.total).toBe(5);
    expect((await s.serialService.list({ workOrder: 5, ...all })).meta.total).toBe(6);
    expect((await s.serialService.list({ product: 2, ...all })).meta.total).toBe(0);
    const one = (await s.serialService.list({ status: "in_stock", ...all })).items[0];
    expect((await s.serialService.list({ q: one.sn.toLowerCase(), ...all })).items.map((row) => row.sn)).toEqual([one.sn]);
  });
});

describe("making serial numbers", () => {
  it("is done by a button: a scheduled Work Order has none until a Factory user makes them, numbers go on and are never reused", async () => {
    const s = await start();
    expect((await s.workOrderSerials.list(2)).meta).toMatchObject({ total: 0, qty: 6, made: 0, left: 6, canMake: true });
    const first = await s.workOrderSerials.make(2, 2);
    expect(first).toHaveLength(2);
    expect(first[0]).toMatchObject({ status: "made", workOrderNumber: "WO-2026-0002", createdBy: "Ken Suzuki" });
    expect(first[0].sn).toMatch(/^RF-1D-\d{2}-000001$/);
    expect(first[1].sn).toMatch(/-000002$/);
    const second = await s.workOrderSerials.make(2, 4);
    expect(second.map((row) => row.sn.slice(-6))).toEqual(["000003", "000004", "000005", "000006"]);
    expect((await s.workOrderSerials.list(2)).meta).toMatchObject({ made: 6, left: 0 });
  });

  it("never makes more than the quantity of the Work Order", async () => {
    const s = await start();
    expect(codes(await failure(s.workOrderSerials.make(2, 7)))).toEqual(["count:TOO_MANY"]);
    expect(codes(await failure(s.workOrderSerials.make(2, 0)))).toEqual(["count:INVALID"]);
    await s.workOrderSerials.make(2, 6);
    expect(codes(await failure(s.workOrderSerials.make(2, 1)))).toEqual(["count:TOO_MANY"]);
    expect(codes(await failure(s.workOrderSerials.make(3, 1)))).toEqual(["count:TOO_MANY"]); // WO-0003 has all 30
  });

  it("is not possible for a draft or a cancelled Work Order, nor for a user outside Factory", async () => {
    const s = await start();
    expect((await failure(s.workOrderSerials.make(7, 1))).code).toBe("INVALID_STATUS"); // draft
    expect((await failure(s.workOrderSerials.make(6, 1))).code).toBe("INVALID_STATUS"); // cancelled
    await s.switchTo("sale");
    expect((await failure(s.workOrderSerials.make(2, 1))).status).toBe(403);
    expect((await s.workOrderSerials.list(2)).meta.total).toBe(0); // reading is open to every department
    await s.switchTo("manager");
    expect(await s.workOrderSerials.make(2, 1)).toHaveLength(1);
  });
});

describe("the life of one unit", () => {
  it("lists what happened in time order, with the documents it is linked to", async () => {
    const s = await start();
    const sn = (await s.workOrderSerials.list(5)).items[0].sn;
    const unit = await s.serialService.get(sn.toLowerCase()); // the lookup does not care about case
    expect(unit).toMatchObject({ sn, status: "delivered", workOrderNumber: "WO-2026-0005", saleOrderNumber: "SO-2026-0004" });
    const types = unit.timeline.map((event) => event.type);
    expect(types).toEqual(expect.arrayContaining(["generated", "materials", "step", "finished", "transferred", "delivered"]));
    expect(types.indexOf("generated")).toBeLessThan(types.indexOf("materials"));
    expect(types.indexOf("transferred")).toBeLessThan(types.indexOf("delivered"));
    const times = unit.timeline.map((event) => event.at);
    expect([...times].sort()).toEqual(times);
    expect(unit.timeline.find((event) => event.type === "materials").materials.length).toBeGreaterThan(0);
    expect(unit.timeline.find((event) => event.type === "delivered")).toMatchObject({ ref: { number: "DN-2026-0001" }, saleOrder: "SO-2026-0004" });
    expect(unit.timeline.filter((event) => event.type === "step").map((event) => event.step.stepNo)).toEqual([1, 2, 3, 4]);
  });

  it("says when a number is unknown", async () => {
    const s = await start();
    expect((await failure(s.serialService.get("NOPE-1"))).code).toBe("SERIAL_NOT_FOUND");
  });

  it("makes the units of a cancelled Work Order void, but keeps them searchable", async () => {
    const s = await start();
    await s.workOrderSerials.make(2, 1);
    const { workOrderService } = await import("../factory.service.js");
    await s.switchTo("manager");
    await workOrderService.run(2, "cancel", { note: "Customer postponed" });
    const row = (await s.workOrderSerials.list(2)).items[0];
    expect(row.status).toBe("void");
    expect((await s.serialService.get(row.sn)).timeline.map((event) => event.type)).toContain("void");
  });
});

describe("delivery notes with serial numbers", () => {
  const draftNote = async (s) => (await s.sale.deliveryNoteService.list({ status: "draft", pageSize: 100 })).items[0]; // RF-2D x 12
  const freeUnits = async (s) => (await s.serialService.list({ product: 1, free: 1, status: "in_stock", pageSize: 100 })).items.map((row) => row.sn);

  it("offers the units in stock that are not on another note, and says that the line must name them", async () => {
    const s = await start("saleWorker");
    const note = await draftNote(s);
    expect(note.lines[0]).toMatchObject({ productCode: "RF-2D", serialTracked: true, serials: [] });
    expect(await freeUnits(s)).toHaveLength(11);
  });

  it("refuses to confirm a line without its units, and refuses units that are not available or not of the product", async () => {
    const s = await start("sale");
    const note = await draftNote(s);
    expect(codes(await failure(s.sale.deliveryNoteService.run(note.id, "confirm", {})))).toEqual(["lines.0.serials:SERIALS_REQUIRED"]);
    const units = await freeUnits(s);
    const body = (serials, deliverNow = 11) => ({ date: note.date, warehouseId: note.warehouseId, lines: [{ productId: 1, deliverNow, serials }] });
    const delivered = (await s.workOrderSerials.list(5)).items[0].sn;
    expect(codes(await failure(s.sale.deliveryNoteService.update(note.id, body([delivered]))))).toEqual(["lines.0.serials:NOT_AVAILABLE"]);
    expect(codes(await failure(s.sale.deliveryNoteService.update(note.id, body(["NOPE"]))))).toEqual(["lines.0.serials:INVALID"]);
    expect(codes(await failure(s.sale.deliveryNoteService.update(note.id, body([units[0], units[0]]))))).toEqual(["lines.0.serials:INVALID"]);
    expect(codes(await failure(s.sale.deliveryNoteService.update(note.id, body(units.slice(0, 3), 2))))).toEqual(["lines.0.serials:TOO_MANY"]);
    // two units for eleven pieces: the note can be saved, not confirmed
    await s.sale.deliveryNoteService.update(note.id, body(units.slice(0, 2)));
    expect(codes(await failure(s.sale.deliveryNoteService.run(note.id, "confirm", {})))).toEqual(["lines.0.serials:SERIALS_REQUIRED"]);
  });

  it("marks the units delivered with the note and the customer, and gives them back when the note is reverted", async () => {
    const s = await start("sale");
    const note = await draftNote(s);
    const units = await freeUnits(s);
    await s.sale.deliveryNoteService.update(note.id, { date: note.date, warehouseId: note.warehouseId, lines: [{ productId: 1, deliverNow: 11, serials: units }] });
    expect((await s.serialService.list({ product: 1, free: 1, status: "in_stock", pageSize: 100 })).meta.total).toBe(0); // all on a draft note now
    await s.sale.deliveryNoteService.run(note.id, "confirm", {});
    const unit = await s.serialService.get(units[0]);
    expect(unit).toMatchObject({ status: "delivered", deliveryNote: { number: note.number } });
    expect(unit.customerName).toBeTruthy();
    expect((await s.serialService.list({ status: "delivered", ...all })).meta.total).toBe(35);
    await s.sale.deliveryNoteService.run(note.id, "revert", { note: "Wrong customer" });
    expect((await s.serialService.get(units[0])).status).toBe("in_stock");
  });

  it("does not ask for units when the product has none in stock (a product without serial numbers is delivered as before)", async () => {
    const s = await start("sale");
    expect((await s.serialService.list({ product: 2, status: "in_stock", ...all })).meta.total).toBe(0);
  });
});
