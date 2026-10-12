import { expect, test } from "@playwright/test";

import { MENU_OF, PAGES, USERS, overflowX, rawKeys, settle, signIn, watchErrors } from "./helpers.js";

// Smoke test: every page opens without an error, for each of the two users, and each user sees only the menu and the pages
// of their role. Soft checks, so one walk reports every problem instead of stopping at the first.

for (const who of Object.keys(USERS)) {
  test.describe(`smoke: ${who}`, () => {
    test(`${who} sees the menu of the role and opens every page of it`, async ({ page }) => {
      const errors = watchErrors(page);
      await signIn(page, USERS[who]);
      await settle(page);
      errors.take();

      const menu = page.getByRole("navigation", { name: "Main menu" });
      const narrow = (page.viewportSize()?.width ?? 1280) < 768;
      if (narrow) await page.getByRole("button", { name: "Menu", exact: true }).click();
      for (const word of MENU_OF[who]) {
        await expect.soft(menu.getByRole("link", { name: word, exact: true }).or(menu.getByRole("button", { name: new RegExp(`^${word}`) })).first(), `${who}: "${word}" should be in the menu`).toBeVisible();
      }

      for (const target of PAGES) {
        await test.step(`${target.name} (${target.path})`, async () => {
          await page.goto(target.path);
          await settle(page);
          if (target.roles.includes(who)) {
            await expect.soft(page.locator("main"), `${target.path}: not built or missing`).toBeVisible();
            await expect.soft(page.getByText("Page not found"), `${target.path}: not found`).toHaveCount(0);
            await expect.soft(page.getByText("You do not have permission"), `${target.path}: forbidden for ${who}`).toHaveCount(0);
            expect.soft(await rawKeys(page), `${target.path}: raw translation keys on screen`).toEqual([]);
            expect.soft(await overflowX(page), `${target.path}: page scrolls sideways`).toBeLessThanOrEqual(1);
          } else {
            await expect.soft(page.getByText("You do not have permission"), `${target.path} should be forbidden for ${who}`).toBeVisible();
          }
          expect.soft(errors.take(), `${target.path}: errors in the browser`).toEqual([]);
        });
      }
    });
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
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login/);
});

test("the language buttons are words, and the text follows the language", async ({ page }) => {
  await signIn(page, USERS.admin);
  const narrow = (page.viewportSize()?.width ?? 1280) < 768;
  const openMenu = async (name) => {
    if (narrow) await page.getByRole("button", { name, exact: true }).click(); // the menu of a narrow screen opens with one button
  };
  await page.getByRole("button", { name: "日本語" }).first().click();
  await openMenu("メニュー");
  await expect(page.getByRole("link", { name: "ダッシュボード" }).first()).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("button", { name: "Menu", exact: true }).or(page.getByRole("link", { name: "Dashboard" })).first()).toBeVisible();
});

test("the menu moves from the top bar to a list on the left and back, and every entry still opens", async ({ page }) => {
  await signIn(page, USERS.admin);
  const narrow = (page.viewportSize()?.width ?? 1280) < 768;
  await page.getByRole("button", { name: "Menu on the left" }).click();
  if (narrow) await page.getByRole("button", { name: "Menu", exact: true }).click();
  const menu = page.getByRole("navigation", { name: "Main menu" });
  await expect(menu.locator("xpath=ancestor::header")).toHaveCount(0); // not in the bar any more
  for (const word of ["Quotations (QT)", "Production orders", "Invoices and receipts", "Customers", "Products and BOM", "Materials and stock", "Users"]) {
    await expect(menu.getByRole("link", { name: word, exact: true })).toBeVisible();
  }
  await menu.getByRole("link", { name: "Customers", exact: true }).click();
  await expect(page).toHaveURL(/\/customers$/);
  expect(await overflowX(page)).toBeLessThanOrEqual(1);

  await page.reload(); // the choice is kept
  await expect(page.getByRole("button", { name: "Menu on top" })).toBeVisible();
  await page.getByRole("button", { name: "Menu on top" }).click();
  await expect(page.getByRole("button", { name: "Menu on the left" })).toBeVisible();
});

test("an old address of a material, /stock/<id>, opens the material where it is now", async ({ page }) => {
  await signIn(page, USERS.admin);
  await page.goto("/stock/999");
  await expect(page).toHaveURL(/\/stock\/materials\/999$/);
  await expect(page.getByText("Record not found")).toBeVisible(); // there is no material 999: the page of a material answered
  await page.goto("/stock/abc");
  await expect(page.getByText("Page not found")).toBeVisible();
});
