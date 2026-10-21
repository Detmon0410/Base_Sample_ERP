import { open, login, shot, state, URL_BASE } from "./walk-lib.mjs";
state({ orderUrl: URL_BASE + "sale/orders/10" });
const { browser, page } = await open();
// the Sale Worker sees the order read only
await login(page, "sale@gmail.com", "sale");
await page.goto(state().orderUrl);
await page.waitForTimeout(1500);
await shot(page, "10-order-sale-readonly");
await page.evaluate(() => localStorage.clear());
await page.context().clearCookies();
await page.goto(URL_BASE + "login");
await login(page, "worker@gmail.com", "worker", "11-login-factory");
await shot(page, "12-factory-today");
await page.goto(URL_BASE + "sale/orders");
await shot(page, "13-orders-list");
await page.goto(state().orderUrl);
await page.waitForTimeout(1500);
await shot(page, "14-order-draft");
for (const [i, name] of ["Cutting", "Assembly", "Testing"].entries()) {
  await page.getByRole("button", { name: "Add a process" }).click();
  await page.fill(`input[name="lines.0.processes.${i}.name"]`, name);
}
await shot(page, "15-order-processes");
await page.getByRole("button", { name: "Save" }).click();
await page.waitForTimeout(3800);
await shot(page, "16-order-saved");
await page.getByRole("button", { name: "Start production" }).click();
await page.waitForTimeout(1500);
await shot(page, "17-start-dialog");
console.log((await page.locator("[role=alertdialog],[role=dialog]").allInnerTexts()).join("\n---\n"));
console.log("BUTTONS:", (await page.locator("[role=alertdialog] button,[role=dialog] button").allInnerTexts()).join(" | "));
await browser.close();
