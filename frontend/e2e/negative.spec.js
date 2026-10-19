import { expect, test } from "@playwright/test";

import { USERS, settle, signIn, watchErrors, withoutRefusals } from "./helpers.js";

// The roads beside the main workflow: a production order that cannot start because a material is short (nothing changes, the page says what
// is missing and the way to add it, then the start works), an order that is not Completed is not offered for an invoice, and what a Sale
// Worker and a Factory Worker are refused. The records are made through the services of the app (the mock), the checks are real clicks.

test.skip(({ viewport }) => (viewport?.width ?? 1280) < 1000, "desktop flow");
test.setTimeout(3 * 60 * 1000);

/** A customer, a material with 5 in stock, a product that needs 2 of it for each unit, and an order of 10 with one process (so 20 are needed). */
async function makeShortOrder(page) {
  const tag = Date.now().toString(36).toUpperCase(); // a real backend keeps its records: every call makes codes of its own
  return page.evaluate(async (tag) => {
    const master = await import("/src/services/master.service.js");
    const qt = await import("/src/services/qt.service.js");
    const orders = await import("/src/services/orders.service.js");
    const customer = await master.customersApi.create({ name: `Short Customer ${tag}`, address: "1 Short Street" });
    const material = await master.materialsApi.create({ code: `SHORT-${tag}`, name: "Short steel", unit: "kg", lots: [{ lotNumber: "S1", quantity: 5 }] });
    const product = await master.productsApi.create({ code: `SH-${tag}`, name: "Short fridge", price: 100, bom: [{ materialId: material.id, quantity: 2 }] });
    const made = await qt.qtApi.create({ qtNumber: `QT-SHORT-${tag}`, qtDate: "2026-10-16", customerId: customer.id, lines: [{ productId: product.id, quantity: 10, unitPrice: 100 }] });
    const { order } = await qt.qtApi.confirm(made.id);
    await orders.ordersApi.update(order.id, { orderDate: order.orderDate, notes: "", lines: [{ productId: product.id, quantity: 10, unitPrice: 100, processes: [{ name: "Cutting", instructions: "" }] }] });
    return { orderId: order.id, orderNumber: order.orderNumber, materialId: material.id, materialCode: material.code };
  }, tag);
}

test("a production order that cannot start says what is short, nothing changes, and it starts after the stock is added", async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page, USERS.admin);
  const { orderId, orderNumber, materialId, materialCode } = await makeShortOrder(page);

  // the start is refused: 20 are needed, 5 are there
  await page.goto(`/sale/orders/${orderId}`);
  await settle(page);
  await page.getByRole("button", { name: "Start production" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  const alert = page.getByRole("alert");
  await expect(alert).toContainText(`${materialCode} Short steel`);
  await expect(alert).toContainText("20");
  await expect(alert).toContainText("5");
  await expect(page.getByRole("button", { name: "Start production" })).toBeVisible(); // not started: the button is still there

  // nothing changed in the stock
  await page.goto(`/stock/materials/${materialId}`);
  await settle(page);
  await expect(page.getByRole("row", { name: /S1/ }).first()).toContainText("5");
  await expect(page.getByRole("heading", { name: "Stock history" }).locator("xpath=ancestor::section").getByRole("row", { name: /Deduct/ })).toHaveCount(0);

  // the way to add it: the link of the alert opens the stock form with the missing 15 filled in
  await page.goto(`/sale/orders/${orderId}`);
  await settle(page);
  await page.getByRole("button", { name: "Start production" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByRole("alert").getByRole("link", { name: /Add stock/ }).click();
  await expect(page).toHaveURL(/\/stock\/materials\/\d+\?add=15&order=/);
  await settle(page);
  await expect(page.getByLabel("Quantity", { exact: true })).toHaveValue("15");
  await expect(page.getByLabel("Lot", { exact: true })).toHaveValue("S1"); // the lot that is there
  await page.getByRole("button", { name: "Save the change" }).click();
  await expect(page.getByRole("row", { name: /S1/ }).first()).toContainText("20"); // 5 + 15

  // now it starts, and the stock is exactly used: 5 + 15 - 20
  await page.goto(`/sale/orders/${orderId}`);
  await settle(page);
  await page.getByRole("button", { name: "Start production" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("Production started")).toBeVisible();
  await page.goto("/stock/materials");
  await settle(page);
  await expect(page.getByRole("row", { name: new RegExp(materialCode) })).toContainText("0");
  await page.goto(`/stock/materials/${materialId}`);
  await settle(page);
  await expect(page.getByRole("row", { name: /Deduct/ })).toContainText("-20");
  await expect(page.getByRole("row", { name: /Deduct/ })).toContainText(orderNumber);

  // an order that is started but not Completed is not offered for an invoice
  await page.goto("/accounting");
  await settle(page);
  await expect(page.getByRole("row", { name: new RegExp(orderNumber) })).toHaveCount(0);

  expect(withoutRefusals(errors.take())).toEqual([]);
});

test("a Sale Worker and a Factory Worker are refused what is not theirs", async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page, USERS.admin);
  const { orderId } = await makeShortOrder(page);
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);

  // a Sale Worker prepares the order but cannot start it, and has no Accounting, Purchase or Users page
  await signIn(page, USERS.sale);
  await page.goto(`/sale/orders/${orderId}`);
  await settle(page);
  await expect(page.getByRole("button", { name: "Add a process" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start production" })).toHaveCount(0);
  for (const path of ["/accounting", "/purchase/orders", "/master/users", "/master/suppliers"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/403$/);
  }
  await page.getByRole("button", { name: /^(Sale|Sale Worker)$/ }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);

  // a Factory Worker starts and records progress but cannot change the processes, and has no QT, Customers or Accounting page
  await signIn(page, USERS.factory);
  await page.goto(`/sale/orders/${orderId}`);
  await settle(page);
  await expect(page.getByRole("button", { name: "Add a process" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start production" })).toBeVisible();
  for (const path of ["/sale/quotations", "/master/customers", "/accounting", "/master/users"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/403$/);
  }

  expect(withoutRefusals(errors.take())).toEqual([]);
});
