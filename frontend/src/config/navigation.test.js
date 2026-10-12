import { describe, expect, it } from "vitest";

import { findActive, getVisibleNav } from "./navigation";

const admin = { id: 1, role: "Admin" };
const worker = { id: 2, role: "Worker" };

// What the menu of the header shows, as a list of words: a menu is written as "Name > entry, entry".
const shape = (user) =>
  getVisibleNav(user).map((entry) => (entry.type === "link" ? entry.item.labelKey : `${entry.labelKey} > ${entry.items.map((item) => item.labelKey).join(", ")}`));

describe("the menu of the header", () => {
  it("shows an Admin everything: the two menus with their entries, the others as links", () => {
    expect(shape(admin)).toEqual(["dashboard", "orders > qt, productionOrders", "accounting > invoices, receipts", "stock > stockOverview, materialsStock, movements", "master > customers, products, users"]);
  });

  it("shows a Worker the production orders and the Stock menu, and the products as a link (a menu with one entry is that entry)", () => {
    expect(shape(worker)).toEqual(["dashboard", "productionOrders", "stock > stockOverview, materialsStock, movements", "products"]);
  });

  it("shows nothing to somebody who is not signed in", () => {
    expect(shape(null)).toEqual([]);
  });

  it("finds the entry of a path, also for a page under it", () => {
    expect(findActive("/")?.key).toBe("dashboard");
    expect(findActive("/orders/12")?.key).toBe("productionOrders");
    expect(findActive("/orders/new")?.key).toBe("productionOrders");
    expect(findActive("/stock")?.key).toBe("stockOverview");
    expect(findActive("/invoices/4")?.key).toBe("invoices");
    expect(findActive("/receipts/2")?.key).toBe("receipts");
    expect(findActive("/stock/materials/3")?.key).toBe("materials");
    expect(findActive("/stock/movements")?.key).toBe("movements");
    expect(findActive("/nothing")).toBeNull();
  });
});
