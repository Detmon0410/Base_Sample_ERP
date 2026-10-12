import { expect, test } from "@playwright/test";

import { USERS, settle, signIn, watchErrors } from "./helpers.js";

// P1: the master data (docs/specs/s1-mini-erp-workflow.md): customers, products with the BOM, materials with lots, users.
// Desktop only: the narrow screens are covered by the smoke test (every page, no sideways scroll).

test.skip(({ viewport }) => (viewport?.width ?? 1280) < 1000, "desktop flow");

const newRecord = async (page, entry, button) => {
  await page.goto(entry);
  await settle(page);
  await page.getByRole("link", { name: button }).click();
};

test("Admin makes a customer, a material with a lot, a product with a BOM and a user, then changes one", async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page, USERS.admin);

  // customer
  await newRecord(page, "/customers", "New customer");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Some fields need your attention")).toBeVisible();
  await expect(page.getByText("Enter or choose a value.")).toBeVisible();
  await page.getByLabel("Name").fill("Tokyo Cold Chain");
  await page.getByLabel("Address").fill("1-2-3 Koto, Tokyo");
  await page.getByLabel("Email").fill("buyer@tokyocold.jp");
  await page.getByLabel("Telephone").fill("03-1234-5678");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/customers$/);
  await expect(page.getByRole("link", { name: "Tokyo Cold Chain" })).toBeVisible();

  // material with a lot
  await newRecord(page, "/stock/materials", "New material");
  await page.getByLabel("Code").fill("STEEL-01");
  await page.getByLabel("Name").fill("Steel sheet");
  await page.getByRole("button", { name: "Add a lot" }).click();
  await page.getByLabel("Lot number").fill("LOT-A");
  await page.getByLabel("Quantity").fill("100");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/stock\/materials$/);
  await expect(page.getByRole("row", { name: /STEEL-01/ })).toContainText("100");

  // product with a BOM
  await newRecord(page, "/products", "New product");
  await page.getByLabel("Code").fill("FR-100");
  await page.getByLabel("Name").fill("Refrigerator 100L");
  await page.getByLabel("Price").fill("45000");
  await page.getByRole("button", { name: "Add a material" }).click();
  await page.getByLabel("Material").selectOption({ label: "STEEL-01 Steel sheet" });
  await page.getByLabel("Quantity").fill("2.5");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByRole("row", { name: /FR-100/ })).toContainText("¥45,000");

  // the same code twice is refused
  await newRecord(page, "/products", "New product");
  await page.getByLabel("Code").fill("fr-100");
  await page.getByLabel("Name").fill("Copy");
  await page.getByLabel("Price").fill("1");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("This value is already used.")).toBeVisible();

  // a user
  await newRecord(page, "/users", "New user");
  await page.getByLabel("Name").fill("Mika Sato");
  await page.getByLabel("Email").fill("mika@factory.jp");
  await page.getByLabel("Department").selectOption("Factory");
  await page.getByLabel("Role").selectOption("Worker");
  await page.getByLabel("Password").fill("123");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Enter at least 6 characters.")).toBeVisible();
  await page.getByLabel("Password").fill("secret1");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/users$/);

  // change a record; master data has no status and no way to deactivate or delete
  await page.getByRole("link", { name: "Mika Sato" }).click();
  await expect(page.getByRole("button", { name: "Make inactive" })).toHaveCount(0);
  await page.getByLabel("Name").fill("Mika Sato-Ito");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: "Mika Sato-Ito" })).toBeVisible();
  await expect(page.getByLabel("Status")).toHaveCount(0);

  // a refused save is an answer of the mock, not errors of the page
  expect(errors.take().filter((line) => !/HTTP (400|409)/.test(line))).toEqual([]);
});

test("Worker reads the products and the materials but cannot change them", async ({ page }) => {
  await signIn(page, USERS.worker);

  await page.goto("/products");
  await settle(page);
  await expect(page.getByRole("link", { name: "New product" })).toHaveCount(0);

  await page.goto("/stock/materials");
  await settle(page);
  await expect(page.getByRole("link", { name: "New material" })).toHaveCount(0);

  await page.goto("/stock/materials/new");
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);

  await page.goto("/customers");
  await expect(page.getByText("You do not have permission")).toBeVisible();
});
