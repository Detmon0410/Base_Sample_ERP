import fs from "node:fs";
import { expect, test } from "@playwright/test";

import { PAGES, USERS, rawKeys, settle, signIn } from "./helpers.js";

// A check that reads like a scan: every page, its New form and the sheet of its first row, listing text, placeholders, labels and titles
// that look like an untranslated key. The result is written to e2e-results-rawscan.json.
const EXTRA = ["accounts", "taxRates", "paymentMethods", "bankAccounts"].map((tab) => ({ path: `/accounting/master/${tab}`, newButton: true }));

test("no page, form or sheet shows an untranslated key", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "the texts do not depend on the size of the screen");
  test.setTimeout(15 * 60 * 1000);
  // sheets of this scan are opened by URL (a new page load), so the collected keys are taken after each step and kept in `out`
  await signIn(page, USERS.admin);
  const out = {};
  const note = async (where) => {
    const keys = [...(await rawKeys(page)), ...(await page.evaluate(() => [...(window.__missingKeys ?? [])])).map((key) => `missing key: ${key}`)];
    if (keys.length) out[where] = keys;
  };
  for (const target of [...PAGES, ...EXTRA]) {
    await page.goto(target.path);
    await settle(page);
    await note(target.path);
    const main = page.locator("main");
    if (target.newButton) {
      const button = main.getByRole("link", { name: /^New\b/ }).or(main.getByRole("button", { name: /^New\b/ })).first();
      if (await button.count()) {
        await button.click();
        await settle(page);
        await note(`${target.path} [New]`);
        await page.keyboard.press("Escape");
      }
    }
    const row = main.locator("table tbody tr").first().locator("td").first();
    if ((await row.count()) && (await main.locator("table tbody tr").count()) > 1) {
      await row.click().catch(() => {});
      if (await page.getByRole("dialog").count()) {
        await settle(page);
        await note(`${target.path} [first row]`);
        await page.keyboard.press("Escape");
      }
    }
  }
  fs.writeFileSync("e2e-results/rawscan.json", JSON.stringify(out, null, 2));
  expect(out, "text that looks like an untranslated key, by page").toEqual({});
});
