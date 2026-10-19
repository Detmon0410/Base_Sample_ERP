import fs from "node:fs";

import { expect, test } from "@playwright/test";

import { USERS, settle, signIn, watchErrors } from "./helpers.js";

// The chart pages in a real browser (Flow Chart, User Flow, APIs Diagram, Context Diagram): mermaid draws every chart of the .md, in English and in
// Japanese, and the PDF holds them. Neither the page nor the PDF shows what would help to get in (the database, the addresses, the
// paths of the API, the logins). A Worker (Sale or Factory) does not have the pages.

const PAGES = [
  { path: "/master/flow-chart", file: "flow-chart", charts: 9, en: "Flow Chart", ja: "フローチャート", words: ["Main flow", "Confirm QT: checks", "Lines can be edited only in Draft."] },
  { path: "/master/user-flow", file: "user-flow", charts: 8, en: "User Flow", ja: "ユーザーフロー", words: ["Sale Worker", "Who can do what", "The Admin can do everything the two Workers can.", "view only"] },
  { path: "/master/apis-diagram", file: "apis-diagram", charts: 6, en: "APIs Diagram", ja: "API図", words: ["1. Layers", "Purchase flow", "7. Error codes", "STOCK_SHORT", "All endpoints above are implemented in", "\x95\x95\x95\x95\x95"] },
  { path: "/master/context-diagram", file: "context-diagram", charts: 2, en: "Context Diagram", ja: "コンテキスト図", words: ["Level 0: system context", "External entities", "Not in this system", "Sales orders, delivery, supplier invoices in Accounting, serial numbers and tax."] },
];
const SECRET = /kanou_mini_erp|localhost|:5173|:3000|DATABASE_URL|@gmail\.com|\/orders\/:id|\/auth\/|routes\/|backend\/|pnpm/;

for (const target of PAGES) {
  for (const language of ["en", "ja"]) {
    test(`the Admin opens ${target.en} (${language}) and downloads it as a PDF`, async ({ page }) => {
      const errors = watchErrors(page);
      await signIn(page, USERS.admin);
      await page.evaluate((value) => localStorage.setItem("kanou.language", value), language);
      await page.goto(target.path);
      await settle(page);
      await expect(page.getByRole("heading", { name: target[language], level: 1 })).toBeVisible();
      await expect(page.locator("main [role=img] svg")).toHaveCount(target.charts, { timeout: 30000 });
      // every chart has boxes or states with text (mermaid did not fail on a chart)
      for (const chart of await page.locator("main [role=img] svg").all()) expect((await chart.locator("text").count()) > 1).toBe(true);
      expect(await page.locator("main").innerText()).not.toMatch(SECRET);
      for (const chart of await page.locator("main [role=img] svg").all()) expect(await chart.textContent()).not.toMatch(SECRET);
      if (process.env.FLOW_SHOT) await page.screenshot({ path: process.env.FLOW_SHOT.replace(".png", `-${target.file}-${language}.png`), fullPage: true });

      const [download] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.getByRole("button", { name: language === "en" ? "Download PDF" : "PDFをダウンロード" }).click()]);
      expect(download.suggestedFilename()).toMatch(new RegExp(`^${target.file}-\\d{4}-\\d{2}-\\d{2}\\.pdf$`));
      const file = await download.path();
      if (process.env.FLOW_PDF) fs.copyFileSync(file, process.env.FLOW_PDF.replace(".pdf", `-${target.file}-${language}.pdf`));
      const pdf = fs.readFileSync(file, "latin1");
      expect(pdf.startsWith("%PDF-")).toBe(true);
      if (language === "en") for (const word of target.words) expect(pdf).toContain(word.startsWith("\x95") ? word : `(${word}`); // the dots of what is hidden (WinAnsi)
      expect(pdf).not.toMatch(SECRET);
      expect(errors.take()).toEqual([]);
    });
  }

  for (const who of ["sale", "factory"]) {
    test(`a ${who === "sale" ? "Sale" : "Factory"} Worker cannot open ${target.en}`, async ({ page }) => {
      await signIn(page, USERS[who]);
      await page.goto(target.path);
      await expect(page.getByText("You do not have permission")).toBeVisible();
    });
  }
}
