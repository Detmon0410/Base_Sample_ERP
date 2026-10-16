import fs from "node:fs";

import { expect, test } from "@playwright/test";

import { USERS, settle, signIn, watchErrors } from "./helpers.js";

// The ER diagram in a real browser: the Admin opens it from the menu and downloads the PDF, a real file with the drawing (as
// text, not a picture), then the relationships and the notes. A Worker (Sale or Factory)
// does not have the page.

test("the Admin opens the ER diagram and downloads it as a PDF", async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page, USERS.admin);
  await page.goto("/master/er-diagram");
  await settle(page);
  await expect(page.getByRole("heading", { name: "ER diagram", level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: /^ER diagram: 23 tables and 29 relationships$/ })).toBeVisible();
  if (process.env.ER_SHOT) await page.screenshot({ path: process.env.ER_SHOT, fullPage: true });

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PDF" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^er-diagram-\d{4}-\d{2}-\d{2}\.pdf$/);
  const file = await download.path();
  if (process.env.ER_PDF) fs.copyFileSync(file, process.env.ER_PDF);
  const pdf = fs.readFileSync(file, "latin1");
  expect(pdf.startsWith("%PDF-")).toBe(true);
  expect(pdf.match(/\/Type \/Page\b/g).length).toBeGreaterThanOrEqual(2); // the drawing, then the notes and the relationships
  for (const word of ["PRODUCTION_ORDER", "PURCHASE_ORDER", "confirm creates", "Draft | Sent | Received", "owner_type + owner_id", "2. Relationships", "1. Notes"]) expect(pdf).toContain(`(${word}`);
  expect(errors.take()).toEqual([]);
});

test("the Japanese page downloads the PDF in Japanese: the same pages, drawn by the browser", async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page, USERS.admin);
  await page.evaluate(() => localStorage.setItem("kanou.language", "ja"));
  await page.goto("/master/er-diagram");
  await settle(page);
  await expect(page.getByRole("heading", { name: "ER図", level: 1 })).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "PDFをダウンロード" }).click()]);
  const file = await download.path();
  if (process.env.ER_PDF_JA) fs.copyFileSync(file, process.env.ER_PDF_JA);
  const pdf = fs.readFileSync(file, "latin1");
  expect(pdf.startsWith("%PDF-")).toBe(true);
  const pages = pdf.match(/\/Type \/Page\b/g).length;
  expect(pages).toBeGreaterThanOrEqual(2);
  // each page is one picture (the fonts of a PDF have no Japanese), and no English text of the drawing is left in it
  expect(pdf.match(/\/Subtype \/Image/g)).toHaveLength(pages);
  expect(pdf).not.toContain("(confirm creates");
  expect(errors.take()).toEqual([]);
});

for (const who of ["sale", "factory"]) {
  test(`a ${who === "sale" ? "Sale" : "Factory"} Worker cannot open the ER diagram`, async ({ page }) => {
    await signIn(page, USERS[who]);
    await page.goto("/master/er-diagram");
    await expect(page.getByText("You do not have permission")).toBeVisible();
  });
}
