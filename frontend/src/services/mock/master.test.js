import { describe, expect, it } from "vitest";

import { mockRoutes } from "./routes.js";
import { login, mockUsers, tokenOf } from "./users.js";

const as = (user) => `Bearer ${tokenOf(user)}`;
const admin = mockUsers[0];
const worker = mockUsers[1];
const call = (route, who, { body = {}, params = {}, query = {} } = {}) => mockRoutes[route]({ body, authorization: as(who), params, query });
const fails = (fn) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("it should have failed");
};

describe("master data of the mock", () => {
  it("makes a customer, finds it by search, and checks the fields", () => {
    const made = call("POST /customers", admin, { body: { name: " Tokyo Cold ", address: "Tokyo", email: "a@b.jp", telephone: "03" } }).data;
    expect(made).toMatchObject({ name: "Tokyo Cold", status: "active" });

    const found = call("GET /customers", admin, { query: { q: "tokyo" } });
    expect(found.meta.total).toBe(1);

    expect(fails(() => call("POST /customers", admin, { body: { name: "" } })).details).toEqual([{ path: ["name"], code: "REQUIRED" }]);
    expect(fails(() => call("POST /customers", admin, { body: { name: "X", email: "nope" } })).details).toEqual([{ path: ["email"], code: "INVALID" }]);
  });

  it("keeps product and material codes unique, and the BOM to real materials with a positive quantity", () => {
    const steel = call("POST /materials", admin, { body: { code: "M-1", name: "Steel", lots: [{ lotNumber: "L1", quantity: 5 }] } }).data;
    expect(fails(() => call("POST /materials", admin, { body: { code: "m-1", name: "Again" } })).status).toBe(409);
    expect(fails(() => call("POST /materials", admin, { body: { code: "M-2", name: "Two", lots: [{ lotNumber: "A", quantity: 1 }, { lotNumber: "a", quantity: 2 }] } })).details[0].path).toEqual(["lots"]);

    const product = call("POST /products", admin, { body: { code: "P-1", name: "Fridge", price: 0, bom: [{ materialId: steel.id, quantity: 2.5 }] } }).data;
    expect(product.bom).toEqual([{ materialId: steel.id, quantity: 2.5 }]);
    expect(fails(() => call("POST /products", admin, { body: { code: "P-1", name: "Same code", price: 1 } })).status).toBe(409);
    expect(fails(() => call("POST /products", admin, { body: { code: "P-2", name: "Bad", price: -1, bom: [{ materialId: 999, quantity: 0 }] } })).details.map((item) => item.path.join("."))).toEqual(["price", "bom.0.materialId", "bom.0.quantity"]);
  });

  it("lets a Worker read products and materials but not write them, and never see customers or users", () => {
    expect(call("GET /products", worker).meta).toBeDefined();
    expect(call("GET /materials", worker).meta).toBeDefined();
    expect(fails(() => call("POST /products", worker, { body: { code: "W", name: "W", price: 1 } })).status).toBe(403);
    expect(fails(() => call("GET /customers", worker)).status).toBe(403);
    expect(fails(() => call("GET /users", worker)).status).toBe(403);
  });

  it("makes a record inactive instead of deleting it, and an inactive user cannot sign in", () => {
    const made = call("POST /users", admin, { body: { name: "Mika", department: "Factory", email: "Mika@Factory.jp", role: "Worker", password: "secret1" } }).data;
    expect(made).toMatchObject({ email: "mika@factory.jp", role: "Worker" });
    expect(made.password).toBeUndefined();
    expect(login({ email: "mika@factory.jp", password: "secret1" }).user.name).toBe("Mika");

    call("PATCH /users/:id/status", admin, { params: { id: made.id }, body: { status: "inactive" } });
    expect(fails(() => login({ email: "mika@factory.jp", password: "secret1" })).code).toBe("ACCOUNT_INACTIVE");
    expect(call("GET /users", admin, { query: { status: "inactive" } }).meta.total).toBe(1);
    expect(mockRoutes["DELETE /users/:id"]).toBeUndefined();
  });

  it("refuses a short password, a second user with the same e-mail, and making yourself inactive", () => {
    expect(fails(() => call("POST /users", admin, { body: { name: "A", department: "Sales", email: "x@y.jp", role: "Admin", password: "123" } })).details).toEqual([{ path: ["password"], code: "TOO_SHORT" }]);
    expect(fails(() => call("POST /users", admin, { body: { name: "A", department: "Sales", email: "ADMIN@gmail.com", role: "Admin", password: "123456" } })).status).toBe(409);
    expect(fails(() => call("PATCH /users/:id/status", admin, { params: { id: admin.id }, body: { status: "inactive" } })).code).toBe("CANNOT_DEACTIVATE_SELF");
  });

  it("pages the list: 20 rows a page, newest first", () => {
    for (let n = 1; n <= 23; n += 1) call("POST /customers", admin, { body: { name: `Bulk ${n}` } });
    const first = call("GET /customers", admin, { query: { q: "bulk", page: 1, pageSize: 20 } });
    expect(first.data).toHaveLength(20);
    expect(first.data[0].name).toBe("Bulk 23");
    expect(first.meta.total).toBe(23);
    expect(call("GET /customers", admin, { query: { q: "bulk", page: 2, pageSize: 20 } }).data).toHaveLength(3);
  });
});
