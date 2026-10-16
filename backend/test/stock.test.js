import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { codes, makeMaterial, must, start, today } from "../test-support/harness.js";

describe("materials and stock", () => {
  let t;
  before(async () => {
    t = await start();
  });
  after(() => t.stop());

  const change = (c, id, body) => c.post(`/materials/${id}/stock-changes`, { changeDate: today(), note: "", ...body });
  const lotOf = (m, lot) => m.lots.find((l) => l.lotNumber === lot)?.quantity;

  describe("material master", () => {
    it("creates with lots: one 'Initial stock' entry per lot, total and unit", async () => {
      const m = await makeMaterial(t.as.admin, "STEEL", [{ lotNumber: "A1", quantity: 10 }, { lotNumber: "A2", quantity: 5.5 }], { minLevel: 8 });
      assert.equal(m.unit, "pcs");
      assert.equal(m.total, 15.5);
      assert.equal(m.stockStatus, "Normal");
      const hist = must(await t.as.admin.get(`/materials/${m.id}/stock-changes`));
      assert.equal(hist.length, 2);
      assert.ok(hist.every((h) => h.initial && h.note === "Initial stock" && h.kind === "Add" && h.userName === "Admin"));
      assert.deepEqual(hist.map((h) => h.balance).sort((a, b) => a - b), [5.5, 10]);
    });

    it("validates code, name, lots, minLevel and unit", async () => {
      const res = await t.as.admin.post("/materials", {
        code: "",
        name: "",
        minLevel: -1,
        unit: "x".repeat(21),
        lots: [{ lotNumber: "", quantity: 1 }, { lotNumber: "L", quantity: -1 }, { lotNumber: "l", quantity: 1 }, { lotNumber: "L", quantity: 1.2345 }]
      });
      assert.equal(res.status, 400);
      const c = codes(res);
      for (const expected of ["code:REQUIRED", "name:REQUIRED", "minLevel:INVALID", "unit:INVALID", "lots.0.lotNumber:REQUIRED", "lots.1.quantity:INVALID", "lots.2.lotNumber:DUPLICATE", "lots.3.quantity:INVALID"]) {
        assert.ok(c.includes(expected), `${expected} in ${c}`);
      }
    });

    it("a used code is 409 DUPLICATE_VALUE", async () => {
      const res = await t.as.admin.post("/materials", { code: "STEEL", name: "again" });
      assert.equal(res.status, 409);
      assert.deepEqual(codes(res), ["code:DUPLICATE"]);
    });

    it("minLevel '' or null means none, and the status is null", async () => {
      const a = await makeMaterial(t.as.admin, "NOLEVEL", [{ lotNumber: "L", quantity: 5 }], { minLevel: "" });
      assert.equal(a.minLevel, null);
      assert.equal(a.stockStatus, null);
      const b = await makeMaterial(t.as.admin, "NULLLEVEL", [], { minLevel: null, unit: "kg" });
      assert.equal(b.stockStatus, null);
      assert.equal(b.unit, "kg");
    });

    it("PUT changes the fields and ignores lots", async () => {
      const m = await makeMaterial(t.as.admin, "PUTME", [{ lotNumber: "L", quantity: 3 }]);
      const upd = must(await t.as.admin.put(`/materials/${m.id}`, { code: "PUTME", name: "Renamed", unit: "kg", minLevel: 1, lots: [{ lotNumber: "NEW", quantity: 99 }] }));
      assert.equal(upd.name, "Renamed");
      assert.equal(upd.unit, "kg");
      assert.equal(upd.minLevel, 1);
      assert.deepEqual(upd.lots, [{ lotNumber: "L", quantity: 3 }]);
    });

    it("lists with q, paging and the status filter", async () => {
      assert.equal((await t.as.admin.get("/materials?q=steel")).body.data.length, 1);
      const page = await t.as.admin.get("/materials?pageSize=2&page=1");
      assert.equal(page.body.data.length, 2);
      assert.ok(page.body.meta.total >= 4);
      const bad = await t.as.admin.get("/materials?status=Nope");
      assert.equal(bad.status, 400);
    });

    it("reads are for everybody, writes for the Admin only", async () => {
      for (const c of [t.as.sales, t.as.factory]) {
        assert.equal((await c.get("/materials")).status, 200);
        assert.equal((await c.post("/materials", { code: "Z", name: "Z" })).status, 403);
        assert.equal((await c.put("/materials/1", { code: "Z", name: "Z" })).status, 403);
        assert.equal((await c.delete("/materials/1")).status, 403);
      }
    });

    it("404 for a missing material", async () => {
      assert.equal((await t.as.admin.get("/materials/99999")).status, 404);
      assert.equal((await t.as.admin.get("/materials/99999/stock-changes")).status, 404);
    });
  });

  describe("stock status", () => {
    it("Out / Low / Normal from the minimum level and the lot total", async () => {
      const out = await makeMaterial(t.as.admin, "S-OUT", [{ lotNumber: "L", quantity: 0 }], { minLevel: 5 });
      const low = await makeMaterial(t.as.admin, "S-LOW", [{ lotNumber: "L", quantity: 5 }], { minLevel: 5 });
      const normal = await makeMaterial(t.as.admin, "S-NORMAL", [{ lotNumber: "L", quantity: 6 }], { minLevel: 5 });
      assert.equal(out.stockStatus, "Out");
      assert.equal(low.stockStatus, "Low", "at the minimum level is Low");
      assert.equal(normal.stockStatus, "Normal");

      for (const [status, code] of [["Out", "S-OUT"], ["Low", "S-LOW"], ["Normal", "S-NORMAL"]]) {
        const list = (await t.as.admin.get(`/materials?status=${status}`)).body.data;
        assert.ok(list.some((m) => m.code === code), `${code} in ${status}`);
        assert.ok(list.every((m) => m.stockStatus === status));
      }
    });
  });

  describe("stock changes by hand", () => {
    let m;
    before(async () => {
      m = await makeMaterial(t.as.admin, "CHG", [{ lotNumber: "L1", quantity: 10 }], { minLevel: 2 });
    });

    it("Add to an existing lot and open a new lot", async () => {
      let r = must(await change(t.as.admin, m.id, { kind: "Add", lotNumber: "L1", quantity: 2.5 }), 201);
      assert.equal(lotOf(r, "L1"), 12.5);
      r = must(await change(t.as.factory, m.id, { kind: "Add", lotNumber: "L2", quantity: 4 }), 201);
      assert.equal(lotOf(r, "L2"), 4);
      assert.equal(r.total, 16.5);
    });

    it("Deduct reduces a lot and may link an order", async () => {
      const r = must(await change(t.as.admin, m.id, { kind: "Deduct", lotNumber: "L1", quantity: 2.5 }), 201);
      assert.equal(lotOf(r, "L1"), 10);
      const hist = must(await t.as.admin.get(`/materials/${m.id}/stock-changes`));
      const last = hist[0];
      assert.equal(last.kind, "Deduct");
      assert.equal(last.change, -2.5);
      assert.equal(last.balance, 10);
      assert.equal(last.initial, false);
      assert.equal(last.orderId, null);
    });

    it("a change below zero is 409 STOCK_NEGATIVE and the lot stays", async () => {
      const res = await change(t.as.admin, m.id, { kind: "Deduct", lotNumber: "L2", quantity: 5 });
      assert.equal(res.status, 409);
      assert.equal(res.body.error, "STOCK_NEGATIVE");
      assert.deepEqual(codes(res), ["quantity:STOCK_NEGATIVE"]);
      assert.equal(lotOf(must(await t.as.admin.get(`/materials/${m.id}`)), "L2"), 4);
    });

    it("Adjust takes a plus or a minus number and needs a note", async () => {
      const noNote = await change(t.as.admin, m.id, { kind: "Adjust", lotNumber: "L2", quantity: -1 });
      assert.deepEqual(codes(noNote), ["note:REQUIRED"]);
      const zero = await change(t.as.admin, m.id, { kind: "Adjust", lotNumber: "L2", quantity: 0, note: "count" });
      assert.deepEqual(codes(zero), ["quantity:INVALID"]);
      const r = must(await change(t.as.admin, m.id, { kind: "Adjust", lotNumber: "L2", quantity: -1, note: "after count" }), 201);
      assert.equal(lotOf(r, "L2"), 3);
      const up = must(await change(t.as.admin, m.id, { kind: "Adjust", lotNumber: "L2", quantity: 0.5, note: "found" }), 201);
      assert.equal(lotOf(up, "L2"), 3.5);
    });

    it("Deduct and Adjust on a lot that does not exist are 409 LOT_NOT_FOUND", async () => {
      for (const kind of ["Deduct", "Adjust"]) {
        const res = await change(t.as.admin, m.id, { kind, lotNumber: "NOPE", quantity: 1, note: "x" });
        assert.equal(res.status, 409, kind);
        assert.equal(res.body.error, "LOT_NOT_FOUND");
      }
    });

    it("validates kind, lot, quantity and date", async () => {
      const res = await change(t.as.admin, m.id, { kind: "Move", lotNumber: "", quantity: "abc", changeDate: "2026-02-30" });
      assert.equal(res.status, 400);
      const c = codes(res);
      for (const e of ["kind:INVALID", "lotNumber:REQUIRED", "quantity:INVALID", "changeDate:INVALID_DATE"]) assert.ok(c.includes(e), e);
      assert.deepEqual(codes(await change(t.as.admin, m.id, { kind: "Add", lotNumber: "L1", quantity: -2 })), ["quantity:INVALID"]);
      assert.deepEqual(codes(await change(t.as.admin, m.id, { kind: "Add", lotNumber: "L1", quantity: 1.2345 })), ["quantity:INVALID"]);
      assert.deepEqual(codes(await t.as.admin.post(`/materials/${m.id}/stock-changes`, { kind: "Add", lotNumber: "L1", quantity: 1 })), ["changeDate:REQUIRED"]);
      assert.deepEqual(codes(await change(t.as.admin, m.id, { kind: "Deduct", lotNumber: "L1", quantity: 1, orderId: 99999 })), ["orderId:INVALID"]);
    });

    it("a Sale Worker may not change stock (403 before 404)", async () => {
      assert.equal((await change(t.as.sales, m.id, { kind: "Add", lotNumber: "L1", quantity: 1 })).status, 403);
      assert.equal((await change(t.as.sales, 99999, { kind: "Add", lotNumber: "L1", quantity: 1 })).status, 403);
      assert.equal((await change(t.as.admin, 99999, { kind: "Add", lotNumber: "L1", quantity: 1 })).status, 404);
    });

    it("the history is readable by everybody, newest first", async () => {
      const hist = must(await t.as.sales.get(`/materials/${m.id}/stock-changes`));
      assert.ok(hist.length >= 6);
      const ids = hist.map((h) => h.id);
      assert.deepEqual(ids, [...ids].sort((a, b) => b - a));
      assert.equal(hist[0].materialCode, "CHG");
      assert.ok(hist.some((h) => h.userName === "Factory Worker"));
    });
  });

  describe("movements", () => {
    it("lists every change with the material, filters and paging", async () => {
      const all = await t.as.sales.get("/stock-changes?pageSize=200");
      assert.equal(all.status, 200);
      assert.ok(all.body.meta.total >= 10);
      assert.ok(all.body.data[0].materialCode);

      assert.ok((await t.as.admin.get("/stock-changes?type=Adjust")).body.data.every((e) => e.kind === "Adjust"));
      const q = await t.as.admin.get("/stock-changes?q=after%20count");
      assert.equal(q.body.data.length, 1);
      assert.equal((await t.as.admin.get("/stock-changes?q=CHG")).body.data.length >= 6, true);
      assert.equal((await t.as.admin.get("/stock-changes?q=L2")).body.data.every((e) => /L2/.test(e.lotNumber)), true);
    });

    it("filters by the date of the change, both ends included", async () => {
      assert.ok((await t.as.admin.get(`/stock-changes?from=${today()}&to=${today()}`)).body.meta.total >= 10);
      assert.equal((await t.as.admin.get("/stock-changes?from=2000-01-01&to=2000-12-31")).body.meta.total, 0);
    });

    it("rejects a bad type or date", async () => {
      assert.deepEqual(codes(await t.as.admin.get("/stock-changes?type=Move")), ["type:INVALID"]);
      assert.deepEqual(codes(await t.as.admin.get("/stock-changes?from=2026-13-01")), ["from:INVALID_DATE"]);
    });

    it("orders the newest changeDate first", async () => {
      const m = await makeMaterial(t.as.admin, "DATES", [{ lotNumber: "L", quantity: 1 }]);
      must(await change(t.as.admin, m.id, { kind: "Add", lotNumber: "L", quantity: 1, changeDate: "2020-01-01", note: "old" }), 201);
      const rows = (await t.as.admin.get("/stock-changes?q=DATES")).body.data;
      assert.equal(rows[0].changeDate, today());
      assert.equal(rows[1].changeDate, "2020-01-01");
    });
  });

  describe("deleting a material", () => {
    it("a material with only its first stock is deleted with its lots and history", async () => {
      const m = await makeMaterial(t.as.admin, "DEL-OK", [{ lotNumber: "L", quantity: 3 }]);
      assert.equal((await t.as.admin.delete(`/materials/${m.id}`)).status, 200);
      assert.equal((await t.as.admin.get(`/materials/${m.id}`)).status, 404);
      assert.equal((await t.as.admin.get("/stock-changes?q=DEL-OK")).body.meta.total, 0);
    });

    it("a material with a later stock change is IN_USE (stockChange)", async () => {
      const m = await makeMaterial(t.as.admin, "DEL-NO", [{ lotNumber: "L", quantity: 3 }]);
      must(await change(t.as.admin, m.id, { kind: "Add", lotNumber: "L", quantity: 1 }), 201);
      const res = await t.as.admin.delete(`/materials/${m.id}`);
      assert.equal(res.status, 409);
      assert.equal(res.body.error, "IN_USE");
      assert.ok(res.body.errors.some((e) => e.kind === "stockChange"));
    });
  });
});
