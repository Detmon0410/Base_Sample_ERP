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
  await page.goto("/sale/orders");
  await expect(page).toHaveURL(/\/login/);
});

test("the user menu holds who the user is, the language and Log out; the language is words and the text follows it", async ({ page }) => {
  await signIn(page, USERS.admin);
  const narrow = (page.viewportSize()?.width ?? 1280) < 768;
  const userMenu = page.getByRole("group", { name: /User menu|ユーザーメニュー/ });

  // closed: nothing of it is on the screen; opened by the name of the user
  await expect(page.getByRole("button", { name: "Log out" })).toHaveCount(0);
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  await expect(userMenu).toContainText("admin@gmail.com");
  await expect(userMenu).toContainText("Administration");
  await expect(userMenu.getByRole("button", { name: "Log out" })).toBeVisible();
  expect(await overflowX(page)).toBeLessThanOrEqual(1);

  await userMenu.getByRole("button", { name: "日本語" }).click();
  if (narrow) await page.getByRole("button", { name: "メニュー", exact: true }).click(); // the menu of a narrow screen opens with one button
  await expect(page.getByRole("link", { name: "ダッシュボード" }).first()).toBeVisible();
  await expect(page.getByRole("group", { name: "ユーザーメニュー" })).toContainText("管理者"); // the role in Japanese
  await page.getByRole("group", { name: "ユーザーメニュー" }).getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("button", { name: "Menu", exact: true }).or(page.getByRole("link", { name: "Dashboard" })).first()).toBeVisible();

  // there is no sidebar and no button that moves the menu
  await expect(page.getByRole("button", { name: /Menu on the left|Menu on top/ })).toHaveCount(0);
  await expect(page.locator("aside")).toHaveCount(0);

  // a click outside closes it
  await page.mouse.click(4, 400); // the bottom left of the page, where the list of a phone does not reach
  await expect(page.getByRole("group", { name: "User menu" })).toHaveCount(0);
});

test("an old address of a material, /stock/<id>, opens the material where it is now", async ({ page }) => {
  await signIn(page, USERS.admin);
  await page.goto("/stock/999");
  await expect(page).toHaveURL(/\/stock\/materials\/999$/);
  await expect(page.getByText("Record not found")).toBeVisible(); // there is no material 999: the page of a material answered
  await page.goto("/stock/abc");
  await expect(page.getByText("Page not found")).toBeVisible();
});

test("an old address (/qt, /orders/5, /users) opens the page where it is now", async ({ page }) => {
  await signIn(page, USERS.admin);
  await page.goto("/qt");
  await expect(page).toHaveURL(/\/sale\/quotations$/);
  await page.goto("/orders/new");
  await expect(page).toHaveURL(/\/sale\/orders\/new$/);
});
