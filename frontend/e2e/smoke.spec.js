import { expect, test } from "@playwright/test";

import { ALL_GROUPS, GROUPS_OF, PAGES, USERS, overflowX, rawKeys, settle, signIn, watchErrors } from "./helpers.js";

// Smoke test (docs/specs/t1-playwright-test-plan.md, part A and part of I): every page opens without an error, at the three
// screen sizes. Soft checks, so one walk reports every page that has a problem instead of stopping at the first.

test.describe("smoke: every page", () => {
  test("the Admin opens every page and its New form", async ({ page }, testInfo) => {
    const errors = watchErrors(page);
    await signIn(page, USERS.admin);
    errors.take(); // the sign-in itself is checked by its own test

    for (const target of PAGES) {
      await test.step(`${target.name} (${target.path})`, async () => {
        await page.goto(target.path);
        await settle(page);

        const main = page.locator("main");
        await expect.soft(main.getByText("Page not found"), `${target.path}: not found`).toHaveCount(0);
        await expect.soft(main.getByText("You do not have permission"), `${target.path}: forbidden`).toHaveCount(0);
        await expect.soft(main.getByText(/not built yet|under construction/i), `${target.path}: not built`).toHaveCount(0);
        expect.soft(await rawKeys(page), `${target.path}: raw translation keys on screen`).toEqual([]);
        expect.soft(await overflowX(page), `${target.path}: page scrolls sideways (${testInfo.project.name})`).toBeLessThanOrEqual(1);

        if (target.newButton) {
          const button = main.getByRole("link", { name: /^New\b/ }).or(main.getByRole("button", { name: /^New\b/ })).first();
          if ((await button.count()) === 0) {
            expect.soft(false, `${target.path}: no New button`).toBe(true);
          } else {
            await button.click();
            const sheet = page.getByRole("dialog");
            await expect.soft(sheet, `${target.path}: the New form does not open`).toBeVisible();
            await settle(page);
            expect.soft(await rawKeys(page), `${target.path} New: raw translation keys`).toEqual([]);
            await page.keyboard.press("Escape");
            await expect.soft(sheet, `${target.path}: the New form does not close with Escape`).toBeHidden();
          }
        }

        expect.soft(errors.take(), `${target.path}: errors in the browser`).toEqual([]);
      });
    }
  });
});

test.describe("smoke: who sees what", () => {
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== "desktop", "the menu is checked once, on the desktop"));

  for (const [who, groups] of Object.entries(GROUPS_OF)) {
    test(`${who} sees only the menu of their departments and cannot open the others`, async ({ page }) => {
      const errors = watchErrors(page);
      await signIn(page, USERS[who]);
      await settle(page);
      const menu = page.locator('[data-slot="sidebar-content"]');
      for (const group of ALL_GROUPS) {
        const button = menu.getByRole("button", { name: group, exact: true }).or(menu.getByRole("link", { name: group, exact: true }));
        if (groups.includes(group)) await expect.soft(button.first(), `${who}: ${group} should be in the menu`).toBeVisible();
        else await expect.soft(button, `${who}: ${group} should not be in the menu`).toHaveCount(0);
      }
      // one page of every group the user may not open must answer "no permission"
      for (const group of ALL_GROUPS.filter((name) => !groups.includes(name))) {
        const target = PAGES.find((candidate) => candidate.group === group);
        await page.goto(target.path);
        await settle(page);
        await expect.soft(page.getByText("You do not have permission"), `${who}: ${target.path} should be forbidden`).toBeVisible();
      }
      expect.soft(errors.take(), `${who}: errors in the browser`).toEqual([]);
    });
  }

  test("a wrong password is refused and nobody is signed in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(USERS.admin.email);
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("The email address or password is incorrect.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("a page opened without signing in goes to the sign-in page", async ({ page }) => {
    await page.goto("/sale/orders");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("smoke: cards on a phone", () => {
  test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== "phone", "the lists are cards only on a phone"));

  test("a card of the price lists opens its sheet, and no link holds another link", async ({ page }) => {
    await signIn(page, USERS.admin);
    await page.goto("/master/price-lists");
    await settle(page);
    expect(await page.locator("main a a").count()).toBe(0);
    const card = page.locator("main ul[aria-label] > li").first();
    await expect(card).toBeVisible();
    await card.click({ position: { x: 20, y: 20 } });
    await expect(page).toHaveURL(/\/master\/price-lists\/\d+/);
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
