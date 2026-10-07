// The Purchase API as the app uses it, answered by the local mock. Every test starts with a fresh mock and signs in.
const USERS = {
  worker: { email: "alice@kanou.test", password: "alice1234" }, // Sale Manager and Purchase Worker
  manager: { email: "hana@kanou.test", password: "hana1234" }, // Purchase Manager
  factory: { email: "yuki@kanou.test", password: "yuki1234" }, // Factory Manager: sees Stock, not Purchase
  sale: { email: "nina@kanou.test", password: "nina1234" }, // Sale Worker: no Stock, no Purchase
  admin: { email: "admin@gmail.com", password: "admin" },
};

async function start(who = "manager") {
  vi.resetModules();
  const { login } = await import("../auth.service.js");
  const { setToken } = await import("@/utils/session");
  const purchase = await import("../purchase.service.js");
  const stock = await import("../stock.service.js");
  const master = await import("../material.service.js");
  const { supplierService } = await import("../supplier.service.js");
  const { getDashboard } = await import("../dashboard.service.js");
  setToken((await login(USERS[who])).token);
  return { ...purchase, ...stock, master, supplierService, getDashboard };
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
const onHandOf = async (p, code) => (await p.balanceService.list({ kind: "material", q: code, ...all })).items.find((row) => row.code === code).onHand;
const byNumber = async (p, number) => (await p.purchaseOrderService.list({ q: number, ...all })).items.find((row) => row.number === number);

/** A new draft PO: 20 compressors from CompCo (S001 = 1), WH-R = 1, COMP = 1. */
const draft = (p, overrides = {}) =>
  p.purchaseOrderService.create({ supplierId: 1, date: "2026-10-08", expectedDate: "2026-10-22", warehouseId: 1, remarks: "", lines: [{ materialId: 1, qty: 20, unitPrice: 3800 }], ...overrides });

/** Send the draft as the Manager and open a receipt of everything for it. */
const sent = async (p, overrides) => {
  const po = await draft(p, overrides);
  await p.purchaseOrderService.run(po.id, "send");
  return po;
};
const receiptBody = (po, lines, extra = {}) => ({ poId: po.id, date: "2026-10-09", warehouseId: 1, deliveryNoteNo: "X-1", remarks: "", lines, ...extra });

describe("seeded purchase orders", () => {
  it("has a PO in every status and counts them for the stepper", async () => {
    const p = await start();
    const { items, meta } = await p.purchaseOrderService.list(all);
    expect(items).toHaveLength(7);
    expect(meta.statusCounts).toEqual({ received: 2, partially_received: 1, closed: 1, cancelled: 1, sent: 1, draft: 1 });
    expect(meta.sums.total).toBe(items.reduce((sum, row) => sum + row.total, 0));
    const sale = (await p.purchaseOrderService.list({ status: "sent", ...all })).items[0];
    expect(sale).toMatchObject({ number: "PO-2026-0006", supplierCode: "S001", lineCount: 2, subtotal: 150 * 650 + 50 * 3800 });
    expect(sale.tax).toBe(Math.floor(sale.subtotal * 0.1));
  });

  it("shows what was received per line, what is open and how late a PO is", async () => {
    const p = await start();
    const partial = await byNumber(p, "PO-2026-0003");
    expect(partial.status).toBe("partially_received");
    expect(partial.lines.map((line) => [line.materialCode, line.qty, line.received, line.open])).toEqual([["DOOR", 60, 20, 40], ["STEEL", 200, 0, 200]]);
    expect(partial.progress).toMatchObject({ ordered: 260, received: 20, percent: 8, late: true });
    expect(partial.receipts.map((gr) => [gr.number, gr.status])).toEqual(expect.arrayContaining([["GR-2026-0003", "posted"], ["GR-2026-0005", "draft"], ["GR-2026-0006", "cancelled"]]));
    const closed = await byNumber(p, "PO-2026-0004");
    expect(closed).toMatchObject({ status: "closed", lines: [expect.objectContaining({ received: 300, open: 100 })] }); // closed with 100 kg never delivered
    expect(closed.history[0]).toMatchObject({ action: "close-remaining", note: "The supplier cannot deliver the last 100 kg" });
  });

  it("filters and searches", async () => {
    const p = await start();
    expect((await p.purchaseOrderService.list({ supplier: 2, ...all })).items.map((row) => row.number)).toEqual(expect.arrayContaining(["PO-2026-0002", "PO-2026-0003"]));
    expect((await p.purchaseOrderService.list({ material: 6, ...all })).items.map((row) => row.number)).toEqual(["PO-2026-0006"]);
    expect((await p.purchaseOrderService.list({ q: "thermostat", ...all })).items).toHaveLength(1);
    expect((await p.purchaseOrderService.list({ receivable: 1, ...all })).items.map((row) => row.status).sort()).toEqual(["partially_received", "sent"]);
    expect((await p.purchaseOrderService.list({ from: "2026-10-01", ...all })).items).toHaveLength(2);
  });
});

describe("who can open Purchase", () => {
  it("is for Purchase users and Admin; a Factory or Sale user gets 403", async () => {
    const p = await start("worker");
    expect((await p.purchaseOrderService.list(all)).meta.total).toBe(7);
    await switchTo("admin");
    expect((await p.purchaseOrderService.list(all)).meta.total).toBe(7);
    for (const who of ["factory", "sale"]) {
      await switchTo(who);
      expect((await failure(p.purchaseOrderService.list(all))).status).toBe(403);
      expect((await failure(p.goodsReceiptService.list(all))).status).toBe(403);
      expect((await failure(p.stockStatusService.list(all))).status).toBe(403);
    }
  });
});

describe("the stock status board", () => {
  it("shows the materials that are short or near short, with what is on order and the cheapest supplier", async () => {
    const p = await start();
    const { items } = await p.stockStatusService.list(all);
    expect(items.map((row) => [row.code, row.status])).toEqual([["DOOR", "shortage"], ["THERMO", "shortage"], ["STEEL", "near_shortage"]]);
    const thermo = items.find((row) => row.code === "THERMO");
    expect(thermo).toMatchObject({ onHand: 25, onOrder: 150, reorderPoint: 40, suggestedQty: 150 }); // reorder quantity 150, 150 already ordered
    expect(thermo.suggested).toMatchObject({ code: "S001", price: 650, leadTimeDays: 10 });
    const door = items.find((row) => row.code === "DOOR");
    expect(door).toMatchObject({ onOrder: 40, suggestedQty: 100 });
    expect(door.suggested).toMatchObject({ code: "S002", price: 2200 });
  });

  it("lists every material with scope=all, picks the cheapest supplier and filters by status", async () => {
    const p = await start();
    const everything = await p.stockStatusService.list({ scope: "all", ...all });
    expect(everything.items).toHaveLength(6);
    const comp = everything.items.find((row) => row.code === "COMP");
    expect(comp.suppliers.map((row) => [row.code, row.price])).toEqual([["S001", 3800], ["S003", 4100]]);
    expect(comp.suggested.code).toBe("S001");
    expect((await p.stockStatusService.list({ status: "normal", ...all })).items.map((row) => row.code).sort()).toEqual(["COMP", "FOAM", "SHELF"]);
    expect((await p.stockStatusService.list({ q: "foam", scope: "all", ...all })).items).toHaveLength(1);
  });

  it("counts a Sent PO as on order, not a draft", async () => {
    const p = await start();
    const po = await draft(p, { lines: [{ materialId: 4, qty: 500, unitPrice: 180 }], supplierId: 2 }); // steel
    const steel = async () => (await p.stockStatusService.list({ scope: "all", q: "STEEL", ...all })).items[0].onOrder;
    expect(await steel()).toBe(200);
    await p.purchaseOrderService.run(po.id, "send");
    expect(await steel()).toBe(700);
  });
});

describe("creating and editing a PO", () => {
  it("creates a numbered draft with totals and the buyer, and the Stock overview shows it as on order only after it is sent", async () => {
    const p = await start("worker");
    const po = await draft(p);
    expect(po).toMatchObject({ number: "PO-2026-0008", status: "draft", buyer: "Alice Sato", subtotal: 76000, tax: 7600, total: 83600, supplierCode: "S001", warehouseName: "Raw Material Warehouse" });
    expect(po.lines[0]).toMatchObject({ materialCode: "COMP", amount: 76000, listPrice: 3800, received: 0, open: 20 });
    expect(po.links).toEqual([expect.objectContaining({ type: "supplierBill", number: null })]);
    expect((await p.balanceService.list({ kind: "material", q: "COMP", ...all })).items[0].onOrder).toBe(50);
  });

  it("refuses a supplier that does not sell the material, an inactive supplier, bad quantities and prices, duplicates and no lines", async () => {
    const p = await start("worker");
    const codes = async (body) => (await failure(draft(p, body))).details.map((item) => `${item.path.join(".")}:${item.message}`);
    expect(await codes({ lines: [{ materialId: 3, qty: 5, unitPrice: 520 }] })).toEqual(["lines.0.materialId:NOT_SUPPLIED"]); // foam is not sold by CompCo
    expect(await codes({ lines: [{ materialId: 1, qty: 0, unitPrice: 3800 }] })).toEqual(["lines.0.qty:INVALID"]);
    expect(await codes({ lines: [{ materialId: 1, qty: 1.5, unitPrice: 3800 }] })).toEqual(["lines.0.qty:INVALID"]); // pieces are whole
    expect(await codes({ lines: [{ materialId: 1, qty: 2, unitPrice: -1 }] })).toEqual(["lines.0.unitPrice:INVALID"]);
    expect(await codes({ lines: [{ materialId: 1, qty: 2, unitPrice: 1 }, { materialId: 1, qty: 3, unitPrice: 1 }] })).toEqual(["lines.1.materialId:DUPLICATE"]);
    expect(await codes({ lines: [] })).toEqual(["lines:REQUIRED"]);
    expect(await codes({ warehouseId: 2 })).toEqual(["warehouseId:REQUIRED"]); // the finished goods warehouse
    expect(await codes({ expectedDate: "2026-10-01" })).toEqual(["expectedDate:DATE_ORDER"]);
    expect(await codes({ supplierId: 99 })).toContain("supplierId:REQUIRED");
    // kg may have decimals, up to three
    const kg = await draft(p, { supplierId: 2, lines: [{ materialId: 4, qty: 12.5, unitPrice: 180 }] });
    expect(kg.lines[0].amount).toBe(2250);
  });

  it("lets only the author and a Manager edit or delete a draft, and nobody edit it after it is sent", async () => {
    const p = await start("worker");
    const po = await draft(p);
    const body = { supplierId: 1, date: "2026-10-08", expectedDate: "2026-10-23", warehouseId: 1, remarks: "Changed", lines: [{ materialId: 1, qty: 30, unitPrice: 3700 }] };
    expect(await p.purchaseOrderService.update(po.id, body)).toMatchObject({ total: 122100, remarks: "Changed" });
    const other = (await p.purchaseOrderService.list({ status: "draft", ...all })).items.find((row) => row.createdById !== 2);
    expect(other).toBeUndefined(); // the only seeded draft is Alice's too
    await switchTo("manager");
    expect(await p.purchaseOrderService.update(po.id, { ...body, remarks: "By the manager" })).toMatchObject({ remarks: "By the manager" });
    await p.purchaseOrderService.run(po.id, "send");
    expect((await failure(p.purchaseOrderService.update(po.id, body))).code).toBe("INVALID_STATUS");
    expect((await failure(p.purchaseOrderService.remove(po.id))).code).toBe("INVALID_STATUS");
    const second = await draft(p);
    await p.purchaseOrderService.remove(second.id);
    expect((await failure(p.purchaseOrderService.get(second.id))).status).toBe(404);
  });
});

describe("purchase order actions", () => {
  it("is sent by a Manager only (a Worker may not), and can go back to draft before anything is received", async () => {
    const p = await start("worker");
    const po = await draft(p);
    expect((await failure(p.purchaseOrderService.run(po.id, "send"))).status).toBe(403);
    await switchTo("manager");
    expect(await p.purchaseOrderService.run(po.id, "send", { note: "Approved" })).toMatchObject({ status: "sent" });
    expect(await p.purchaseOrderService.run(po.id, "back-to-draft")).toMatchObject({ status: "draft" });
    await p.purchaseOrderService.run(po.id, "send");
    expect((await failure(p.purchaseOrderService.run(po.id, "send"))).code).toBe("INVALID_STATUS");
  });

  it("is cancelled: a draft by its author, a sent one by a Manager with a reason and only while nothing is received", async () => {
    const p = await start("worker");
    const mine = await draft(p);
    expect(await p.purchaseOrderService.run(mine.id, "cancel")).toMatchObject({ status: "cancelled" });
    await switchTo("manager");
    const po = await sent(p);
    expect((await failure(p.purchaseOrderService.run(po.id, "cancel"))).details).toEqual([{ path: ["note"], message: "REQUIRED" }]);
    await switchTo("worker");
    expect((await failure(p.purchaseOrderService.run(po.id, "cancel", { note: "x" }))).status).toBe(403);
    await switchTo("manager");
    expect(await p.purchaseOrderService.run(po.id, "cancel", { note: "Wrong supplier" })).toMatchObject({ status: "cancelled" });
    const partial = await byNumber(p, "PO-2026-0003");
    expect((await failure(p.purchaseOrderService.run(partial.id, "cancel", { note: "x" }))).code).toBe("INVALID_STATUS");
  });

  it("closes the remaining quantity of a partly received PO with a reason, closes a received one, and reverts a closed one", async () => {
    const p = await start();
    const partial = await byNumber(p, "PO-2026-0003");
    expect((await failure(p.purchaseOrderService.run(partial.id, "close-remaining"))).details).toEqual([{ path: ["note"], message: "REQUIRED" }]);
    const closed = await p.purchaseOrderService.run(partial.id, "close-remaining", { note: "No more doors this year" });
    expect(closed.status).toBe("closed");
    expect(closed.receipts.find((gr) => gr.number === "GR-2026-0005").status).toBe("cancelled"); // the draft receipt of a closed PO is cancelled
    expect(await p.purchaseOrderService.run(partial.id, "revert", { note: "Closed by mistake" })).toMatchObject({ status: "partially_received" });
    const received = await byNumber(p, "PO-2026-0001");
    expect(await p.purchaseOrderService.run(received.id, "close")).toMatchObject({ status: "closed" });
    expect((await failure(p.purchaseOrderService.run(received.id, "close"))).code).toBe("INVALID_STATUS");
    expect((await failure(p.purchaseOrderService.run((await byNumber(p, "PO-2026-0006")).id, "revert", { note: "x" }))).status).toBe(409); // a sent PO has nothing to revert
  });
});

describe("goods receipts", () => {
  it("has six seeded receipts, three of them the ones that filled the warehouse", async () => {
    const p = await start();
    const { items, meta } = await p.goodsReceiptService.list({ sort: "number", ...all });
    expect(items.map((gr) => [gr.number, gr.status])).toEqual([["GR-2026-0001", "posted"], ["GR-2026-0002", "posted"], ["GR-2026-0003", "posted"], ["GR-2026-0004", "posted"], ["GR-2026-0005", "draft"], ["GR-2026-0006", "cancelled"]]);
    expect(meta.statusCounts).toEqual({ posted: 4, draft: 1, cancelled: 1 });
    const withRejection = items.find((gr) => gr.number === "GR-2026-0003");
    expect(withRejection.lines[0]).toMatchObject({ materialCode: "DOOR", delivered: 25, accepted: 20, rejected: 5, rejectReason: "damaged", ordered: 60 });
    expect(withRejection.links.map((link) => link.type)).toEqual(["purchaseOrder", "movement"]);
    expect((await p.goodsReceiptService.list({ po: items[0].poId, ...all })).items).toHaveLength(1);
  });

  // a PO that the Manager sent, with the user switched back to the Worker who receives the goods
  const sentFor = async (p, who = "worker", overrides) => {
    await switchTo("manager");
    const po = await sent(p, overrides);
    await switchTo(who);
    return po;
  };
  const line = (materialId, delivered, accepted, extra = {}) => ({ materialId, delivered, accepted, rejectReason: "", rejectNote: "", lot: "", ...extra });

  it("posts once: the accepted quantity goes into the warehouse, with its lot, and the PO moves to Partially received, then Received", async () => {
    const p = await start("worker");
    const po = await sentFor(p);
    const first = await p.goodsReceiptService.create(receiptBody(po, [line(1, 12, 12, { lot: "L-1" })]));
    expect(first).toMatchObject({ number: "GR-2026-0007", status: "draft", receivedBy: "Alice Sato" });
    expect(first.lines[0]).toMatchObject({ ordered: 20, open: 20, receivedBefore: 0 });
    expect(await onHandOf(p, "COMP")).toBe(35); // a draft books nothing
    const posted = await p.goodsReceiptService.run(first.id, "post");
    expect(posted.status).toBe("posted");
    expect(await onHandOf(p, "COMP")).toBe(47);
    expect((await p.movementService.list({ q: posted.number, ...all })).items[0]).toMatchObject({ type: "receipt", qty: 12, docNumber: posted.number, note: "Lot L-1", to: "WH-R" });
    expect(await p.purchaseOrderService.get(po.id)).toMatchObject({ status: "partially_received" });
    expect((await failure(p.goodsReceiptService.run(first.id, "post"))).code).toBe("INVALID_STATUS"); // never twice
    expect(await onHandOf(p, "COMP")).toBe(47);

    const second = await p.goodsReceiptService.create(receiptBody(po, [line(1, 8, 8)]));
    expect(second.lines[0]).toMatchObject({ receivedBefore: 12, open: 8 });
    await p.goodsReceiptService.run(second.id, "post");
    const done = await p.purchaseOrderService.get(po.id);
    expect(done.status).toBe("received");
    expect(done.lines[0]).toMatchObject({ received: 20, open: 0 });
    expect(done.history.map((entry) => entry.action).slice(0, 2)).toEqual(["receive", "receive"]);
    expect(await onHandOf(p, "COMP")).toBe(55);
  });

  it("records a rejected quantity with its reason: only the accepted part enters the stock and the rest stays open", async () => {
    const p = await start("worker");
    const po = await sentFor(p);
    const fields = async (lines) => (await failure(p.goodsReceiptService.create(receiptBody(po, lines)))).details.map((item) => `${item.path.join(".")}:${item.message}`);
    expect(await fields([line(1, 20, 15)])).toEqual(["lines.0.rejectReason:REQUIRED"]);
    expect(await fields([line(1, 20, 15, { rejectReason: "other" })])).toEqual(["lines.0.rejectNote:REQUIRED"]);
    expect(await fields([line(1, 5, 6)])).toEqual(["lines.0.accepted:INVALID"]);
    expect(await fields([line(1, 25, 25)])).toEqual(["lines.0.accepted:TOO_MANY"]); // more than the order
    expect(await fields([line(1, 0, 0)])).toEqual(["lines:REQUIRED"]);
    expect(await fields([line(1, 2.5, 2.5)])).toEqual(["lines.0.delivered:INVALID", "lines.0.accepted:INVALID", "lines:REQUIRED"]);
    const gr = await p.goodsReceiptService.create(receiptBody(po, [line(1, 20, 15, { rejectReason: "damaged" })]));
    expect(gr.lines[0]).toMatchObject({ rejected: 5, rejectReason: "damaged" });
    await p.goodsReceiptService.run(gr.id, "post");
    expect(await onHandOf(p, "COMP")).toBe(50);
    expect(await p.purchaseOrderService.get(po.id)).toMatchObject({ status: "partially_received", lines: [expect.objectContaining({ received: 15, open: 5 })] });
  });

  it("refuses goods for a draft PO and over-receiving when two receipts compete for the same quantity; closing the PO cancels the draft receipts", async () => {
    const p = await start("worker");
    const drafted = await draft(p);
    expect((await failure(p.goodsReceiptService.create(receiptBody(drafted, [line(1, 5, 5)])))).details[0]).toMatchObject({ path: ["poId"], message: "INVALID_STATUS" });
    const po = await sentFor(p);
    const a = await p.goodsReceiptService.create(receiptBody(po, [line(1, 15, 15)]));
    const b = await p.goodsReceiptService.create(receiptBody(po, [line(1, 15, 15)]));
    await p.goodsReceiptService.run(a.id, "post");
    const error = await failure(p.goodsReceiptService.run(b.id, "post")); // only 5 are left now
    expect(error.details).toEqual([{ path: ["lines", 0, "accepted"], message: "TOO_MANY" }]);
    expect((await p.goodsReceiptService.get(b.id)).status).toBe("draft");
    expect(await onHandOf(p, "COMP")).toBe(50);
    await switchTo("manager");
    await p.purchaseOrderService.run(po.id, "close-remaining", { note: "Enough" });
    expect((await p.goodsReceiptService.get(b.id)).status).toBe("cancelled");
    expect((await failure(p.goodsReceiptService.run(b.id, "post"))).code).toBe("INVALID_STATUS");
  });

  it("lets only the author or a Manager edit and delete a draft receipt; a posted one is cancelled by a Manager with a reason and the stock goes back", async () => {
    const p = await start("worker");
    const po = await sentFor(p);
    const gr = await p.goodsReceiptService.create(receiptBody(po, [line(1, 10, 10)]));
    expect(await p.goodsReceiptService.update(gr.id, receiptBody(po, [line(1, 11, 11)], { deliveryNoteNo: "X-2" }))).toMatchObject({ accepted: 11, deliveryNoteNo: "X-2" });
    const extra = await p.goodsReceiptService.create(receiptBody(po, [line(1, 2, 2)]));
    await p.goodsReceiptService.remove(extra.id);
    await p.goodsReceiptService.run(gr.id, "post");
    expect((await failure(p.goodsReceiptService.update(gr.id, receiptBody(po, [line(1, 1, 1)])))).code).toBe("INVALID_STATUS");
    expect((await failure(p.goodsReceiptService.run(gr.id, "cancel", { note: "Wrong" }))).status).toBe(403); // a Worker may not
    await switchTo("manager");
    expect((await failure(p.goodsReceiptService.run(gr.id, "cancel"))).details).toEqual([{ path: ["note"], message: "REQUIRED" }]);
    expect(await p.goodsReceiptService.run(gr.id, "cancel", { note: "Wrong delivery note" })).toMatchObject({ status: "cancelled" });
    expect(await onHandOf(p, "COMP")).toBe(35);
    expect((await p.purchaseOrderService.get(po.id)).status).toBe("sent"); // nothing is received any more
  });

  it("refuses to cancel a posted receipt when the materials were already used", async () => {
    const p = await start("worker");
    const po = await sentFor(p, "worker", { supplierId: 2, lines: [{ materialId: 4, qty: 100, unitPrice: 180 }] });
    const gr = await p.goodsReceiptService.create(receiptBody(po, [line(4, 100, 100)]));
    await p.goodsReceiptService.run(gr.id, "post");
    expect(await onHandOf(p, "STEEL")).toBe(310);
    // the stock is counted down to 50 kg, so the 100 kg that arrived cannot go back
    const steel = (await p.balanceService.list({ kind: "material", q: "STEEL", ...all })).items[0];
    const adj = await p.adjustmentService.create({ itemType: "material", itemId: steel.itemId, warehouseId: steel.warehouseId, countedQty: 50, reason: "lost", remarks: "", date: "2026-10-09" });
    await p.adjustmentService.run(adj.id, "request");
    await switchTo("manager");
    await p.adjustmentService.run(adj.id, "approve");
    const error = await failure(p.goodsReceiptService.run(gr.id, "cancel", { note: "Wrong" }));
    expect(error.code).toBe("NOT_ENOUGH_STOCK");
    expect((await p.goodsReceiptService.get(gr.id)).status).toBe("posted");
  });
});

describe("links with Stock, master data and the Dashboard", () => {
  it("shows the open POs of a material in the Stock item and the on-order number in the overview", async () => {
    const p = await start("factory");
    const door = (await p.balanceService.list({ kind: "material", q: "DOOR", ...all })).items[0];
    expect(door.onOrder).toBe(40);
    const item = await p.getStockItem("material", door.itemId);
    expect(item.onOrder).toBe(40);
    expect(item.openOrders).toEqual([expect.objectContaining({ number: "PO-2026-0003", supplier: "SteelCo", qty: 40, status: "partially_received" })]);
    expect((await p.balanceService.list({ kind: "product", ...all })).items.every((row) => row.onOrder === 0)).toBe(true);
  });

  it("does not delete a supplier or a material that a purchase order uses", async () => {
    const p = await start("admin");
    expect((await failure(p.supplierService.remove(3))).code).toBe("IN_USE"); // BackupCo has POs
    expect((await failure(p.master.materialService.remove(5))).code).toBe("IN_USE"); // shelf: stock movements and a draft PO
  });

  it("makes the dashboard count the POs waiting for goods and lists the draft POs for the Purchase Manager", async () => {
    const p = await start("manager");
    const dashboard = await p.getDashboard();
    expect(dashboard.kpis.poWaitingForGoods).toEqual({ count: 2, nextDueDate: "2026-09-20" });
    const pos = dashboard.approvals.filter((item) => item.type === "PO");
    expect(pos).toEqual([expect.objectContaining({ number: "PO-2026-0007", party: "BackupCo", amountJpy: 74800, department: "Purchase" })]);
  });
});
