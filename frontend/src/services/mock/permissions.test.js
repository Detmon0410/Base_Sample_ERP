import { describe, expect, it } from "vitest";

import { mockRoutes } from "./routes.js";
import { mockUsers, tokenOf } from "./users.js";

// The access table of the mock: for every endpoint, who may call it and who gets 403. An allowed user is never answered 403 (it may be
// answered 400 or 404, because the request below is empty or points to a record that does not exist; nothing is changed).

const WHO = { admin: mockUsers[0], factory: mockUsers[1], sale: mockUsers[2] };
const NOBODY = 999999;

const answer = (route, user) => {
  try {
    mockRoutes[route]({ body: {}, authorization: `Bearer ${tokenOf(user)}`, params: { id: NOBODY }, query: {} });
    return 200;
  } catch (error) {
    return error.status;
  }
};

// route -> who may call it (the Admin always may)
const TABLE = {
  "GET /dashboard": ["factory", "sale"],

  "GET /qt": ["sale"],
  "GET /qt/:id": ["sale"],
  "POST /qt": ["sale"],
  "PUT /qt/:id": ["sale"],
  "DELETE /qt/:id": ["sale"],

  "GET /customers": ["sale"],
  "GET /customers/:id": ["sale"],
  "POST /customers": [],
  "PUT /customers/:id": [],
  "DELETE /customers/:id": [],

  "GET /products": ["factory", "sale"],
  "GET /products/:id": ["factory", "sale"],
  "POST /products": [],
  "PUT /products/:id": [],
  "DELETE /products/:id": [],

  "GET /materials": ["factory", "sale"],
  "GET /materials/:id": ["factory", "sale"],
  "POST /materials": [],
  "PUT /materials/:id": [],
  "DELETE /materials/:id": [],
  "GET /materials/:id/stock-changes": ["factory", "sale"],
  "POST /materials/:id/stock-changes": ["factory"],
  "GET /stock-changes": ["factory", "sale"],

  "GET /orders": ["factory", "sale"],
  "GET /orders/:id": ["factory", "sale"],
  "POST /orders": ["sale"],
  "PUT /orders/:id": ["sale"],
  "POST /orders/:id/start": ["factory"],
  "POST /orders/:id/progress": ["factory"],

  "GET /invoices": [],
  "GET /invoices/:id": [],
  "POST /invoices": [],
  "POST /invoices/:id/payment": [],
  "GET /receipts": [],
  "GET /receipts/:id": [],

  "GET /users": [],
  "GET /users/:id": [],
  "POST /users": [],
  "PUT /users/:id": [],
  "DELETE /users/:id": [],
};

describe("who may call what (docs/api, Who may call)", () => {
  it("covers every route of the mock except the sign-in ones", () => {
    const routes = Object.keys(mockRoutes).filter((route) => !route.includes("/auth/")).sort();
    expect(Object.keys(TABLE).sort()).toEqual(routes);
  });

  for (const [route, allowed] of Object.entries(TABLE)) {
    it(`${route}: Admin${allowed.map((who) => `, ${who}`).join("")} may; the others get 403`, () => {
      for (const [name, user] of Object.entries(WHO)) {
        const may = name === "admin" || allowed.includes(name);
        const status = answer(route, user);
        if (may) expect(status, `${route} for ${name}`).not.toBe(403);
        else expect(status, `${route} for ${name}`).toBe(403);
      }
    });
  }

  it("keeps a Worker in the Sales or the Factory department", () => {
    const admin = `Bearer ${tokenOf(WHO.admin)}`;
    const make = (department, role = "Worker") =>
      mockRoutes["POST /users"]({ body: { name: "N", department, email: `${department}-${role}@x.co`.toLowerCase(), role, password: "secret1" }, authorization: admin, params: {}, query: {} });
    expect(make("Sales").data.department).toBe("Sales");
    expect(make("Factory").data.department).toBe("Factory");
    for (const department of ["Accounting", "Administration"]) {
      let error;
      try {
        make(department);
      } catch (caught) {
        error = caught;
      }
      expect(error.details).toEqual([{ path: ["department"], code: "INVALID" }]);
    }
    expect(make("Accounting", "Admin").data.role).toBe("Admin"); // an Admin may be in any department
  });
});
