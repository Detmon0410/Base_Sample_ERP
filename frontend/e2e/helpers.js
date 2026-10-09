import { expect } from "@playwright/test";

/** The test users of the empty start (docs/specs/f13-workflow-test.md). */
export const USERS = {
  admin: { email: "admin@gmail.com", password: "admin" },
  saleManager: { email: "sale.manager@kanou.test", password: "test1234" },
  saleWorker: { email: "sale.worker@kanou.test", password: "test1234" },
  factoryManager: { email: "factory.manager@kanou.test", password: "test1234" },
  factoryWorker: { email: "factory.worker@kanou.test", password: "test1234" },
  purchaseManager: { email: "purchase.manager@kanou.test", password: "test1234" },
  purchaseWorker: { email: "purchase.worker@kanou.test", password: "test1234" },
  accountingManager: { email: "accounting.manager@kanou.test", password: "test1234" },
  accountingWorker: { email: "accounting.worker@kanou.test", password: "test1234" },
};

/** Every page of the menu (same list as src/config/navigation.js), its menu group and its "New" button when it has one. */
export const PAGES = [
  { path: "/", group: null, name: "Dashboard" },
  { path: "/sale/quotations", group: "Sale", name: "Quotations", newButton: true },
  { path: "/sale/customer-pos", group: "Sale", name: "Customer POs", newButton: true },
  { path: "/sale/orders", group: "Sale", name: "Sale Orders", newButton: true },
  { path: "/sale/deliveries", group: "Sale", name: "Delivery Notes" },
  { path: "/factory/work-orders", group: "Factory", name: "Work Orders", newButton: true },
  { path: "/factory/tracking", group: "Factory", name: "Production tracking" },
  { path: "/factory/transfers", group: "Factory", name: "FG Transfer", newButton: true },
  { path: "/stock", group: "Stock", name: "Stock overview" },
  { path: "/stock/movements", group: "Stock", name: "Stock movements" },
  { path: "/stock/adjustments", group: "Stock", name: "Stock adjustment", newButton: true },
  { path: "/purchase/stock-status", group: "Purchase", name: "Stock status board" },
  { path: "/purchase/orders", group: "Purchase", name: "Purchase orders", newButton: true },
  { path: "/purchase/receipts", group: "Purchase", name: "Goods receipt", newButton: true },
  { path: "/purchase/approvals", group: "Purchase", name: "Approval log" },
  { path: "/accounting/invoices", group: "Accounting", name: "Invoices", newButton: true },
  { path: "/accounting/receipts", group: "Accounting", name: "Customer receipts", newButton: true },
  { path: "/accounting/bills", group: "Accounting", name: "Supplier bills", newButton: true },
  { path: "/accounting/payments", group: "Accounting", name: "Supplier payments", newButton: true },
  { path: "/accounting/journal", group: "Accounting", name: "Journal", newButton: true },
  { path: "/accounting/master", group: "Accounting", name: "Accounting master" },
  { path: "/trace", group: "Traceability", name: "Product trace" },
  { path: "/master/customers", group: "Master Data", name: "Customers", newButton: true },
  { path: "/master/suppliers", group: "Master Data", name: "Suppliers", newButton: true },
  { path: "/master/products", group: "Master Data", name: "Products", newButton: true },
  { path: "/master/materials", group: "Master Data", name: "Materials", newButton: true },
  { path: "/master/warehouses", group: "Master Data", name: "Warehouses", newButton: true },
  { path: "/master/machines", group: "Master Data", name: "Machines", newButton: true },
  { path: "/master/employees", group: "Master Data", name: "Employees", newButton: true },
  { path: "/master/uom", group: "Master Data", name: "Units of measure", newButton: true },
  { path: "/master/price-lists", group: "Master Data", name: "Price lists", newButton: true },
  { path: "/admin/users", group: "Administration", name: "Users", newButton: true },
  { path: "/admin/roles", group: "Administration", name: "Departments & roles" },
];

/** The menu groups each user should see (Traceability is open to every department). */
export const GROUPS_OF = {
  admin: ["Sale", "Factory", "Stock", "Purchase", "Accounting", "Traceability", "Master Data", "Administration"],
  saleManager: ["Sale", "Traceability"],
  saleWorker: ["Sale", "Traceability"],
  factoryManager: ["Factory", "Stock", "Traceability"],
  factoryWorker: ["Factory", "Stock", "Traceability"],
  purchaseManager: ["Stock", "Purchase", "Traceability"],
  purchaseWorker: ["Stock", "Purchase", "Traceability"],
  accountingManager: ["Accounting", "Traceability"],
  accountingWorker: ["Accounting", "Traceability"],
};
export const ALL_GROUPS = GROUPS_OF.admin;

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
