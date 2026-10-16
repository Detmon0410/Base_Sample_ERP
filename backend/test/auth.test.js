import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { PASSWORD, codes, start } from "../test-support/harness.js";

describe("auth", () => {
  let t;
  before(async () => {
    t = await start();
  });
  after(() => t.stop());

  it("GET /health answers without a token", async () => {
    const res = await t.as.anon.get("/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, "ok");
  });

  it("login returns a token and the user, never the hash", async () => {
    const res = await t.as.anon.post("/auth/login", { email: "admin@test.com", password: PASSWORD });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    const u = res.body.data.user;
    assert.deepEqual(Object.keys(u).sort(), ["createdAt", "department", "email", "id", "lastLoginAt", "name", "role"]);
    assert.equal(u.role, "Admin");
    assert.ok(u.lastLoginAt);
  });

  it("trims the email and compares it case-insensitively", async () => {
    const res = await t.as.anon.post("/auth/login", { email: "  ADMIN@Test.com ", password: PASSWORD });
    assert.equal(res.status, 200);
  });

  it("does not trim the password", async () => {
    const res = await t.as.anon.post("/auth/login", { email: "admin@test.com", password: ` ${PASSWORD}` });
    assert.equal(res.status, 401);
  });

  it("answers the same 401 for a wrong password and an unknown email", async () => {
    const wrong = await t.as.anon.post("/auth/login", { email: "admin@test.com", password: "nope" });
    const unknown = await t.as.anon.post("/auth/login", { email: "nobody@test.com", password: "nope" });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.error, "INVALID_CREDENTIALS");
    assert.deepEqual(wrong.body, unknown.body);
  });

  it("validates the login body", async () => {
    const res = await t.as.anon.post("/auth/login", {});
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "VALIDATION_ERROR");
    assert.deepEqual(codes(res), ["email:REQUIRED", "password:REQUIRED"]);

    const bad = await t.as.anon.post("/auth/login", { email: "not-an-email", password: "x" });
    assert.deepEqual(codes(bad), ["email:INVALID"]);
  });

  it("GET /auth/me returns the signed-in user", async () => {
    const res = await t.as.sales.get("/auth/me");
    assert.equal(res.status, 200);
    assert.equal(res.body.data.email, "sales@test.com");
    assert.equal(res.body.data.department, "Sales");
  });

  it("answers 401 UNAUTHORIZED without a token or with a bad one", async () => {
    const none = await t.as.anon.get("/auth/me");
    assert.equal(none.status, 401);
    assert.equal(none.body.error, "UNAUTHORIZED");
    const bad = await t.clientFor("garbage").get("/auth/me");
    assert.equal(bad.status, 401);
  });

  it("protects every module with the token", async () => {
    for (const path of ["/customers", "/products", "/materials", "/stock-changes", "/suppliers", "/purchase-orders", "/users", "/qt", "/orders", "/invoices", "/receipts", "/dashboard"]) {
      const res = await t.as.anon.get(path);
      assert.equal(res.status, 401, path);
    }
  });

  it("logout is 200 with null data", async () => {
    const res = await t.as.factory.post("/auth/logout");
    assert.equal(res.status, 200);
    assert.equal(res.body.data, null);
  });

  it("a new password ends the sessions of that user", async () => {
    const before = await t.as.accounting.get("/auth/me");
    assert.equal(before.status, 200);
    const put = await t.as.admin.put(`/users/${t.users.accounting.id}`, {
      name: "Accounting Worker",
      email: "accounting@test.com",
      role: "Admin",
      department: "Accounting",
      password: "brandnew1"
    });
    assert.equal(put.status, 200);
    assert.equal((await t.as.accounting.get("/auth/me")).status, 401);
    const relog = await t.as.anon.post("/auth/login", { email: "accounting@test.com", password: "brandnew1" });
    assert.equal(relog.status, 200);
  });

  it("too many failed logins for one email are 429 TOO_MANY_REQUESTS", async () => {
    let last;
    for (let i = 0; i < 21; i += 1) last = await t.as.anon.post("/auth/login", { email: "guess@test.com", password: `try${i}` });
    assert.equal(last.status, 429);
    assert.equal(last.body.error, "TOO_MANY_REQUESTS");
    // another email is not affected
    assert.equal((await t.as.anon.post("/auth/login", { email: "admin@test.com", password: PASSWORD })).status, 200);
  });

  it("unknown routes answer ROUTE_NOT_FOUND", async () => {
    const res = await t.as.admin.get("/nothing-here");
    assert.equal(res.status, 404);
    assert.equal(res.body.error, "ROUTE_NOT_FOUND");
  });
});
