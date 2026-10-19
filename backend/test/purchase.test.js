import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { PDF, codes, makeMaterial, must, start, today, year } from "../test-support/harness.js";

describe("suppliers", () => {
  let t;
  let m1;
  let m2;
  before(async () => {
    t = await start();
    m1 = await makeMaterial(t.as.admin, "RESIN", [{ lotNumber: "L", quantity: 1 }], { unit: "kg" });
    m2 = await makeMaterial(t.as.admin, "BOLT", [{ lotNumber: "L", quantity: 1 }]);
  });
  after(() => t.stop());

  const body = (over = {}) => ({ code: "SUP-1", name: "Resin Corp", contact: "Mr Sato", address: "Osaka", items: [{ materialId: m1.id, unitPrice: 380 }], ...over });

  it("creates a supplier with its items; active defaults to true", async () => {
    const s = must(await t.as.admin.post("/suppliers", body()), 201);
    assert.equal(s.active, true);
    assert.deepEqual(s.items, [{ materialId: m1.id, materialCode: "RESIN", materialName: "Material RESIN", unit: "kg", unitPrice: 380 }]);
  });

  it("validates code, name, active and items", async () => {
    const res = await t.as.admin.post("/suppliers", { code: "", name: "", active: "yes", items: [{ materialId: m1.id, unitPrice: -1 }, { materialId: m1.id, unitPrice: 1 }, { materialId: 99999, unitPrice: 1 }, { unitPrice: 1 }] });
    assert.equal(res.status, 400);
    const c = codes(res);
    for (const e of ["code:REQUIRED", "name:REQUIRED", "active:INVALID", "items.0.unitPrice:INVALID", "items:DUPLICATE", "items.2.materialId:REQUIRED", "items.3.materialId:REQUIRED"]) assert.ok(c.includes(e), `${e} in ${c}`);
  });

  it("a used code is 409 DUPLICATE_VALUE", async () => {
    const res = await t.as.admin.post("/suppliers", body());
    assert.equal(res.status, 409);
    assert.deepEqual(codes(res), ["code:DUPLICATE"]);
  });

  it("PUT replaces the items and switches active", async () => {
    const id = (await t.as.admin.get("/suppliers")).body.data[0].id;
    const upd = must(await t.as.admin.put(`/suppliers/${id}`, body({ active: false, items: [{ materialId: m2.id, unitPrice: 5 }] })));
    assert.equal(upd.active, false);
    assert.deepEqual(upd.items.map((i) => i.materialCode), ["BOLT"]);
    must(await t.as.admin.put(`/suppliers/${id}`, body({ active: true })));
  });

  it("lists with q, the active filter and paging", async () => {
    must(await t.as.admin.post("/suppliers", body({ code: "SUP-2", name: "Idle Ltd", contact: "Ms Tanaka", active: false, items: [] })), 201);
    assert.equal((await t.as.admin.get("/suppliers")).body.meta.total, 2);
    assert.equal((await t.as.admin.get("/suppliers?q=resin")).body.data.length, 1);
    assert.equal((await t.as.admin.get("/suppliers?q=sato")).body.data.length, 1);
    assert.deepEqual((await t.as.admin.get("/suppliers?active=true")).body.data.map((s) => s.code), ["SUP-1"]);
    assert.deepEqual((await t.as.admin.get("/suppliers?active=false")).body.data.map((s) => s.code), ["SUP-2"]);
    assert.equal((await t.as.admin.get("/suppliers?pageSize=1&page=2")).body.data.length, 1);
    assert.equal((await t.as.admin.get("/suppliers/99999")).status, 404);
  });

  it("a list row has itemCount and no items; materialId keeps the suppliers that sell it; timestamps are there", async () => {
    const row = (await t.as.admin.get("/suppliers")).body.data.find((x) => x.code === "SUP-1");
    assert.equal(row.itemCount, 1);
    assert.equal("items" in row, false);
    assert.deepEqual((await t.as.admin.get(`/suppliers?materialId=${m1.id}`)).body.data.map((x) => x.code), ["SUP-1"]);
    assert.equal((await t.as.admin.get(`/suppliers?materialId=${m2.id}`)).body.data.length, 0);
    const one = must(await t.as.admin.get(`/suppliers/${row.id}`));
    assert.ok(one.createdAt && one.updatedAt);
    assert.equal(one.items.length, 1);
  });

  it("Admin full, Factory Worker view, Sale Worker none", async () => {
    assert.equal((await t.as.factory.get("/suppliers")).status, 200);
    assert.equal((await t.as.factory.get("/suppliers/1")).status, 200);
    assert.equal((await t.as.factory.post("/suppliers", body({ code: "X" }))).status, 403);
    assert.equal((await t.as.factory.put("/suppliers/1", body())).status, 403);
    assert.equal((await t.as.factory.delete("/suppliers/1")).status, 403);
    assert.equal((await t.as.sales.get("/suppliers")).status, 403);
    assert.equal((await t.as.sales.get("/suppliers/99999")).status, 403);
  });

  it("a material sold by a supplier cannot be deleted; a free supplier is deleted with its items", async () => {
    const used = await t.as.admin.delete(`/materials/${m1.id}`);
    assert.equal(used.status, 409);
    assert.ok(used.body.errors.some((e) => e.kind === "supplier" && e.items.includes("SUP-1")));

    const id = (await t.as.admin.get("/suppliers?q=Idle")).body.data[0].id;
    assert.equal((await t.as.admin.delete(`/suppliers/${id}`)).status, 200);
    assert.equal((await t.as.admin.get(`/suppliers/${id}`)).status, 404);
  });
});

describe("purchase orders", () => {
  let t;
  let resin;
  let bolt;
  let other;
  let sup;
  let inactive;

  before(async () => {
    t = await start();
    resin = await makeMaterial(t.as.admin, "RESIN", [{ lotNumber: "OLD", quantity: 10 }], { unit: "kg" });
    bolt = await makeMaterial(t.as.admin, "BOLT", [], {});
    other = await makeMaterial(t.as.admin, "OTHER", [], {});
    sup = must(await t.as.admin.post("/suppliers", { code: "S1", name: "Supplier One", items: [{ materialId: resin.id, unitPrice: 380 }, { materialId: bolt.id, unitPrice: 10 }] }), 201);
    inactive = must(await t.as.admin.post("/suppliers", { code: "S2", name: "Closed", active: false, items: [{ materialId: resin.id, unitPrice: 1 }] }), 201);
  });
  after(() => t.stop());

  const poBody = (over = {}) => ({
    supplierId: sup.id,
    requiredDate: "2026-10-30",
    department: "Factory",
    notes: "urgent",
    lines: [{ materialId: resin.id, quantity: 120.5, unitPrice: 400 }, { materialId: bolt.id, quantity: 100 }],
    ...over
  });
  const make = async (over) => must(await t.as.factory.post("/purchase-orders", poBody(over)), 201);
  const receive = (c, po, lot = "LOT-1") => c.post(`/purchase-orders/${po.id}/status`, { status: "Received", lots: po.lines.map((l) => ({ lineId: l.id, lotNumber: `${lot}-${l.materialCode}` })) });
  const stockOf = async (m) => must(await t.as.admin.get(`/materials/${m.id}`));

  describe("create and edit", () => {
    it("makes a Draft: a numbered PO with prices, amounts and a total", async () => {
      const po = await make();
      assert.equal(po.poNumber, `PO-${year()}-0001`);
      assert.equal(po.status, "Draft");
      assert.equal(po.supplierName, "Supplier One");
      assert.equal(po.department, "Factory");
      assert.equal(po.createdByName, "Factory Worker");
      assert.equal(po.paid, false);
      assert.equal(po.payment, null);
      assert.equal(po.receivedAt, null);
      assert.deepEqual(
        po.lines.map((l) => [l.materialCode, l.unit, l.quantity, l.unitPrice, l.amount, l.lotNumber]),
        [["RESIN", "kg", 120.5, 400, 48200, null], ["BOLT", "pcs", 100, 10, 1000, null]]
      );
      assert.equal(po.total, 49200, "the price of the second line started from the supplier's price (10)");
    });

    it("the department is required (the frontend starts it from the department of the user)", async () => {
      const res = await t.as.admin.post("/purchase-orders", poBody({ department: undefined }));
      assert.equal(res.status, 400);
      assert.deepEqual(codes(res), ["department:REQUIRED"]);
    });

    it("validates the fields", async () => {
      const res = await t.as.admin.post("/purchase-orders", {
        supplierId: sup.id,
        requiredDate: "2026-02-30",
        department: "Mars",
        lines: [{ materialId: resin.id, quantity: 0 }, { materialId: resin.id, quantity: 1 }, { materialId: other.id, quantity: 1 }, { materialId: 99999, quantity: 1 }, { materialId: bolt.id, quantity: 1, unitPrice: -5 }]
      });
      assert.equal(res.status, 400);
      const c = codes(res);
      for (const e of ["requiredDate:INVALID_DATE", "department:INVALID", "lines.0.quantity:INVALID", "lines:DUPLICATE", "lines.2.materialId:NOT_SOLD_BY_SUPPLIER", "lines.3.materialId:REQUIRED", "lines.4.unitPrice:INVALID"]) assert.ok(c.includes(e), `${e} in ${c}`);
      assert.deepEqual(codes(await t.as.admin.post("/purchase-orders", {})), ["supplierId:REQUIRED", "requiredDate:REQUIRED", "department:REQUIRED", "lines:REQUIRED"]);
      assert.ok(codes(await t.as.admin.post("/purchase-orders", poBody({ supplierId: 99999 }))).includes("supplierId:REQUIRED"));
    });

    it("only a material of the chosen supplier; an inactive supplier cannot be picked", async () => {
      assert.ok(codes(await t.as.admin.post("/purchase-orders", poBody({ lines: [{ materialId: other.id, quantity: 1 }] }))).includes("lines.0.materialId:NOT_SOLD_BY_SUPPLIER"));
      assert.deepEqual(codes(await t.as.admin.post("/purchase-orders", poBody({ supplierId: inactive.id, lines: [{ materialId: resin.id, quantity: 1 }] }))), ["supplierId:SUPPLIER_INACTIVE"]);
    });

    it("PUT replaces the supplier data and lines of a Draft", async () => {
      const po = await make();
      const upd = must(await t.as.admin.put(`/purchase-orders/${po.id}`, poBody({ notes: "changed", requiredDate: "2026-11-15", lines: [{ materialId: bolt.id, quantity: 5, unitPrice: 20 }] })));
      assert.equal(upd.notes, "changed");
      assert.equal(upd.requiredDate, "2026-11-15");
      assert.equal(upd.total, 100);
      assert.equal(upd.lines.length, 1);
      assert.equal(upd.poNumber, po.poNumber);
    });

    it("a supplier that became inactive cannot be chosen again on a changed PO", async () => {
      const s = must(await t.as.admin.post("/suppliers", { code: "S3", name: "Goes quiet", items: [{ materialId: bolt.id, unitPrice: 1 }] }), 201);
      const po = must(await t.as.admin.post("/purchase-orders", poBody({ supplierId: s.id, lines: [{ materialId: bolt.id, quantity: 1 }] })), 201);
      must(await t.as.admin.put(`/suppliers/${s.id}`, { code: "S3", name: "Goes quiet", active: false, items: [{ materialId: bolt.id, unitPrice: 1 }] }));
      const upd = await t.as.admin.put(`/purchase-orders/${po.id}`, poBody({ supplierId: s.id, lines: [{ materialId: bolt.id, quantity: 2 }] }));
      assert.equal(upd.status, 400);
      assert.deepEqual(codes(upd), ["supplierId:SUPPLIER_INACTIVE"]);
    });

    it("deletes a Draft with its files", async () => {
      const po = await make();
      must(await t.as.factory.post("/attachments", { ownerType: "PurchaseOrder", ownerId: po.id, kind: "PO_FILE", file: { name: "po.pdf", dataUrl: PDF } }), 201);
      assert.equal((await t.as.factory.delete(`/purchase-orders/${po.id}`)).status, 200);
      assert.equal((await t.as.admin.get(`/purchase-orders/${po.id}`)).status, 404);
    });
  });

  describe("who may call", () => {
    it("Admin and Factory Worker; a Sale Worker gets 403 on every call, before any lookup", async () => {
      for (const [m, p] of [["get", "/purchase-orders"], ["get", "/purchase-orders/99999"], ["post", "/purchase-orders"], ["put", "/purchase-orders/99999"], ["delete", "/purchase-orders/99999"], ["post", "/purchase-orders/99999/status"], ["post", "/purchase-orders/99999/payment"]]) {
        assert.equal((await t.as.sales[m](p, {})).status, 403, `${m} ${p}`);
        assert.equal((await t.as.accounting[m](p, {})).status, 403, `accounting ${m} ${p}`);
      }
      assert.equal((await t.as.admin.get("/purchase-orders")).status, 200);
      assert.equal((await t.as.factory.get("/purchase-orders")).status, 200);
      assert.equal((await t.as.factory.get("/purchase-orders/99999")).status, 404);
    });
  });

  describe("status path", () => {
    let po;
    before(async () => {
      po = await make({ lines: [{ materialId: resin.id, quantity: 50, unitPrice: 400 }, { materialId: bolt.id, quantity: 200, unitPrice: 10 }] });
    });

    it("a bad or skipped step is 409 INVALID_STATUS_CHANGE", async () => {
      assert.deepEqual(codes(await t.as.admin.post(`/purchase-orders/${po.id}/status`, { status: "Done" })), ["status:INVALID"]);
      assert.deepEqual(codes(await t.as.admin.post(`/purchase-orders/${po.id}/status`, {})), ["status:REQUIRED"]);
      const skip = await receive(t.as.admin, po);
      assert.equal(skip.status, 409);
      assert.equal(skip.body.error, "INVALID_STATUS_CHANGE");
      const back = await t.as.admin.post(`/purchase-orders/${po.id}/status`, { status: "Draft" });
      assert.equal(back.status, 400, "Draft is not a target");
    });

    it("payment before Received is 409 PO_NOT_RECEIVED", async () => {
      const res = await t.as.admin.post(`/purchase-orders/${po.id}/payment`, { paymentDate: today(), amount: po.total, method: "Cash" });
      assert.equal(res.status, 409);
      assert.equal(res.body.error, "PO_NOT_RECEIVED");
    });

    it("Sent locks the PO (PO_LOCKED); Sent again is INVALID_STATUS_CHANGE", async () => {
      const sent = must(await t.as.factory.post(`/purchase-orders/${po.id}/status`, { status: "Sent" }));
      assert.equal(sent.status, "Sent");
      const put = await t.as.admin.put(`/purchase-orders/${po.id}`, poBody());
      assert.equal(put.status, 409);
      assert.equal(put.body.error, "PO_LOCKED");
      const del = await t.as.admin.delete(`/purchase-orders/${po.id}`);
      assert.equal(del.body.error, "PO_LOCKED");
      const again = await t.as.admin.post(`/purchase-orders/${po.id}/status`, { status: "Sent" });
      assert.equal(again.body.error, "INVALID_STATUS_CHANGE");
    });

    it("Received needs a lot number for every line (REQUIRED) and adds nothing when it fails", async () => {
      const none = await t.as.admin.post(`/purchase-orders/${po.id}/status`, { status: "Received" });
      assert.equal(none.status, 400);
      assert.deepEqual(codes(none), ["lots.0.lotNumber:REQUIRED", "lots.1.lotNumber:REQUIRED"]);
      const partial = await t.as.admin.post(`/purchase-orders/${po.id}/status`, { status: "Received", lots: [{ lineId: po.lines[0].id, lotNumber: "LOT-X" }, { lineId: po.lines[1].id, lotNumber: "  " }] });
      assert.deepEqual(codes(partial), ["lots.1.lotNumber:REQUIRED"]);
      assert.equal(must(await t.as.admin.get(`/purchase-orders/${po.id}`)).status, "Sent");
      assert.equal((await stockOf(resin)).total, 10);
    });

    it("Received adds each line to its lot once, as an Add linked to the PO", async () => {
      const before = (await stockOf(resin)).total;
      const done = must(await receive(t.as.factory, po, "LOT-77"));
      assert.equal(done.status, "Received");
      assert.ok(done.receivedAt);
      assert.deepEqual(done.lines.map((l) => l.lotNumber), ["LOT-77-RESIN", "LOT-77-BOLT"]);

      const r = await stockOf(resin);
      assert.equal(r.total, before + 50);
      assert.equal(r.lots.find((l) => l.lotNumber === "LOT-77-RESIN").quantity, 50);
      assert.equal((await stockOf(bolt)).lots.find((l) => l.lotNumber === "LOT-77-BOLT").quantity, 200);

      const moves = (await t.as.admin.get(`/stock-changes?q=${po.poNumber}`)).body.data;
      assert.equal(moves.length, 2);
      assert.ok(moves.every((e) => e.kind === "Add" && e.note === `Received ${po.poNumber}` && e.purchaseOrderNumber === po.poNumber && e.purchaseOrderId === po.id && e.orderId === null));
    });

    it("Received a second time is 409 INVALID_STATUS_CHANGE and adds nothing", async () => {
      const total = (await stockOf(resin)).total;
      const again = await receive(t.as.admin, po, "LOT-OTHER");
      assert.equal(again.status, 409);
      assert.equal(again.body.error, "INVALID_STATUS_CHANGE");
      assert.equal((await stockOf(resin)).total, total);
      assert.equal(must(await t.as.admin.get(`/purchase-orders/${po.id}`)).lines[0].lotNumber, "LOT-77-RESIN");
      assert.equal((await t.as.admin.get(`/stock-changes?q=${po.poNumber}`)).body.meta.total, 2);
    });

    it("a received lot number may be an existing lot (the stock goes up)", async () => {
      const p2 = await make({ lines: [{ materialId: resin.id, quantity: 5, unitPrice: 1 }] });
      await t.as.admin.post(`/purchase-orders/${p2.id}/status`, { status: "Sent" });
      const before = (await stockOf(resin)).lots.find((l) => l.lotNumber === "OLD").quantity;
      must(await t.as.admin.post(`/purchase-orders/${p2.id}/status`, { status: "Received", lots: [{ lineId: p2.lines[0].id, lotNumber: "OLD" }] }));
      assert.equal((await stockOf(resin)).lots.find((l) => l.lotNumber === "OLD").quantity, before + 5);
    });

    describe("payment", () => {
      const pay = (body) => t.as.admin.post(`/purchase-orders/${po.id}/payment`, { paymentDate: today(), method: "Bank transfer", amount: po.total, ...body });

      it("validates date, amount (= the total) and method", async () => {
        assert.deepEqual(codes(await pay({ amount: po.total - 1 })), ["amount:MUST_EQUAL_TOTAL"]);
        assert.deepEqual(codes(await pay({ amount: "x" })), ["amount:INVALID"]);
        assert.deepEqual(codes(await pay({ amount: undefined })), ["amount:REQUIRED"]);
        assert.deepEqual(codes(await pay({ paymentDate: "2026-02-30" })), ["paymentDate:INVALID_DATE"]);
        assert.deepEqual(codes(await pay({ paymentDate: undefined })), ["paymentDate:REQUIRED"]);
        assert.deepEqual(codes(await pay({ method: "Barter" })), ["method:REQUIRED"]);
        assert.deepEqual(codes(await pay({ method: undefined })), ["method:REQUIRED"]);
        assert.equal(must(await t.as.admin.get(`/purchase-orders/${po.id}`)).paid, false);
      });

      it("records the payment on the PO; one payment only", async () => {
        const paid = must(await pay({ referenceNo: "TT-1020", note: "paid in full" }));
        assert.equal(paid.paid, true);
        assert.deepEqual(paid.payment, { paymentDate: today(), amount: po.total, method: "Bank transfer", referenceNo: "TT-1020", note: "paid in full" });
        const again = await pay({});
        assert.equal(again.status, 409);
        assert.equal(again.body.error, "ALREADY_PAID");
      });

      it("a Factory Worker may pay as well", async () => {
        const p3 = await make({ lines: [{ materialId: bolt.id, quantity: 1, unitPrice: 7 }] });
        await t.as.factory.post(`/purchase-orders/${p3.id}/status`, { status: "Sent" });
        must(await t.as.factory.post(`/purchase-orders/${p3.id}/status`, { status: "Received", lots: [{ lineId: p3.lines[0].id, lotNumber: "B" }] }));
        const res = await t.as.factory.post(`/purchase-orders/${p3.id}/payment`, { paymentDate: today(), method: "Cash", amount: 7 });
        assert.equal(res.status, 200);
        assert.equal(res.body.data.payment.referenceNo, "");
      });
    });
  });

  describe("list and read", () => {
    it("lists newest first without lines, with the paid flag", async () => {
      const res = await t.as.factory.get("/purchase-orders");
      assert.equal(res.status, 200);
      assert.ok(res.body.meta.total >= 6);
      const ids = res.body.data.map((p) => p.id);
      assert.deepEqual(ids, [...ids].sort((a, b) => b - a));
      assert.equal("lines" in res.body.data[0], false);
      assert.equal(typeof res.body.data[0].paid, "boolean");
    });

    it("a PO carries the address of its supplier, and q also searches the notes", async () => {
      const po = must(await t.as.admin.post("/purchase-orders", poBody({ notes: "needle-in-notes" })), 201);
      assert.equal(po.supplierAddress, "");
      assert.equal((await t.as.admin.get("/purchase-orders?q=needle-in-notes")).body.data.length, 1);
      must(await t.as.admin.delete(`/purchase-orders/${po.id}`));
    });

    it("filters by q, status, supplierId and paid", async () => {
      assert.equal((await t.as.admin.get(`/purchase-orders?q=PO-${year()}-0001`)).body.data.length, 1);
      const waiting = await make();
      must(await t.as.admin.post(`/purchase-orders/${waiting.id}/status`, { status: "Sent" }));
      assert.ok((await t.as.admin.get("/purchase-orders?q=Supplier%20One")).body.data.length >= 6);
      assert.equal((await t.as.admin.get("/purchase-orders?q=nobody")).body.data.length, 0);

      for (const status of ["Draft", "Sent", "Received"]) {
        const rows = (await t.as.admin.get(`/purchase-orders?status=${status}`)).body.data;
        assert.ok(rows.length >= 1, status);
        assert.ok(rows.every((p) => p.status === status));
      }
      assert.equal((await t.as.admin.get("/purchase-orders?status=Paid")).status, 400);

      assert.ok((await t.as.admin.get(`/purchase-orders?supplierId=${sup.id}`)).body.data.length >= 6);
      assert.equal((await t.as.admin.get(`/purchase-orders?supplierId=${inactive.id}`)).body.data.length, 0);

      const paid = (await t.as.admin.get("/purchase-orders?paid=true")).body.data;
      const unpaid = (await t.as.admin.get("/purchase-orders?paid=false")).body.data;
      assert.ok(paid.length >= 2 && paid.every((p) => p.paid));
      assert.ok(unpaid.length >= 1 && unpaid.every((p) => !p.paid));
      assert.equal((await t.as.admin.get("/purchase-orders?paid=maybe")).status, 400);
    });

    it("pages", async () => {
      const page = await t.as.admin.get("/purchase-orders?pageSize=2&page=2");
      assert.equal(page.body.data.length, 2);
      assert.equal(page.body.meta.page, 2);
    });

    it("reads one PO with its lines, and 404 for a missing one", async () => {
      const id = (await t.as.admin.get("/purchase-orders?pageSize=1")).body.data[0].id;
      const po = must(await t.as.admin.get(`/purchase-orders/${id}`));
      assert.ok(Array.isArray(po.lines));
      assert.equal((await t.as.admin.get("/purchase-orders/99999")).status, 404);
    });
  });

  describe("files and in-use rules", () => {
    it("files of a PO: Admin and Factory Worker; a PO_FILE is replaced by a new one; a Sale Worker gets 403", async () => {
      const po = await make();
      const up = (c, kind, name) => c.post("/attachments", { ownerType: "PurchaseOrder", ownerId: po.id, kind, file: { name, dataUrl: PDF } });
      assert.equal((await up(t.as.factory, "PO_FILE", "first.pdf")).status, 201);
      assert.equal((await up(t.as.admin, "PO_FILE", "second.pdf")).status, 201);
      assert.equal((await up(t.as.admin, "QUOTATION", "quote.pdf")).status, 201);
      assert.equal((await up(t.as.admin, "OTHER", "misc.pdf")).status, 201);
      assert.deepEqual(codes(await up(t.as.admin, "EVIDENCE", "x.pdf")), ["kind:INVALID"]);
      assert.equal((await up(t.as.sales, "PO_FILE", "no.pdf")).status, 403);

      const list = must(await t.as.factory.get(`/attachments?ownerType=PurchaseOrder&ownerId=${po.id}`));
      assert.deepEqual(list.map((f) => f.fileName).sort(), ["misc.pdf", "quote.pdf", "second.pdf"]);
      assert.equal((await t.as.sales.get(`/attachments?ownerType=PurchaseOrder&ownerId=${po.id}`)).status, 403);
      assert.equal((await t.as.sales.get(`/attachments/${list[0].id}`)).status, 403);
      assert.equal((await t.as.factory.delete(`/attachments/${list[0].id}`)).status, 200);
    });

    it("a supplier with a PO and a material on a PO cannot be deleted", async () => {
      const s = await t.as.admin.delete(`/suppliers/${sup.id}`);
      assert.equal(s.status, 409);
      assert.equal(s.body.error, "IN_USE");
      assert.equal(s.body.errors[0].kind, "purchaseOrder");
      assert.ok(s.body.errors[0].count >= 6);
      assert.ok(s.body.errors[0].items.length <= 5);

      const m = await t.as.admin.delete(`/materials/${bolt.id}`);
      assert.equal(m.status, 409);
      const kinds = m.body.errors.map((e) => e.kind);
      assert.ok(kinds.includes("supplier") && kinds.includes("purchaseOrder"));
    });
  });
});
