import { expect, test } from "@playwright/test";

import { USERS, settle, signIn, watchErrors } from "./helpers.js";

// Purchase: the Admin makes a material that is low and a supplier that sells it; a Factory Worker buys it: Create PO from the stock that
// is low, Save, Sent, Received (a lot, the stock grows), the payment. Desktop only, like the master data case.

test.skip(({ viewport }) => (viewport?.width ?? 1280) < 1000, "desktop flow");

test("from a material that is low to a purchase order that is paid", async ({ page }) => {
  const errors = watchErrors(page);

  // the Admin: a material with a minimum level that the lot is below, and the supplier that sells it
  await signIn(page, USERS.admin);
  await page.goto("/stock/materials/new");
  await settle(page);
  await page.getByLabel("Code").fill("FOAM-01");
  await page.getByLabel("Name", { exact: true }).fill("Insulation foam");
  await page.getByLabel("Unit", { exact: true }).fill("kg");
  await page.getByLabel("Minimum level (optional)").fill("50");
  await page.getByRole("button", { name: "Add a lot" }).click();
  await page.getByLabel("Lot number").fill("LOT-F1");
  await page.getByLabel("Quantity").fill("20");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: "FOAM-01" })).toBeVisible();

  await page.goto("/master/suppliers/new");
  await settle(page);
  await page.getByLabel("Code").fill("SUP-FOAM");
  await page.getByLabel("Name", { exact: true }).fill("Foam Supplier");
  await page.getByRole("button", { name: "Add a material" }).click();
  await page.getByLabel("Material", { exact: true }).selectOption({ label: "FOAM-01 Insulation foam (kg)" });
  await page.getByLabel("Initial price").fill("1200");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: "SUP-FOAM" })).toBeVisible();

  // the Factory Worker buys it
  await page.getByRole("button", { name: "Admin", exact: true }).click(); // the user menu
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/); // wait for the sign-out to finish before the next sign-in
  await signIn(page, USERS.factory);
  await page.goto("/purchase/orders");
  await settle(page);
  await expect(page.getByRole("heading", { name: "Stock to buy" })).toBeVisible();
  await page.getByRole("link", { name: "Create PO: FOAM-01" }).click();

  await expect(page.getByLabel("Supplier")).toHaveValue(/\d+/); // the supplier of the material
  await expect(page.getByLabel("Quantity")).toHaveValue("30"); // 50 - 20
  await expect(page.getByLabel("Unit price")).toHaveValue("1200");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Draft");
  await page.getByRole("button", { name: "Mark as sent" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sent");

  await page.getByRole("button", { name: "Mark as received" }).click();
  await page.getByLabel("Lot number: FOAM-01").fill("LOT-F1");
  await page.getByRole("button", { name: "Confirm: add to the stock" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Received");

  await page.getByLabel("Amount paid").fill("36000");
  await page.getByLabel("Payment method").selectOption("Bank transfer");
  await page.getByRole("button", { name: "Record the payment" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText(/Paid on \d{4}-\d{2}-\d{2}: ¥36,000 by Bank transfer/)).toBeVisible();

  // the stock grew: 20 + 30, and the movement shows the purchase order
  await page.goto("/stock/movements");
  await settle(page);
  await expect(page.getByRole("row", { name: /FOAM-01/ }).first()).toContainText(/PO-\d{4}-\d{4}/);

  expect(errors.take().filter((line) => !/HTTP (400|409)/.test(line))).toEqual([]);
});
