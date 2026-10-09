import { expect, test } from "@playwright/test";

import { act, expectToast, openAs, openRow, pick, pickFirst, pickToday, save, seedOpeningStock, sheet } from "./flow.js";
import { USERS, settle } from "./helpers.js";

// Regression cases of the problems found by the case B1 (docs/reports/e2e-b1-2026-10-09.md).

test("a list has one New button, also when it is empty", async ({ context }) => {
  const page = await openAs(context, USERS.saleWorker);
  await page.goto("/sale/quotations");
  await settle(page);
  await expect(page.getByText("No quotations yet", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /^New quotation/ })).toHaveCount(1);
});

test("a work order cannot be scheduled without plan dates, and the message says so", async ({ context }) => {
  test.setTimeout(3 * 60 * 1000);
  await seedOpeningStock(context);
  const worker = await openAs(context, USERS.saleWorker);
  await worker.goto("/sale/quotations");
  await settle(worker);
  await worker.getByRole("link", { name: /^New quotation/ }).first().click();
  await pick(worker, "qt-customerId", "C001");
  await pick(worker, "line-0-product", "RF-2D");
  await expect(sheet(worker).getByLabel(/Unit price, line 1/)).toHaveValue("64000");
  await save(worker);
  await act(worker, "Send");
  await act(worker, "Mark accepted");
  await act(worker, "Create sale order");
  await act(worker, "Request confirmation");
  const manager = await openAs(context, USERS.saleManager);
  await openRow(manager, "/sale/orders", "SO-");
  await act(manager, "Approve");
  await act(worker, "Send to factory"); // the sheet of the worker follows the manager without a reload

  const factory = await openAs(context, USERS.factoryWorker);
  await factory.goto("/factory/work-orders/new");
  await pickFirst(factory, "wo-line");
  await save(factory); // no plan dates
  await expect(sheet(factory).getByText(/Work order/).first()).toBeVisible();
  const factoryManager = await openAs(context, USERS.factoryManager);
  await openRow(factoryManager, "/factory/work-orders", "WO-");
  await sheet(factoryManager).getByRole("button", { name: "Schedule", exact: true }).click();
  await factoryManager.getByRole("alertdialog").getByRole("button").last().click();
  await expect(factoryManager.locator("[data-sonner-toast]").filter({ hasText: "plan start" })).toBeVisible();
});

test("the message under a field goes away when the page fills the field", async ({ context }) => {
  // the answers of the mock come slowly (1.2 s instead of 0.15 s), so Save can be pressed before the lists are there
  await context.addInitScript(() => {
    const original = window.setTimeout;
    window.setTimeout = (callback, delay, ...rest) => original(callback, delay === 150 ? 1200 : delay, ...rest);
  });
  const page = await openAs(context, USERS.factoryWorker);
  await page.goto("/factory/transfers/new");
  await sheet(page).getByRole("button", { name: "Save", exact: true }).click(); // at once: the warehouse is still empty
  const warehouseField = sheet(page).locator("#ft-warehouseId").locator("xpath=ancestor::div[1]");
  await expect(warehouseField.getByText("This field is required."), "the first Save should flag the empty warehouse").toBeVisible();
  await expect(page.locator("#ft-warehouseId")).toContainText("WH-F", { timeout: 15000 }); // the page fills it when the list arrives
  await expect(warehouseField.getByText("This field is required."), "the warehouse is filled but still says it is required").toHaveCount(0);
});

test("a quotation line is never saved with a price that has not arrived yet", async ({ context }) => {
  await context.addInitScript(() => {
    const original = window.setTimeout;
    window.setTimeout = (callback, delay, ...rest) => original(callback, delay === 150 ? 1500 : delay, ...rest);
  });
  const page = await openAs(context, USERS.saleWorker);
  await page.goto("/sale/quotations");
  await settle(page);
  await page.getByRole("link", { name: /^New quotation/ }).first().click();
  await pick(page, "qt-customerId", "C001");
  await pick(page, "line-0-product", "RF-2D");
  await save(page); // before the price list answers: the price is still 0
  await expect(sheet(page).getByText("The price is not set yet", { exact: false }), "a line with a price that has not arrived must not be saved").toBeVisible();
  await expect(sheet(page).getByLabel(/Unit price, line 1/)).toHaveValue("64000", { timeout: 15000 }); // the price arrives
  await expect(sheet(page).getByText("The price is not set yet", { exact: false }), "the message goes away when the price arrives").toHaveCount(0);
  await save(page);
  await expectToast(page, "saved");
});
