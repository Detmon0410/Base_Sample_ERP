import fs from "node:fs";
import { expect, test } from "@playwright/test";

import { PAGES, USERS, rawKeys, settle, signIn } from "./helpers.js";

// A check that reads like a scan: every page, listing text, placeholders, labels and titles that look like an untranslated key,
// in English. (A key that has no English text is also a console error in development: see src/i18n/index.js.)
test("no page shows an untranslated key", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "the texts do not depend on the size of the screen");
  test.setTimeout(5 * 60 * 1000);
  await signIn(page, USERS.admin);
  const out = {};
  for (const target of PAGES) {
    await page.goto(target.path);
    await settle(page);
    const keys = [...(await rawKeys(page)), ...(await page.evaluate(() => [...(window.__missingKeys ?? [])])).map((key) => `missing key: ${key}`)];
    if (keys.length) out[target.path] = keys;
  }
  fs.mkdirSync("e2e-results", { recursive: true });
  fs.writeFileSync("e2e-results/rawscan.json", JSON.stringify(out, null, 2));
  expect(out, "text that looks like an untranslated key, by page").toEqual({});
});
