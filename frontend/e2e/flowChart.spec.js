import fs from "node:fs";

import { expect, test } from "@playwright/test";

import { USERS, settle, signIn, watchErrors } from "./helpers.js";

// The flow charts in a real browser: mermaid draws the 9 charts, in English and in Japanese, and the PDF holds them. A Worker (Sale
// or Factory) does not have the page.

for (const [language, heading, button] of [
  ["en", "Flow chart", "Download PDF"],
  ["ja", "フローチャート", "PDFをダウンロード"],
]) {
  test(`the Admin opens the flow chart (${language}) and downloads it as a PDF`, async ({ page }) => {
    const errors = watchErrors(page);
    await signIn(page, USERS.admin);
    await page.evaluate((value) => localStorage.setItem("kanou.language", value), language);
    await page.goto("/master/flow-chart");
    await settle(page);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    await expect(page.locator("main [role=img] svg")).toHaveCount(9, { timeout: 30000 });
    // every chart has boxes or states with text (mermaid did not fail on a chart)
    for (const chart of await page.locator("main [role=img] svg").all()) expect((await chart.locator("text").count()) > 1).toBe(true);
    if (process.env.FLOW_SHOT) await page.screenshot({ path: process.env.FLOW_SHOT.replace(".png", `-${language}.png`), fullPage: true });

    const [download] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.getByRole("button", { name: button }).click()]);
    expect(download.suggestedFilename()).toMatch(/^flow-chart-\d{4}-\d{2}-\d{2}\.pdf$/);
    const file = await download.path();
    if (process.env.FLOW_PDF) fs.copyFileSync(file, process.env.FLOW_PDF.replace(".pdf", `-${language}.pdf`));
    const pdf = fs.readFileSync(file, "latin1");
    expect(pdf.startsWith("%PDF-")).toBe(true);
    expect(pdf.match(/\/Type \/Page\b/g).length).toBeGreaterThanOrEqual(2);
    if (language === "en") for (const word of ["1. Main flow", "9. Confirm QT: checks", "Lines can be edited only in Draft."]) expect(pdf).toContain(`(${word}`);
    expect(errors.take()).toEqual([]);
  });
}

for (const who of ["sale", "factory"]) {
  test(`a ${who === "sale" ? "Sale" : "Factory"} Worker cannot open the flow chart`, async ({ page }) => {
    await signIn(page, USERS[who]);
    await page.goto("/master/flow-chart");
    await expect(page.getByText("You do not have permission")).toBeVisible();
  });
}
