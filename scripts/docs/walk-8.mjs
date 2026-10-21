import { open, login, shot, state } from "./walk-lib.mjs";
const { browser, page } = await open();
await login(page, "worker@gmail.com", "worker");
await page.goto(state().orderUrl);
await page.waitForTimeout(1500);

const record = async (index, status, quantity, shotName) => {
  await page.getByRole("button", { name: "Record progress" }).nth(index).click();
  await page.waitForSelector('select[name="status"]');
  await page.selectOption('select[name="status"]', { label: status });
  await page.fill('input[name="completedQuantity"]', String(quantity));
  await page.fill('input[name="workDate"]', "2026-10-21");
  if (shotName) {
    await page.locator('select[name="status"]').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 250));
    await shot(page, shotName);
  }
  await page.getByRole("button", { name: "Save progress" }).click();
  await page.waitForTimeout(3800);
};

await record(0, "Completed", 2);
await page.evaluate(() => window.scrollTo(0, 0));
await shot(page, "21-order-completed-top");
await page.evaluate(() => window.scrollTo(0, 450));
await shot(page, "22-order-completed-history");
console.log((await page.locator("body").innerText()).slice(0, 1200));
await browser.close();
