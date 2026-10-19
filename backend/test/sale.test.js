import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { PDF, PNG, TEXT, codes, completeOrder, makeCustomer, makeMaterial, makeOrder, makeProduct, must, prisma, start, today, year } from "../test-support/harness.js";

describe("QT references", () => {
  let t;
  let customer;
  let p1;
  let p2;
  before(async () => {
    t = await start();
    customer = await makeCustomer(t.as.admin);
    p1 = await makeProduct(t.as.admin, "P1", [], 45000);
    p2 = await makeProduct(t.as.admin, "P2", [], 9000);
  });
  after(() => t.stop());

  const qtBody = (over = {}) => ({
    qtNumber: "QT-001",
    qtDate: "2026-10-01",
    customerId: customer.id,
    notes: "n",
    customerPoNumber: "PO-77",
    customerPoDate: "2026-10-03",
    lines: [{ productId: p1.id, quantity: 10, unitPrice: 45000 }, { productId: p2.id, quantity: 4, unitPrice: 9000 }],
    ...over
  });

  it("creates a Draft with lines, amounts and a total", async () => {
    const q = must(await t.as.sales.post("/qt", qtBody()), 201);
    assert.equal(q.status, "Draft");
    assert.equal(q.customerName, "ACME");
    assert.equal(q.customerAddress, "1 Main St");
    assert.equal(q.total, 10 * 45000 + 4 * 9000);
    assert.deepEqual(q.lines.map((l) => [l.productCode, l.amount]), [["P1", 450000], ["P2", 36000]]);
    assert.equal(q.productionOrderId, null);
    assert.equal(q.productionOrderNumber, null);
    assert.equal(q.customerPoDate, "2026-10-03");
  });

  it("a QT may have no line while it is a Draft", async () => {
    const q = must(await t.as.admin.post("/qt", qtBody({ qtNumber: "QT-EMPTY", lines: undefined })), 201);
    assert.deepEqual(q.lines, []);
    assert.equal(q.total, 0);
  });

  it("validates the body", async () => {
    const res = await t.as.admin.post("/qt", {
      qtNumber: "",
      qtDate: "2026-02-30",
      customerId: 99999,
      customerPoDate: "bad",
      lines: [{ productId: p1.id, quantity: 0, unitPrice: -1 }, { productId: p1.id, quantity: 1, unitPrice: 1 }, { productId: 99999, quantity: 1, unitPrice: 1 }]
    });
    assert.equal(res.status, 400);
    const c = codes(res);
    for (const e of ["qtNumber:REQUIRED", "qtDate:INVALID_DATE", "customerId:INVALID", "customerPoDate:INVALID_DATE", "lines.0.quantity:INVALID", "lines.0.unitPrice:INVALID", "lines:DUPLICATE", "lines.2.productId:INVALID"]) {
      assert.ok(c.includes(e), `${e} in ${c}`);
    }
    assert.deepEqual(codes(await t.as.admin.post("/qt", {})), ["qtNumber:REQUIRED", "qtDate:REQUIRED", "customerId:REQUIRED"]);
  });

  it("a used qtNumber is 409 DUPLICATE_VALUE", async () => {
    const res = await t.as.admin.post("/qt", qtBody());
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "DUPLICATE_VALUE");
  });

  it("lists without lines; filters by q and status; pages", async () => {
    const list = await t.as.sales.get("/qt");
    assert.ok(list.body.meta.total >= 2);
    assert.equal("lines" in list.body.data[0], false);
    assert.equal((await t.as.admin.get("/qt?q=PO-77")).body.data.length >= 1, true);
    assert.equal((await t.as.admin.get("/qt?q=acme")).body.data.length >= 2, true);
    assert.equal((await t.as.admin.get("/qt?status=Confirmed")).body.data.length, 0);
    assert.equal((await t.as.admin.get("/qt?status=Sent")).status, 400);
    assert.equal((await t.as.admin.get("/qt?pageSize=1")).body.data.length, 1);
  });

  it("PUT replaces the lines of a Draft", async () => {
    const id = (await t.as.admin.get("/qt?q=QT-001")).body.data[0].id;
    const upd = must(await t.as.sales.put(`/qt/${id}`, qtBody({ notes: "changed", lines: [{ productId: p2.id, quantity: 1, unitPrice: 500 }] })));
    assert.equal(upd.notes, "changed");
    assert.equal(upd.total, 500);
    assert.equal(upd.lines.length, 1);
  });

  it("Factory Worker has no access to any QT call", async () => {
    for (const [m, p] of [["get", "/qt"], ["get", "/qt/1"], ["post", "/qt"], ["put", "/qt/1"], ["post", "/qt/1/confirm"], ["delete", "/qt/1"]]) {
      assert.equal((await t.as.factory[m](p, {})).status, 403, `${m} ${p}`);
    }
  });

  it("confirm needs a line", async () => {
    const id = (await t.as.admin.get("/qt?q=QT-EMPTY")).body.data[0].id;
    const res = await t.as.sales.post(`/qt/${id}/confirm`);
    assert.equal(res.status, 400);
    assert.deepEqual(codes(res), ["lines:REQUIRED"]);
  });

  it("confirm makes one Draft order from the QT, with a warning when the PO file is missing", async () => {
    const id = (await t.as.admin.get("/qt?q=QT-001")).body.data[0].id;
    const res = must(await t.as.sales.post(`/qt/${id}/confirm`));
    assert.equal(res.alreadyConfirmed, false);
    assert.deepEqual(res.warnings, ["NO_PO_FILE"]);
    assert.equal(res.qt.status, "Confirmed");
    assert.equal(res.qt.productionOrderId, res.order.id);
    assert.equal(res.qt.productionOrderNumber, `ORD-${year()}-0001`);

    const o = res.order;
    assert.equal(o.status, "Draft");
    assert.equal(o.started, false);
    assert.equal(o.qtNumber, "QT-001");
    assert.equal(o.customerPoNumber, "PO-77");
    assert.equal(o.customerName, "ACME");
    assert.equal(o.orderDate, today());
    assert.deepEqual(o.lines.map((l) => [l.productCode, l.quantity, l.unitPrice, l.processes.length]), [["P2", 1, 500, 0]]);
    assert.deepEqual(o.history, []);
    assert.equal(o.invoice, null);
  });

  it("pressing confirm again changes nothing", async () => {
    const id = (await t.as.admin.get("/qt?q=QT-001")).body.data[0].id;
    const res = must(await t.as.admin.post(`/qt/${id}/confirm`));
    assert.equal(res.alreadyConfirmed, true);
    assert.equal((await t.as.admin.get("/orders")).body.meta.total, 1);
  });

  it("a confirmed QT keeps its customer and lines (QT_LOCKED) but notes may change", async () => {
    const q = (await t.as.admin.get("/qt?q=QT-001")).body.data[0];
    const other = await makeCustomer(t.as.admin, "Other");
    const lines = must(await t.as.admin.get(`/qt/${q.id}`)).lines.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice }));

    const cust = await t.as.admin.put(`/qt/${q.id}`, qtBody({ customerId: other.id, lines }));
    assert.equal(cust.status, 409);
    assert.equal(cust.body.error, "QT_LOCKED");
    const ln = await t.as.admin.put(`/qt/${q.id}`, qtBody({ lines: [{ productId: p1.id, quantity: 9, unitPrice: 1 }] }));
    assert.equal(ln.body.error, "QT_LOCKED");

    const ok = must(await t.as.admin.put(`/qt/${q.id}`, qtBody({ notes: "still editable", lines })));
    assert.equal(ok.notes, "still editable");
    assert.equal(ok.status, "Confirmed");
  });

  it("step: Draft, Confirmed, InProduction, Done (computed from the order), and the list filters by it", async () => {
    const confirmed = (await t.as.admin.get("/qt?q=QT-001")).body.data[0];
    assert.equal(confirmed.step, "Confirmed", "confirmed, the order has not started");
    assert.equal(must(await t.as.admin.get(`/qt/${confirmed.id}`)).step, "Confirmed");
    assert.equal((await t.as.admin.get("/qt?step=Draft")).body.data.every((x) => x.step === "Draft"), true);
    assert.equal((await t.as.admin.get("/qt?step=Confirmed")).body.data.length >= 1, true);
    assert.equal((await t.as.admin.get("/qt?step=InProduction")).body.data.length, 0);
    assert.equal((await t.as.admin.get("/qt?step=Done")).body.data.length, 0);
    assert.equal((await t.as.admin.get("/qt?step=Sent")).status, 400);
  });

  it("a confirmed QT cannot be deleted (IN_USE, kind order); a Draft can", async () => {
    const confirmed = (await t.as.admin.get("/qt?q=QT-001")).body.data[0];
    const res = await t.as.admin.delete(`/qt/${confirmed.id}`);
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "IN_USE");
    assert.equal(res.body.errors[0].kind, "order");
    assert.deepEqual(res.body.errors[0].items, [`ORD-${year()}-0001`]);

    const draft = (await t.as.admin.get("/qt?q=QT-EMPTY")).body.data[0];
    assert.equal((await t.as.sales.delete(`/qt/${draft.id}`)).status, 200);
    assert.equal((await t.as.admin.get(`/qt/${draft.id}`)).status, 404);
  });

  it("a customer or product on a QT cannot be deleted", async () => {
    const q = must(await t.as.admin.post("/qt", qtBody({ qtNumber: "QT-HOLD", lines: [{ productId: p1.id, quantity: 1, unitPrice: 1 }] })), 201);
    const prod = await t.as.admin.delete(`/products/${p1.id}`);
    assert.equal(prod.status, 409);
    assert.ok(prod.body.errors.some((e) => e.kind === "qt" && e.items.includes("QT-HOLD")));
    must(await t.as.admin.delete(`/qt/${q.id}`));
  });
});

describe("files (attachments)", () => {
  let t;
  let customer;
  let product;
  before(async () => {
    t = await start();
    customer = await makeCustomer(t.as.admin);
    product = await makeProduct(t.as.admin, "PF");
  });
  after(() => t.stop());

  const upload = (c, ownerType, ownerId, kind, dataUrl = PDF, name = "doc.pdf") => c.post("/attachments", { ownerType, ownerId, kind, file: { name, dataUrl } });
  const newQt = async (qtNumber) =>
    must(await t.as.admin.post("/qt", { qtNumber, qtDate: today(), customerId: customer.id, lines: [{ productId: product.id, quantity: 1, unitPrice: 1 }] }), 201);

  it("uploads a PDF to a QT; the type is read from the file", async () => {
    const qt = await newQt("QT-F1");
    const res = await upload(t.as.sales, "QtReference", qt.id, "PO_FILE", PDF, "my po.pdf");
    assert.equal(res.status, 201);
    const a = res.body.data;
    assert.deepEqual([a.ownerType, a.kind, a.fileName, a.fileType, a.uploadedByName], ["QtReference", "PO_FILE", "my po.pdf", "application/pdf", "Sale Worker"]);
    assert.ok(a.size > 0);
    assert.equal("file" in a, false, "the list and the create answer carry no content");

    const png = await upload(t.as.sales, "QtReference", qt.id, "OTHER", PNG, "x.png");
    assert.equal(png.body.data.fileType, "image/png");
  });

  it("GET /attachments/:id returns the content as a data URL", async () => {
    const qt = await newQt("QT-F2");
    const a = must(await upload(t.as.admin, "QtReference", qt.id, "QUOTATION"), 201);
    const got = must(await t.as.admin.get(`/attachments/${a.id}`));
    assert.equal(got.file.type, "application/pdf");
    assert.equal(got.file.name, "doc.pdf");
    assert.equal(got.file.dataUrl, PDF);
  });

  it("lists the files of one record, newest first", async () => {
    const qt = await newQt("QT-F3");
    const a = must(await upload(t.as.admin, "QtReference", qt.id, "OTHER"), 201);
    const b = must(await upload(t.as.admin, "QtReference", qt.id, "QUOTATION"), 201);
    const list = must(await t.as.admin.get(`/attachments?ownerType=QtReference&ownerId=${qt.id}`));
    assert.deepEqual(list.map((x) => x.id), [b.id, a.id]);
  });

  it("rejects a wrong file type, a bad kind, a bad owner", async () => {
    const qt = await newQt("QT-F4");
    assert.deepEqual(codes(await upload(t.as.admin, "QtReference", qt.id, "OTHER", TEXT, "a.pdf")), ["file:FILE_TYPE"]);
    assert.deepEqual(codes(await upload(t.as.admin, "QtReference", qt.id, "EVIDENCE")), ["kind:INVALID"]);
    assert.deepEqual(codes(await upload(t.as.admin, "Nothing", 1, "OTHER")), ["ownerType:INVALID"]);
    assert.deepEqual(codes(await t.as.admin.post("/attachments", {})), ["ownerType:REQUIRED"]);
    assert.deepEqual(codes(await t.as.admin.post("/attachments", { ownerType: "QtReference", ownerId: qt.id, kind: "OTHER" })), ["file:REQUIRED"]);
    assert.equal((await upload(t.as.admin, "QtReference", 99999, "OTHER")).status, 404);
  });

  it("a file over 10 MB is FILE_TOO_BIG", async () => {
    const qt = await newQt("QT-F5");
    const big = `data:application/pdf;base64,${Buffer.concat([Buffer.from("%PDF"), Buffer.alloc(10 * 1024 * 1024)]).toString("base64")}`;
    const res = await upload(t.as.admin, "QtReference", qt.id, "OTHER", big);
    assert.equal(res.status, 400);
    assert.deepEqual(codes(res), ["file:FILE_TOO_BIG"]);
  });

  it("a new PO_FILE replaces the old one", async () => {
    const qt = await newQt("QT-F6");
    must(await upload(t.as.admin, "QtReference", qt.id, "PO_FILE", PDF, "first.pdf"), 201);
    must(await upload(t.as.admin, "QtReference", qt.id, "PO_FILE", PNG, "second.png"), 201);
    const list = must(await t.as.admin.get(`/attachments?ownerType=QtReference&ownerId=${qt.id}`));
    assert.deepEqual(list.map((x) => x.fileName), ["second.png"]);
  });

  it("Confirm copies the PO file to the order; no warning; it follows later changes; the copy cannot be deleted", async () => {
    const qt = await newQt("QT-F7");
    must(await upload(t.as.admin, "QtReference", qt.id, "PO_FILE", PDF, "po-1.pdf"), 201);
    const res = must(await t.as.sales.post(`/qt/${qt.id}/confirm`));
    assert.deepEqual(res.warnings, []);

    const files = () => t.as.factory.get(`/attachments?ownerType=ProductionOrder&ownerId=${res.order.id}`).then((r) => r.body.data);
    let onOrder = await files();
    assert.deepEqual(onOrder.map((f) => [f.kind, f.fileName]), [["PO_FILE", "po-1.pdf"]]);
    // a Factory Worker, who cannot read the QT, reads the PO file on the order
    assert.equal((await t.as.factory.get(`/attachments/${onOrder[0].id}`)).status, 200);

    // a new PO file on the confirmed QT replaces the copy
    must(await upload(t.as.sales, "QtReference", qt.id, "PO_FILE", PNG, "po-2.png"), 201);
    onOrder = await files();
    assert.deepEqual(onOrder.map((f) => f.fileName), ["po-2.png"]);

    // the copy is locked on the order
    const del = await t.as.admin.delete(`/attachments/${onOrder[0].id}`);
    assert.equal(del.status, 409);
    assert.equal(del.body.error, "FILE_LOCKED");

    // deleting the PO file from the QT removes the copy too
    const qtFile = must(await t.as.admin.get(`/attachments?ownerType=QtReference&ownerId=${qt.id}`))[0];
    assert.equal((await t.as.sales.delete(`/attachments/${qtFile.id}`)).status, 200);
    assert.deepEqual(await files(), []);
  });

  it("a user cannot upload a PO_FILE to a production order", async () => {
    const { order } = await makeOrder(t.as.admin, { product, customer, qtNumber: "QT-F8" });
    assert.deepEqual(codes(await upload(t.as.admin, "ProductionOrder", order.id, "PO_FILE")), ["kind:INVALID"]);
  });

  it("evidence of an order: everybody reads, Admin and Factory upload and delete", async () => {
    const { order } = await makeOrder(t.as.admin, { product, customer, qtNumber: "QT-F9" });
    const up = await upload(t.as.factory, "ProductionOrder", order.id, "EVIDENCE", PNG, "weld.png");
    assert.equal(up.status, 201);
    assert.equal((await upload(t.as.sales, "ProductionOrder", order.id, "EVIDENCE")).status, 403);
    assert.equal((await upload(t.as.admin, "ProductionOrder", order.id, "OTHER")).status, 201);

    assert.equal((await t.as.sales.get(`/attachments?ownerType=ProductionOrder&ownerId=${order.id}`)).body.data.length, 2);
    assert.equal((await t.as.sales.get(`/attachments/${up.body.data.id}`)).status, 200);

    assert.equal((await t.as.sales.delete(`/attachments/${up.body.data.id}`)).status, 403);
    assert.equal((await t.as.factory.delete(`/attachments/${up.body.data.id}`)).status, 200);
    assert.equal((await t.as.admin.get(`/attachments/${up.body.data.id}`)).status, 404);
  });

  it("files of a QT: Factory Worker gets 403 (before 404)", async () => {
    const qt = await newQt("QT-F10");
    const a = must(await upload(t.as.admin, "QtReference", qt.id, "OTHER"), 201);
    assert.equal((await t.as.factory.get(`/attachments?ownerType=QtReference&ownerId=${qt.id}`)).status, 403);
    assert.equal((await t.as.factory.get(`/attachments/${a.id}`)).status, 403);
    assert.equal((await upload(t.as.factory, "QtReference", 99999, "OTHER")).status, 403);
    assert.equal((await t.as.factory.delete(`/attachments/${a.id}`)).status, 403);
  });

  it("deleting a QT deletes its files", async () => {
    const qt = await newQt("QT-F11");
    must(await upload(t.as.admin, "QtReference", qt.id, "OTHER"), 201);
    must(await t.as.admin.delete(`/qt/${qt.id}`));
    assert.equal(await prisma.attachment.count({ where: { ownerType: "QtReference", ownerId: qt.id } }), 0);
  });
});

describe("production orders", () => {
  let t;
  let customer;
  let mat;
  let product;
  before(async () => {
    t = await start();
    customer = await makeCustomer(t.as.admin);
    mat = await makeMaterial(t.as.admin, "STEEL", [{ lotNumber: "OLD", quantity: 30 }, { lotNumber: "NEW", quantity: 100 }]);
    product = await makeProduct(t.as.admin, "FRAME", [{ materialId: mat.id, quantity: 2 }]);
  });
  after(() => t.stop());

  const progress = (c, order, processId, body) => c.post(`/orders/${order.id}/progress`, { processId, status: "In Progress", completedQuantity: 1, workDate: today(), note: "", ...body });

  it("lists and reads orders (everybody), with the computed status filter", async () => {
    const { order } = await makeOrder(t.as.admin, { product, customer, quantity: 5, qtNumber: "QT-O1" });
    assert.equal(order.orderNumber, `ORD-${year()}-0001`);
    assert.equal(order.lines[0].processes.length, 2);
    assert.deepEqual(order.lines[0].processes.map((p) => [p.sequence, p.name, p.status, p.completedQuantity]), [[1, "Cut", "Not Started", 0], [2, "Weld", "Not Started", 0]]);

    for (const c of [t.as.admin, t.as.sales, t.as.factory]) assert.equal((await c.get("/orders")).status, 200);
    const list = (await t.as.sales.get("/orders")).body.data;
    assert.equal("lines" in list[0], false);
    assert.equal("history" in list[0], false);
    assert.equal((await t.as.admin.get("/orders?status=Draft")).body.meta.total, 1);
    assert.equal((await t.as.admin.get("/orders?status=Completed")).body.meta.total, 0);
    assert.equal((await t.as.admin.get("/orders?status=New")).status, 400);
    assert.equal((await t.as.admin.get("/orders?q=ORD-")).body.data.length, 1);
    assert.equal((await t.as.admin.get("/orders?q=QT-O1")).body.data.length, 1);
    assert.equal((await t.as.admin.get("/orders?q=nothing")).body.data.length, 0);
    assert.equal((await t.as.admin.get("/orders/99999")).status, 404);
  });

  it("PUT: Admin and Sale Worker edit before the start; a Factory Worker gets 403; validation", async () => {
    const { order } = await makeOrder(t.as.admin, { product, customer, qtNumber: "QT-O2" });
    const body = { orderDate: "2026-11-01", notes: "rush", lines: [{ productId: product.id, quantity: 3, unitPrice: 50, processes: [{ name: "Only", instructions: "be careful" }] }] };

    assert.equal((await t.as.factory.put(`/orders/${order.id}`, body)).status, 403);
    assert.equal((await t.as.factory.put("/orders/99999", body)).status, 403);
    const upd = must(await t.as.sales.put(`/orders/${order.id}`, body));
    assert.equal(upd.orderDate, "2026-11-01");
    assert.equal(upd.notes, "rush");
    assert.deepEqual(upd.lines.map((l) => [l.quantity, l.unitPrice, l.processes.map((p) => p.instructions)]), [[3, 50, ["be careful"]]]);
    assert.equal(upd.qtNumber, "QT-O2", "the QT never changes");

    const bad = await t.as.admin.put(`/orders/${order.id}`, { orderDate: "", lines: [{ productId: 99999, quantity: 0, unitPrice: -1, processes: [{ name: "" }] }] });
    assert.equal(bad.status, 400);
    const c = codes(bad);
    for (const e of ["orderDate:REQUIRED", "lines.0.productId:INVALID", "lines.0.quantity:INVALID", "lines.0.unitPrice:INVALID", "lines.0.processes.0.name:REQUIRED"]) assert.ok(c.includes(e), e);
    assert.deepEqual(codes(await t.as.admin.put(`/orders/${order.id}`, { ...body, orderDate: "2026-02-30" })), ["orderDate:INVALID_DATE"]);
    assert.equal((await t.as.admin.put("/orders/99999", body)).status, 404);
  });

  it("start: needs a line and a process on every line (ORDER_NOT_READY)", async () => {
    const { order } = await makeOrder(t.as.admin, { product, customer, processes: [], qtNumber: "QT-O3" });
    const res = await t.as.factory.post(`/orders/${order.id}/start`);
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "ORDER_NOT_READY");
  });

  it("start: a Sale Worker gets 403", async () => {
    const { order } = await makeOrder(t.as.admin, { product, customer, qtNumber: "QT-O4" });
    assert.equal((await t.as.sales.post(`/orders/${order.id}/start`)).status, 403);
    assert.equal((await t.as.sales.post(`/orders/${order.id}/progress`, {})).status, 403);
  });

  it("start: short stock is 409 STOCK_SHORT with the short materials, and nothing changes", async () => {
    const { order } = await makeOrder(t.as.admin, { product, customer, quantity: 100, qtNumber: "QT-O5" }); // needs 200, has 130
    const res = await t.as.factory.post(`/orders/${order.id}/start`);
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "STOCK_SHORT");
    assert.deepEqual(res.body.errors, [{ materialId: mat.id, materialCode: "STEEL", materialName: "Material STEEL", need: 200, have: 130 }]);
    assert.equal(must(await t.as.admin.get(`/orders/${order.id}`)).started, false);
    assert.equal(must(await t.as.admin.get(`/materials/${mat.id}`)).total, 130);
  });

  it("start: deducts the BOM, oldest lot first, as Deduct movements tied to the order", async () => {
    const { order } = await makeOrder(t.as.admin, { product, customer, quantity: 20, qtNumber: "QT-O6" }); // needs 40: 30 from OLD, 10 from NEW
    const started = must(await t.as.factory.post(`/orders/${order.id}/start`));
    assert.equal(started.started, true);
    assert.ok(started.startedAt);
    assert.equal(started.status, "Draft", "started but no progress yet is still Draft");

    const m = must(await t.as.admin.get(`/materials/${mat.id}`));
    assert.equal(m.lots.find((l) => l.lotNumber === "OLD").quantity, 0);
    assert.equal(m.lots.find((l) => l.lotNumber === "NEW").quantity, 90);

    const moves = (await t.as.admin.get(`/stock-changes?q=${started.orderNumber}`)).body.data;
    assert.equal(moves.length, 2);
    assert.ok(moves.every((e) => e.kind === "Deduct" && e.note === "Production started" && e.orderId === order.id && e.orderNumber === started.orderNumber));
    assert.deepEqual(moves.map((e) => e.change).sort((a, b) => a - b), [-30, -10]);
  });

  it("start: a second start is 409 ALREADY_STARTED; PUT after the start is 409 ORDER_LOCKED", async () => {
    const order = (await t.as.admin.get("/orders?q=QT-O6")).body.data[0];
    const again = await t.as.admin.post(`/orders/${order.id}/start`);
    assert.equal(again.body.error, "ALREADY_STARTED");
    const put = await t.as.admin.put(`/orders/${order.id}`, { orderDate: today(), notes: "", lines: [] });
    assert.equal(put.status, 409);
    assert.equal(put.body.error, "ORDER_LOCKED");
    assert.equal((await t.as.admin.post("/orders/99999/start")).status, 404);
  });

  it("progress: only on a started order (ORDER_NOT_STARTED)", async () => {
    const { order } = await makeOrder(t.as.admin, { product, customer, quantity: 1, qtNumber: "QT-O7" });
    const res = await progress(t.as.factory, order, order.lines[0].processes[0].id, {});
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "ORDER_NOT_STARTED");
  });

  describe("progress rules", () => {
    let order;
    let cut;
    let weld;
    before(async () => {
      ({ order } = await makeOrder(t.as.admin, { product, customer, quantity: 4, qtNumber: "QT-O8" }));
      await t.as.factory.post(`/orders/${order.id}/start`);
      [cut, weld] = order.lines[0].processes;
    });

    it("validates the processId, status, quantity and date", async () => {
      assert.deepEqual(codes(await progress(t.as.factory, order, 99999, {})), ["processId:INVALID"]);
      assert.deepEqual(codes(await t.as.factory.post(`/orders/${order.id}/progress`, {})).slice(0, 2), ["processId:REQUIRED", "status:REQUIRED"]);
      assert.deepEqual(codes(await progress(t.as.factory, order, cut.id, { status: "Done" })), ["status:INVALID"]);
      assert.deepEqual(codes(await progress(t.as.factory, order, cut.id, { workDate: "2026-02-30" })), ["workDate:INVALID_DATE"]);
      assert.deepEqual(codes(await progress(t.as.factory, order, cut.id, { workDate: undefined })), ["workDate:REQUIRED"]);
      assert.deepEqual(codes(await progress(t.as.factory, order, cut.id, { completedQuantity: -1 })), ["completedQuantity:INVALID"]);
      assert.deepEqual(codes(await progress(t.as.factory, order, cut.id, { completedQuantity: 1.5 })), ["completedQuantity:INVALID"]);
    });

    it("quantity rules: TOO_HIGH, MUST_EQUAL_REQUIRED, MUST_BE_COMPLETED, MUST_BE_ZERO", async () => {
      assert.deepEqual(codes(await progress(t.as.factory, order, cut.id, { completedQuantity: 5 })), ["completedQuantity:TOO_HIGH"]);
      assert.deepEqual(codes(await progress(t.as.factory, order, cut.id, { status: "Completed", completedQuantity: 3 })), ["completedQuantity:MUST_EQUAL_REQUIRED"]);
      assert.deepEqual(codes(await progress(t.as.factory, order, cut.id, { status: "In Progress", completedQuantity: 4 })), ["completedQuantity:MUST_BE_COMPLETED"]);
      assert.deepEqual(codes(await progress(t.as.factory, order, cut.id, { status: "Not Started", completedQuantity: 1 })), ["completedQuantity:MUST_BE_ZERO"]);
    });

    it("the first progress makes the order In Progress; every entry goes to the history", async () => {
      const o = must(await progress(t.as.factory, order, cut.id, { completedQuantity: 2, note: "half" }));
      assert.equal(o.status, "In Progress");
      assert.equal(o.lines[0].processes[0].completedQuantity, 2);
      assert.equal(o.history.length, 1);
      const h = o.history[0];
      assert.deepEqual([h.processName, h.status, h.completedQuantity, h.workDate, h.note, h.userName], ["Cut", "In Progress", 2, today(), "half", "Factory Worker"]);
      assert.equal(o.history[0].lineId, o.lines[0].id);
      assert.equal((await t.as.admin.get("/orders?status=In Progress")).body.data.some((x) => x.id === order.id), true);
    });

    it("completedQuantity is the latest total, not an amount to add", async () => {
      const o = must(await progress(t.as.factory, order, cut.id, { completedQuantity: 3 }));
      assert.equal(o.lines[0].processes[0].completedQuantity, 3);
    });

    it("the order is Completed when every process is", async () => {
      must(await progress(t.as.factory, order, cut.id, { status: "Completed", completedQuantity: 4 }));
      const o = must(await progress(t.as.factory, order, weld.id, { status: "Completed", completedQuantity: 4 }));
      assert.equal(o.status, "Completed");
      assert.equal(o.history.length, 4);
      assert.equal((await t.as.admin.get("/orders?status=Completed")).body.data.some((x) => x.id === order.id), true);
    });

    it("a completed process: a Worker gets 403 COMPLETED_LOCKED; the Admin may reopen it, with a note", async () => {
      const locked = await progress(t.as.factory, order, cut.id, { status: "In Progress", completedQuantity: 2, note: "redo" });
      assert.equal(locked.status, 403);
      assert.equal(locked.body.error, "COMPLETED_LOCKED");

      const noNote = await progress(t.as.admin, order, cut.id, { status: "In Progress", completedQuantity: 2 });
      assert.deepEqual(codes(noNote), ["note:REOPEN_NOTE"]);
      const reopened = must(await progress(t.as.admin, order, cut.id, { status: "In Progress", completedQuantity: 2, note: "rework" }));
      assert.equal(reopened.status, "In Progress");
    });
  });

  it("the list filters by invoiced=true|false (the Accounting page asks for status=Completed&invoiced=false)", async () => {
    const { order } = await makeOrder(t.as.admin, { product, customer, quantity: 1, qtNumber: "QT-O10" });
    await t.as.factory.post(`/orders/${order.id}/start`);
    await completeOrder(t.as.factory, order);
    const ids = async (q) => (await t.as.admin.get(`/orders?${q}`)).body.data.map((o) => o.id);
    assert.ok((await ids("status=Completed&invoiced=false")).includes(order.id));
    assert.equal((await ids("invoiced=true")).includes(order.id), false);
    must(await t.as.admin.post("/invoices", { orderId: order.id, invoiceDate: today() }), 201);
    assert.equal((await ids("status=Completed&invoiced=false")).includes(order.id), false);
    assert.ok((await ids("invoiced=true")).includes(order.id));
    assert.equal((await t.as.admin.get("/orders?invoiced=maybe")).status, 400);
  });

  it("an order with an invoice locks its progress (ORDER_INVOICED)", async () => {
    const { order } = await makeOrder(t.as.admin, { product, customer, quantity: 1, qtNumber: "QT-O9" });
    await t.as.factory.post(`/orders/${order.id}/start`);
    const done = await completeOrder(t.as.factory, order);
    must(await t.as.admin.post("/invoices", { orderId: order.id, invoiceDate: today() }), 201);
    const res = await progress(t.as.admin, done, done.lines[0].processes[0].id, { status: "In Progress", completedQuantity: 0, note: "x" });
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "ORDER_INVOICED");
    const o = must(await t.as.admin.get(`/orders/${order.id}`));
    assert.match(o.invoice.invoiceNumber, new RegExp(`^INV-${year()}-\\d{4}$`));
    assert.equal(o.invoice.status, "Unpaid");
    assert.equal(o.invoice.receiptNumber, null);
  });
});
