import { describe, expect, it } from "vitest";

import { findActive, getVisibleNav } from "./navigation";

const admin = { id: 1, role: "Admin" };
const worker = { id: 2, role: "Worker" };

// What the menu of the header shows, as a list of words: a menu is written as "Name > entry, entry".
const shape = (user) =>
  getVisibleNav(user).map((entry) => (entry.type === "link" ? entry.item.labelKey : `${entry.labelKey} > ${entry.items.map((item) => item.labelKey).join(", ")}`));

describe("the menu of the header", () => {
  it("shows an Admin everything: the two menus with their entries, the others as links", () => {
    expect(shape(admin)).toEqual(["summary", "orders > qt, productionOrders", "invoices", "master > customers, products, materialsStock, users"]);
  });

  it("shows a Worker the production orders as a link and, under Master, only the products and the materials and stock (a menu with one entry is that entry)", () => {
    expect(shape(worker)).toEqual(["summary", "productionOrders", "master > products, materialsStock"]);
  });

  it("shows nothing to somebody who is not signed in", () => {
    expect(shape(null)).toEqual([]);
  });

  it("finds the entry of a path, also for a page under it", () => {
    expect(findActive("/")?.key).toBe("summary");
    expect(findActive("/orders/12")?.key).toBe("productionOrders");
    expect(findActive("/orders/new")?.key).toBe("productionOrders");
    expect(findActive("/nothing")).toBeNull();
  });
});
