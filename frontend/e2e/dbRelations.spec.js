import fs from "node:fs";

import { expect, test } from "@playwright/test";

import { USERS, settle, signIn, watchErrors } from "./helpers.js";

// The DB relations in a real browser: the Admin opens the page and downloads the PDF, in English (real text) and in Japanese (pages
// drawn by the browser). A Worker (Sale or Factory) does not have the page.

test("the Admin opens the DB relations and downloads them as a PDF", async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page, USERS.admin);
  await page.goto("/master/db-relations");
  await settle(page);
  await expect(page.getByRole("heading", { name: "DB relations", level: 1 })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(5);
  if (process.env.DB_SHOT) await page.screenshot({ path: process.env.DB_SHOT, fullPage: true });

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PDF" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^db-relations-\d{4}-\d{2}-\d{2}\.pdf$/);
  const file = await download.path();
  if (process.env.DB_PDF) fs.copyFileSync(file, process.env.DB_PDF);
  const pdf = fs.readFileSync(file, "latin1");
  expect(pdf.startsWith("%PDF-")).toBe(true);
  for (const word of ["1. Current version summary", "1.1 Rules to remember", "2. All keys and rules", "2.1 Foreign keys", "customer in use -> 409 IN_USE", "2.6 Chain of the new flows", "PurchasePayment", "1 / "] /* a PDF writes ( and ) as \( and \) */) expect(pdf).toContain(`(${word}`);
  expect(errors.take()).toEqual([]);
});

test("the Japanese page downloads the DB relations in Japanese, drawn by the browser", async ({ page }) => {
  const errors = watchErrors(page);
  await signIn(page, USERS.admin);
  await page.evaluate(() => localStorage.setItem("kanou.language", "ja"));
  await page.goto("/master/db-relations");
  await settle(page);
  await expect(page.getByRole("heading", { name: "DBリレーション", level: 1 })).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "PDFをダウンロード" }).click()]);
  const file = await download.path();
  if (process.env.DB_PDF_JA) fs.copyFileSync(file, process.env.DB_PDF_JA);
  const pdf = fs.readFileSync(file, "latin1");
  expect(pdf.startsWith("%PDF-")).toBe(true);
  const pages = pdf.match(/\/Type \/Page\b/g).length;
  expect(pages).toBeGreaterThanOrEqual(1);
  expect(pdf.match(/\/Subtype \/Image/g)).toHaveLength(pages); // each page is one picture
  expect(pdf).not.toContain("(customer in use");
  expect(errors.take()).toEqual([]);
});

for (const who of ["sale", "factory"]) {
  test(`a ${who === "sale" ? "Sale" : "Factory"} Worker cannot open the DB relations`, async ({ page }) => {
    await signIn(page, USERS[who]);
    await page.goto("/master/db-relations");
    await expect(page.getByText("You do not have permission")).toBeVisible();
  });
}
