import { describe, expect, it } from "vitest";

import { ACTIONS, can } from "./permissions";

const admin = { role: "Admin", department: "Administration" };
const sale = { role: "Worker", department: "Sales" };
const factory = { role: "Worker", department: "Factory" };

// The access table of docs/api ("Who may call"): each action with who may do it.
const TABLE = {
  "dashboard.view": { admin: true, sale: true, factory: true },
  "qt.use": { admin: true, sale: true, factory: false },
  "orders.view": { admin: true, sale: true, factory: true },
  "orders.edit": { admin: true, sale: true, factory: false },
  "orders.start": { admin: true, sale: false, factory: true },
  "orders.progress": { admin: true, sale: false, factory: true },
  "orders.evidence": { admin: true, sale: false, factory: true },
  "orders.reopen": { admin: true, sale: false, factory: false },
  "stock.view": { admin: true, sale: true, factory: true },
  "stock.change": { admin: true, sale: false, factory: true },
  "materials.write": { admin: true, sale: false, factory: false },
  "products.view": { admin: true, sale: true, factory: true },
  "products.write": { admin: true, sale: false, factory: false },
  "customers.view": { admin: true, sale: true, factory: false },
  "customers.write": { admin: true, sale: false, factory: false },
  "suppliers.view": { admin: true, sale: false, factory: true },
  "suppliers.write": { admin: true, sale: false, factory: false },
  "purchase.use": { admin: true, sale: false, factory: true },
  "invoices.use": { admin: true, sale: false, factory: false },
  "receipts.use": { admin: true, sale: false, factory: false },
  "users.use": { admin: true, sale: false, factory: false },
};

describe("can(user, action)", () => {
  it("has a row in this table for every action", () => {
    expect(Object.keys(TABLE).sort()).toEqual(Object.keys(ACTIONS).sort());
  });

  for (const [action, who] of Object.entries(TABLE)) {
    it(`${action}: Admin ${who.admin}, Sale Worker ${who.sale}, Factory Worker ${who.factory}`, () => {
      expect(can(admin, action)).toBe(who.admin);
      expect(can(sale, action)).toBe(who.sale);
      expect(can(factory, action)).toBe(who.factory);
    });
  }

  it("says no to nobody signed in and to an action that does not exist", () => {
    expect(can(null, "orders.view")).toBe(false);
    expect(can(factory, "nothing.like.this")).toBe(false);
    expect(can(admin, "nothing.like.this")).toBe(true); // the Admin passes every check
  });

  it("does not let a Worker of another department (Accounting, Administration) do the work of Sales or Factory", () => {
    const stray = { role: "Worker", department: "Accounting" };
    expect(can(stray, "qt.use")).toBe(false);
    expect(can(stray, "orders.start")).toBe(false);
    expect(can(stray, "orders.view")).toBe(true);
  });
});
