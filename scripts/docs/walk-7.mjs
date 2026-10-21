import { open, login, shot, state } from "./walk-lib.mjs";
const { browser, page } = await open();
await login(page, "worker@gmail.com", "worker");
await page.goto(state().orderUrl);
await page.waitForTimeout(1500);
await page.getByRole("button", { name: "Record progress" }).first().click();
await page.waitForTimeout(1200);
await shot(page, "19-progress-dialog");
console.log(page.url());
const fields = await page.evaluate(() =>
  [...document.querySelectorAll("input,select,textarea")].map((e) => `${e.tagName} type=${e.type} name=${e.name} ph=${e.placeholder}`).join("\n"),
);
console.log(fields);
console.log((await page.locator("body").innerText()).slice(0, 1800));
await browser.close();
