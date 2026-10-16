import { describe, expect, it } from "vitest";

import { findActive, getVisibleNav } from "./navigation";

const admin = { id: 1, role: "Admin" };
const factory = { id: 2, role: "Worker", department: "Factory" }; // a Factory Worker
const sale = { id: 3, role: "Worker", department: "Sales" }; // a Sale Worker

// What the menu of the header shows, as a list of words: a menu is written as "Name > entry, entry".
const shape = (user) =>
  getVisibleNav(user).map((entry) => (entry.type === "link" ? entry.item.labelKey : `${entry.labelKey} > ${entry.items.map((item) => item.labelKey).join(", ")}`));

describe("the menu of the header", () => {
  it("shows an Admin everything: the two menus with their entries, the others as links", () => {
    expect(shape(admin)).toEqual(["dashboard", "orders > qt, productionOrders", "purchase", "accounting > invoices, receipts", "stock > materialsStock, movements", "master > customers, products, suppliers, users, erDiagram"]);
  });

  it("shows a Factory Worker the production orders, Purchase, the Stock menu and the products and suppliers to look at", () => {
    expect(shape(factory)).toEqual(["dashboard", "productionOrders", "purchase", "stock > materialsStock, movements", "master > products, suppliers"]);
  });

  it("shows a Sale Worker the quotations too, and the customers to look at", () => {
    expect(shape(sale)).toEqual(["dashboard", "orders > qt, productionOrders", "stock > materialsStock, movements", "master > customers, products"]);
  });

  it("shows a Worker without a department (never saved so) only what everybody sees", () => {
    expect(shape({ id: 9, role: "Worker", department: "Accounting" })).toEqual(["dashboard", "productionOrders", "stock > materialsStock, movements", "products"]);
  });

  it("shows nothing to somebody who is not signed in", () => {
    expect(shape(null)).toEqual([]);
  });

  it("finds the entry of a path, also for a page under it", () => {
    expect(findActive("/")?.key).toBe("dashboard");
    expect(findActive("/sale/orders/12")?.key).toBe("productionOrders");
    expect(findActive("/sale/orders/new")?.key).toBe("productionOrders");
    expect(findActive("/accounting/invoices/4")?.key).toBe("invoices");
    expect(findActive("/accounting/receipts/2")?.key).toBe("receipts");
    expect(findActive("/stock/materials/3")?.key).toBe("materials");
    expect(findActive("/stock/movements")?.key).toBe("movements");
    expect(findActive("/master/er-diagram")?.key).toBe("erDiagram");
    expect(findActive("/nothing")).toBeNull();
  });
});
