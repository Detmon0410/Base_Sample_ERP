import { expect } from "@playwright/test";

import { USERS, settle, signIn, watchErrors } from "./helpers.js";

// Helpers for the end-to-end cases of the workflow (docs/specs/t1-playwright-test-plan.md, part B).

const watchers = new WeakMap();

/** A tab of the same browser context, signed in as another user. The data is shared, the sign-in is not. What goes wrong in the tab is kept: see `errorsOf`. */
export async function openAs(context, user) {
  const page = await context.newPage();
  if (!watchers.has(context)) watchers.set(context, []);
  watchers.get(context).push({ user: user.email, watch: watchErrors(page) });
  await signIn(page, user);
  return page;
}

/** Every console error, exception, failed request and missing translation of the tabs opened with `openAs`, with the user of the tab. */
export function errorsOf(context) {
  return (watchers.get(context) ?? []).flatMap(({ user, watch }) => watch.take().map((error) => `${user}: ${error}`));
}

/** Choose an option of an EntitySelect (the button with the id), by a part of its text: "C001", "RF-2D" ... */
export async function pick(page, trigger, text) {
  const button = typeof trigger === "string" ? page.locator(`#${trigger}`) : trigger;
  await button.click();
  await page.getByRole("option", { name: text }).first().getByRole("button").click();
}

/** Choose the first option of an EntitySelect. */
export async function pickFirst(page, trigger) {
  const button = typeof trigger === "string" ? page.locator(`#${trigger}`) : trigger;
  await button.click();
  await page.getByRole("option").first().getByRole("button").click();
}

/** Choose today in a DatePicker (the button with the id). */
export async function pickToday(page, id) {
  await page.locator(`#${id}`).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
}

/** Open a document from a list by its number (or any text of its row). */
export async function openRow(page, listPath, text) {
  await page.goto(listPath);
  await settle(page);
  await page.locator("main").getByText(text).first().click({ force: true }); // on a phone the card link lies over the text
  await expect(page.getByRole("dialog").first()).toBeVisible();
}

/** The side sheet that holds a document. */
export const sheet = (page) => page.getByRole("dialog").first();

/** Press a status button of an open sheet and confirm the dialog it opens (the last button of the dialog is the confirm one). */
export async function act(page, button, { note } = {}) {
  await sheet(page).getByRole("button", { name: button, exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  if (note != null) await dialog.getByRole("textbox").fill(note);
  await dialog.getByRole("button").last().click();
  // when the action is refused the dialog stays open and a toast tells why: report that text, not just "still visible"
  const seen = new Set();
  for (let waited = 0; waited < 8000 && (await dialog.isVisible()); waited += 200) {
    for (const text of await page.locator("[data-sonner-toast]").allInnerTexts()) seen.add(text.replace(/s+/g, " "));
    await page.waitForTimeout(200);
  }
  if (await dialog.isVisible()) throw new Error(`"${button}" was refused. Messages on screen: ${JSON.stringify([...seen])}`);
}

/** A toast with this text appears (the result of an action). */
export async function expectToast(page, text) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}

/** The status badge in the header of the open sheet. */
export async function expectStatus(page, status) {
  await expect(sheet(page).getByText(status, { exact: true }).first()).toBeVisible();
}

/** Save the form of the open sheet. */
export async function save(page) {
  await sheet(page).getByRole("button", { name: "Save", exact: true }).click();
}

/** Seed the stock of every material, the way the pages do it (a Worker makes the adjustment, a Manager approves it). Faster than clicking 6 times. */
export async function seedOpeningStock(context, qty = 1000) {
  const page = await context.newPage();
  await page.goto("/login");
  await page.evaluate(
    async ({ qty, worker, manager }) => {
      const { login } = await import("/src/services/auth.service.js");
      const { setToken } = await import("/src/utils/session.js");
      const { api, unwrapList } = await import("/src/services/api.js");
      const { adjustmentService } = await import("/src/services/stock.service.js");
      const as = async (user) => setToken((await login(user)).token);

      await as(worker);
      const materials = unwrapList(await api.get("/master/materials", { params: { pageSize: 100 } })).items;
      const warehouses = unwrapList(await api.get("/master/warehouses", { params: { pageSize: 100 } })).items;
      const raw = warehouses.find((warehouse) => warehouse.type === "RAW_MATERIAL");
      const today = new Date().toISOString().slice(0, 10);
      const made = [];
      for (const material of materials) {
        const adjustment = await adjustmentService.create({ itemType: "material", itemId: material.id, warehouseId: raw.id, countedQty: qty, reason: "opening", date: today, remarks: "" });
        await adjustmentService.run(adjustment.id, "request", {});
        made.push(adjustment.id);
      }
      await as(manager);
      for (const id of made) await adjustmentService.run(id, "approve", {});
      return made.length;
    },
    { qty, worker: USERS.factoryWorker, manager: USERS.factoryManager },
  );
  await page.close();
}

export { settle };
