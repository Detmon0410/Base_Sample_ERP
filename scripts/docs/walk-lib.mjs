import { chromium } from "playwright";
import fs from "node:fs";
export const URL_BASE = "http://localhost:5173/";
export const DIR = new URL("./out/walkthrough/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
export const open = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 800 } });
  return { browser, page };
};
export const login = async (page, email, password, shotName) => {
  await page.goto(URL_BASE + "login");
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  if (shotName) await shot(page, shotName);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
};
export const shot = async (page, name, opts = {}) => {
  await page.waitForTimeout(500);
  await page.screenshot({ path: DIR + name + ".png", ...opts });
  console.log("shot", name, page.url());
};
export const state = (patch) => {
  const f = DIR + "state.json";
  const cur = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
  if (patch) fs.writeFileSync(f, JSON.stringify({ ...cur, ...patch }, null, 2));
  return { ...cur, ...patch };
};
