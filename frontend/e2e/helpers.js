import { expect } from "@playwright/test";

/** The users of the mock (frontend/src/services/mock/users.js). */
export const USERS = {
  admin: { email: "admin@gmail.com", password: "admin" },
  factory: { email: "worker@gmail.com", password: "worker" }, // a Factory Worker
  sale: { email: "sale@gmail.com", password: "sale" }, // a Sale Worker
};

/** Every page of the menu (src/config/navigation.js) and who may open it. */
export const PAGES = [
  { path: "/", name: "Dashboard", roles: ["admin", "sale", "factory"] },
  { path: "/sale/quotations", name: "Quotations", roles: ["admin", "sale"] },
  { path: "/sale/orders", name: "Production orders", roles: ["admin", "sale", "factory"] },
  { path: "/purchase/orders", name: "Purchase orders", roles: ["admin", "factory"] },
  { path: "/accounting", name: "Accounting", roles: ["admin"] },
  { path: "/stock/materials", name: "Materials and stock", roles: ["admin", "sale", "factory"] },
  { path: "/stock/movements", name: "Movements", roles: ["admin", "sale", "factory"] },
  { path: "/master/customers", name: "Customers", roles: ["admin", "sale"] },
  { path: "/master/products", name: "Products and BOM", roles: ["admin", "sale", "factory"] },
  { path: "/master/suppliers", name: "Suppliers", roles: ["admin", "factory"] },
  { path: "/master/users", name: "Users", roles: ["admin"] },
  { path: "/master/er-diagram", name: "ER diagram", roles: ["admin"] },
  { path: "/master/db-relations", name: "DB relations", roles: ["admin"] },
  { path: "/master/flow-chart", name: "Flow Chart", roles: ["admin"] },
  { path: "/master/user-flow", name: "User Flow", roles: ["admin"] },
  { path: "/master/apis-diagram", name: "APIs Diagram", roles: ["admin"] },
];

/** The words of the menu in the header, per user (a menu with one visible entry is that entry alone). */
export const MENU_OF = {
  admin: ["Dashboard", "Sales", "Purchase", "Accounting", "Stock", "Master data"],
  factory: ["Dashboard", "Production orders", "Purchase", "Stock", "Master data"],
  sale: ["Dashboard", "Sales", "Stock", "Master data"],
};

/**
 * Collects what goes wrong in the browser while a test runs: console errors, uncaught exceptions, failed requests.
 * `take()` returns what was collected since the last call (so each page of a walk gets its own list).
 */
export function watchErrors(page) {
  let errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`exception: ${error.message}`));
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText ?? "";
    if (failure.includes("ERR_ABORTED")) return; // a navigation that cancels a pending request is normal
    errors.push(`request failed: ${request.method()} ${request.url()} (${failure})`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  return {
    take() {
      const out = errors;
      errors = [];
      return out;
    },
  };
}

export async function signIn(page, user) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.locator("main")).toBeVisible();
}

/** Waits until the page has nothing loading (skeletons and lists set aria-busy while they load). */
export async function settle(page) {
  await page.waitForLoadState("networkidle");
  await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0, { timeout: 15 * 1000 });
}

/** Texts on screen, and placeholders / labels / titles of fields, that look like a translation key that was not found, e.g. "accounting.overdueContext". */
export async function rawKeys(page) {
  return page.evaluate(() => {
    const found = new Set();
    const looksLikeKey = (text) => /^[a-z][a-zA-Z0-9]*([.][a-zA-Z0-9_]+)+$/.test(text) && !/[.](com|test|jp|js|md)$/.test(text);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent.trim();
      if (looksLikeKey(text)) found.add(text);
    }
    for (const element of document.querySelectorAll("[placeholder], [aria-label], [title], [alt]")) {
      for (const name of ["placeholder", "aria-label", "title", "alt"]) {
        const value = (element.getAttribute(name) ?? "").trim();
        if (value && looksLikeKey(value)) found.add(`${name}: ${value}`);
      }
    }
    return [...found];
  });
}

/** Horizontal scroll of the whole page (should be none): how many px wider the page is than the window. */
export async function overflowX(page) {
  return page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
}

/**
 * Takes out of a list of collected errors the refusals the tests make on purpose (a wrong payment, a short stock, a page of another role):
 * a real backend answers them with 400, 403 or 409, and the browser logs each one as a console error. The mock has no HTTP, so it logs none.
 */
export const withoutRefusals = (lines) => lines.filter((line) => !/^HTTP (400|403|409):/.test(line) && !/^console: Failed to load resource: the server responded with a status of (400|403|409)/.test(line));
