import { open, login, shot, URL_BASE } from "./walk-lib.mjs";
const { browser, page } = await open();
await login(page, "admin@gmail.com", "admin");
// the paper of a document is drawn for the print and the PDF only: show it the way the print shows it (print media, only that document)
for (const [path, doc, name] of [
  ["accounting/invoices/8", "invoice", "29-invoice-document"],
  ["accounting/receipts/8", "receipt", "33-receipt-document"],
  ["sale/quotations/10", "qt", "36-qt-document"],
]) {
  await page.goto(URL_BASE + path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2500);
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.emulateMedia({ media: "print" });
  await page.evaluate((d) => (document.body.dataset.printing = d), doc);
  await page.waitForTimeout(800);
  await page.locator(`[data-print-doc="${doc}"]`).first().screenshot({ path: new URL(`./out/walkthrough/${name}.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
  console.log("shot", name);
  await page.evaluate(() => delete document.body.dataset.printing);
  await page.emulateMedia({ media: "screen" });
  await page.setViewportSize({ width: 1366, height: 800 });
}
await browser.close();
