import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { codes, makeCustomer, makeMaterial, makeOrder, makeProduct, must, start, today } from "../test-support/harness.js";

describe("customers", () => {
  let t;
  before(async () => {
    t = await start();
  });
  after(() => t.stop());

  it("creates, reads, updates and lists", async () => {
    const c = must(await t.as.admin.post("/customers", { name: " Tokyo Co ", address: "Chiyoda", email: "t@tokyo.jp", telephone: "03-1" }), 201);
    assert.equal(c.name, "Tokyo Co");
    assert.equal((await t.as.admin.get(`/customers/${c.id}`)).body.data.address, "Chiyoda");

    const upd = must(await t.as.admin.put(`/customers/${c.id}`, { name: "Tokyo Ltd", address: "", email: "", telephone: "" }));
    assert.equal(upd.name, "Tokyo Ltd");
    assert.equal(upd.email, "");

    await makeCustomer(t.as.admin, "Osaka Co");
    const list = await t.as.admin.get("/customers");
    assert.equal(list.body.meta.total, 2);
    assert.equal(list.body.data[0].name, "Osaka Co", "newest first");
  });

  it("searches by name, email and telephone, and pages", async () => {
    const byName = await t.as.admin.get("/customers?q=osaka");
    assert.equal(byName.body.data.length, 1);
    const byMail = await t.as.admin.get("/customers?q=acme.com");
    assert.equal(byMail.body.data.length, 1);
    const page = await t.as.admin.get("/customers?pageSize=1&page=2");
    assert.deepEqual(page.body.meta, { page: 2, pageSize: 1, total: 2 });
    assert.equal(page.body.data.length, 1);
  });

  it("validates name and email", async () => {
    const res = await t.as.admin.post("/customers", { name: "  ", email: "bad" });
    assert.equal(res.status, 400);
    assert.deepEqual(codes(res), ["name:REQUIRED", "email:INVALID"]);
  });

  it("answers 404 for a missing record", async () => {
    const res = await t.as.admin.get("/customers/99999");
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "NOT_FOUND");
    assert.equal((await t.as.admin.get("/customers/abc")).status, 404);
  });

  it("who may call: Admin and Sale Worker read, only Admin writes, Factory none", async () => {
    assert.equal((await t.as.sales.get("/customers")).status, 200);
    assert.equal((await t.as.factory.get("/customers")).status, 403);
    assert.equal((await t.as.sales.post("/customers", { name: "x" })).status, 403);
    assert.equal((await t.as.factory.post("/customers", { name: "x" })).status, 403);
    assert.equal((await t.as.sales.put("/customers/1", { name: "x" })).status, 403);
    assert.equal((await t.as.sales.delete("/customers/1")).status, 403);
    // The role check is before the lookup: 403, not 404
    assert.equal((await t.as.factory.get("/customers/99999")).status, 403);
  });

  it("refuses to delete a used customer (IN_USE) and deletes a free one", async () => {
    const customer = await makeCustomer(t.as.admin, "Used Co");
    const product = await makeProduct(t.as.admin, "P-USED");
    const { qt } = await makeOrder(t.as.admin, { product, customer, qtNumber: "QT-USED" });

    const res = await t.as.admin.delete(`/customers/${customer.id}`);
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "IN_USE");
    const kinds = res.body.errors.map((e) => e.kind).sort();
    assert.deepEqual(kinds, ["order", "qt"]);
    assert.deepEqual(res.body.errors.find((e) => e.kind === "qt").items, [qt.qtNumber]);

    const free = await makeCustomer(t.as.admin, "Free Co");
    const del = await t.as.admin.delete(`/customers/${free.id}`);
    assert.equal(del.status, 200);
    assert.equal(del.body.data, null);
    assert.equal((await t.as.admin.get(`/customers/${free.id}`)).status, 404);
  });
});

describe("products", () => {
  let t;
  let m1;
  let m2;
  before(async () => {
    t = await start();
    m1 = await makeMaterial(t.as.admin, "M1");
    m2 = await makeMaterial(t.as.admin, "M2");
  });
  after(() => t.stop());

  it("creates a product with its BOM and reads it back", async () => {
    const p = must(
      await t.as.admin.post("/products", {
        code: "P1",
        name: "Frame",
        price: 45000,
        bom: [
          { materialId: m1.id, quantity: 2.5 },
          { materialId: m2.id, quantity: 1 }
        ]
      }),
      201
    );
    assert.equal(p.price, 45000);
    assert.deepEqual(p.bom.map((b) => [b.materialCode, b.quantity]), [["M1", 2.5], ["M2", 1]]);
  });

  it("a price may be left out (0) and must be a whole non-negative number", async () => {
    const zero = must(await t.as.admin.post("/products", { code: "P-FREE", name: "Free" }), 201);
    assert.equal(zero.price, 0);
    const bad = await t.as.admin.post("/products", { code: "P-BAD", name: "Bad", price: -1 });
    assert.deepEqual(codes(bad), ["price:INVALID"]);
    const frac = await t.as.admin.post("/products", { code: "P-FRAC", name: "Frac", price: 10.5 });
    assert.deepEqual(codes(frac), ["price:INVALID"]);
  });

  it("validates the BOM lines", async () => {
    const res = await t.as.admin.post("/products", {
      code: "P-V",
      name: "V",
      bom: [
        { materialId: m1.id, quantity: 0 },
        { materialId: m1.id, quantity: 1 },
        { materialId: 99999, quantity: 1 }
      ]
    });
    assert.equal(res.status, 400);
    assert.deepEqual(codes(res), ["bom.0.quantity:INVALID", "bom.1.materialId:DUPLICATE", "bom.2.materialId:INVALID"]);
  });

  it("requires code and name; a used code is 409 DUPLICATE_VALUE", async () => {
    const req = await t.as.admin.post("/products", {});
    assert.deepEqual(codes(req), ["code:REQUIRED", "name:REQUIRED"]);
    const dup = await t.as.admin.post("/products", { code: "P1", name: "again" });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error, "DUPLICATE_VALUE");
    assert.deepEqual(codes(dup), ["code:DUPLICATE"]);
  });

  it("PUT replaces the BOM and may keep its own code", async () => {
    const p = (await t.as.admin.get("/products?q=P1")).body.data[0];
    const upd = must(await t.as.admin.put(`/products/${p.id}`, { code: "P1", name: "Frame 2", price: 1, bom: [{ materialId: m2.id, quantity: 4 }] }));
    assert.equal(upd.name, "Frame 2");
    assert.deepEqual(upd.bom.map((b) => b.materialCode), ["M2"]);
  });

  it("searches by code and name", async () => {
    assert.equal((await t.as.admin.get("/products?q=frame")).body.data.length, 1);
    assert.equal((await t.as.admin.get("/products?q=P-FREE")).body.data.length, 1);
  });

  it("everybody reads, only Admin writes", async () => {
    assert.equal((await t.as.sales.get("/products")).status, 200);
    assert.equal((await t.as.factory.get("/products")).status, 200);
    assert.equal((await t.as.sales.post("/products", { code: "X", name: "X" })).status, 403);
    assert.equal((await t.as.factory.delete("/products/1")).status, 403);
  });

  it("refuses to delete a product used by an order, deletes a free one with its BOM", async () => {
    const customer = await makeCustomer(t.as.admin);
    const used = await makeProduct(t.as.admin, "P-ORD", [{ materialId: m1.id, quantity: 1 }]);
    await makeOrder(t.as.admin, { product: used, customer, qtNumber: "QT-P" });
    const res = await t.as.admin.delete(`/products/${used.id}`);
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "IN_USE");
    assert.ok(res.body.errors.some((e) => e.kind === "order"));

    const free = await makeProduct(t.as.admin, "P-DEL", [{ materialId: m1.id, quantity: 1 }]);
    assert.equal((await t.as.admin.delete(`/products/${free.id}`)).status, 200);
    // The material is free again: only P-ORD still uses it
    const mat = await t.as.admin.delete(`/materials/${m1.id}`);
    assert.equal(mat.status, 409);
    assert.deepEqual(mat.body.errors.find((e) => e.kind === "product").items, ["P-ORD"]);
  });
});

describe("users", () => {
  let t;
  before(async () => {
    t = await start();
  });
  after(() => t.stop());

  const body = (over = {}) => ({ name: "New User", email: "New@Test.com", role: "Worker", department: "Factory", password: "abcdef", ...over });

  it("creates a user: email lower-cased, password never returned", async () => {
    const u = must(await t.as.admin.post("/users", body()), 201);
    assert.equal(u.email, "new@test.com");
    assert.equal("password" in u, false);
    assert.equal("passwordHash" in u, false);
    const login = await t.as.anon.post("/auth/login", { email: "new@test.com", password: "abcdef" });
    assert.equal(login.status, 200);
  });

  it("validates fields", async () => {
    const res = await t.as.admin.post("/users", { name: "", email: "x", role: "Boss", department: "Mars" });
    assert.equal(res.status, 400);
    assert.deepEqual(codes(res), ["name:REQUIRED", "email:INVALID", "role:INVALID", "department:INVALID", "password:REQUIRED"]);
    const short = await t.as.admin.post("/users", body({ email: "s@test.com", password: "123" }));
    assert.deepEqual(codes(short), ["password:TOO_SHORT"]);
  });

  it("a Worker needs the department Sales or Factory; an Admin may have any", async () => {
    const worker = await t.as.admin.post("/users", body({ email: "w@test.com", department: "Accounting" }));
    assert.equal(worker.status, 400);
    assert.deepEqual(codes(worker), ["department:INVALID"]);
    const admin = await t.as.admin.post("/users", body({ email: "a2@test.com", role: "Admin", department: "Accounting" }));
    assert.equal(admin.status, 201);
  });

  it("a used email is 409 DUPLICATE_VALUE (also in another case)", async () => {
    const res = await t.as.admin.post("/users", body({ email: "NEW@test.com" }));
    assert.equal(res.status, 409);
    assert.equal(res.body.error, "DUPLICATE_VALUE");
    assert.deepEqual(codes(res), ["email:DUPLICATE"]);
  });

  it("an empty password on PUT keeps the current one", async () => {
    const id = (await t.as.admin.get("/users?q=new@test.com")).body.data[0].id;
    must(await t.as.admin.put(`/users/${id}`, body({ name: "Renamed", password: "" })));
    const login = await t.as.anon.post("/auth/login", { email: "new@test.com", password: "abcdef" });
    assert.equal(login.status, 200);
    assert.equal(login.body.data.user.name, "Renamed");
  });

  it("lists and searches by name, email and department", async () => {
    assert.ok((await t.as.admin.get("/users")).body.meta.total >= 5);
    assert.equal((await t.as.admin.get("/users?q=renamed")).body.data.length, 1);
    assert.ok((await t.as.admin.get("/users?q=Factory")).body.data.length >= 2);
  });

  it("only Admin may call; the role check is before the lookup", async () => {
    for (const c of [t.as.sales, t.as.factory]) {
      assert.equal((await c.get("/users")).status, 403);
      assert.equal((await c.get("/users/99999")).status, 403);
      assert.equal((await c.post("/users", body({ email: "z@test.com" }))).status, 403);
    }
  });

  it("refuses to delete yourself, the last Admin, and a user with history", async () => {
    // self (and the only Admin at this point: a2@test.com is a second Admin, so self is checked on its own)
    const self = await t.as.admin.delete(`/users/${t.users.admin.id}`);
    assert.equal(self.status, 409);
    assert.ok(self.body.errors.some((e) => e.kind === "self"));

    // a user with a progress entry or a stock change
    const mat = await makeMaterial(t.as.admin, "M-HIST");
    must(await t.as.factory.post(`/materials/${mat.id}/stock-changes`, { kind: "Add", lotNumber: "L1", quantity: 1, changeDate: today(), note: "" }), 201);
    const withHistory = await t.as.admin.delete(`/users/${t.users.factory.id}`);
    assert.equal(withHistory.status, 409);
    assert.ok(withHistory.body.errors.some((e) => e.kind === "stock"));
  });

  it("the last Admin cannot be demoted", async () => {
    // a2@test.com (made above) is the second Admin: while it exists, demoting is allowed for the others
    const second = (await t.as.admin.get("/users?q=a2@test.com")).body.data[0];
    assert.equal((await t.as.admin.delete(`/users/${second.id}`)).status, 200);
    const demote = await t.as.admin.put(`/users/${t.users.admin.id}`, { name: "Admin", email: "admin@test.com", role: "Worker", department: "Factory" });
    assert.equal(demote.status, 409);
    assert.equal(demote.body.error, "IN_USE");
    assert.ok(demote.body.errors.some((e) => e.kind === "lastAdmin"));
  });

  it("deletes a free user", async () => {
    const u = must(await t.as.admin.post("/users", body({ email: "free@test.com" })), 201);
    assert.equal((await t.as.admin.delete(`/users/${u.id}`)).status, 200);
  });
});
