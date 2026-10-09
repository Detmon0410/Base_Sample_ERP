import { expect, test } from "@playwright/test";

import { act, errorsOf, expectStatus, expectToast, openAs, openRow, pick, pickFirst, pickToday, save, seedOpeningStock, sheet } from "./flow.js";
import { USERS, settle } from "./helpers.js";

// B1 of docs/specs/t1-playwright-test-plan.md: from a quotation to the money in the bank, one tab per user.
test("B1 sale to cash: quotation, order, production, delivery, invoice, receipt", async ({ context }) => {
  test.setTimeout(10 * 60 * 1000);
  await seedOpeningStock(context);

  const saleWorker = await openAs(context, USERS.saleWorker);

  await test.step("Sale Worker makes a quotation and sends it", async () => {
    await saleWorker.goto("/sale/quotations");
    await settle(saleWorker);
    await saleWorker.getByRole("link", { name: /^New quotation/ }).first().click();
    await pick(saleWorker, "qt-customerId", "C001");
    await pick(saleWorker, "line-0-product", "RF-2D");
    await expect(sheet(saleWorker).getByLabel(/Unit price, line 1/)).toHaveValue("64000"); // the price comes from the price list of the customer
    await sheet(saleWorker).getByLabel(/Quantity, line 1/).fill("2");
    await save(saleWorker);
    await expectToast(saleWorker, "saved");
    await act(saleWorker, "Send");
    await expectStatus(saleWorker, "Sent");
    await act(saleWorker, "Mark accepted");
    await expectStatus(saleWorker, "Accepted");
  });

  let orderNumber;
  await test.step("Sale Worker turns the quotation into a sale order and asks for the confirmation", async () => {
    await act(saleWorker, "Create sale order");
    await expect(saleWorker).toHaveURL(/\/sale\/orders\/\d+/);
    orderNumber = (await sheet(saleWorker).getByText(/SO-\d{4}-\d{4}/).first().innerText()).trim();
    await act(saleWorker, "Request confirmation");
  });

  await test.step("Sale Manager confirms the order, Sale Worker sends it to the factory", async () => {
    const saleManager = await openAs(context, USERS.saleManager);
    await openRow(saleManager, "/sale/orders", orderNumber);
    await act(saleManager, "Approve");
    await expectStatus(saleManager, "Confirmed");
    await saleManager.close();
    // the open sheet of the Sale Worker follows the change of the Manager by itself (no reload)
    await act(saleWorker, "Send to factory");
    await expectStatus(saleWorker, "In production");
  });

  let workOrderNumber;
  await test.step("Factory Worker makes a work order for what is waiting, Factory Manager schedules it", async () => {
    const factoryWorker = await openAs(context, USERS.factoryWorker);
    await factoryWorker.goto("/factory/work-orders");
    await settle(factoryWorker);
    await expect(factoryWorker.getByText(orderNumber).first()).toBeVisible(); // the order waits for a work order
    await factoryWorker.getByRole("link", { name: /^New work order/ }).first().click();
    await pickFirst(factoryWorker, "wo-line");
    await pickToday(factoryWorker, "wo-planStart");
    await pickToday(factoryWorker, "wo-planFinish");
    await save(factoryWorker);
    await expectToast(factoryWorker, "saved");
    workOrderNumber = (await sheet(factoryWorker).getByText(/WO-\d{4}-\d{4}/).first().innerText()).trim();
    await factoryWorker.close();

    const factoryManager = await openAs(context, USERS.factoryManager);
    await openRow(factoryManager, "/factory/work-orders", workOrderNumber);
    await act(factoryManager, "Schedule");
    await expectStatus(factoryManager, "Scheduled");
    await factoryManager.close();
  });

  await test.step("Factory Worker runs the four production steps on the tracking board", async () => {
    const worker = await openAs(context, USERS.factoryWorker);
    for (let stepNo = 1; stepNo <= 4; stepNo += 1) {
      await worker.goto("/factory/tracking");
      await settle(worker);
      await worker.getByRole("button", { name: /^Start/ }).first().click();
      const startDialog = worker.getByRole("alertdialog");
      await pickFirst(worker, "step-operator");
      await startDialog.getByRole("button", { name: /^Start/ }).click();
      await expect(startDialog).toBeHidden();
      await worker.getByRole("button", { name: /^Done/ }).first().click();
      const doneDialog = worker.getByRole("alertdialog");
      await doneDialog.getByRole("button").last().click();
      await expect(doneDialog).toBeHidden();
    }
    await worker.close();
  });

  await test.step("Factory Manager finishes the work order", async () => {
    const manager = await openAs(context, USERS.factoryManager);
    await openRow(manager, "/factory/work-orders", workOrderNumber);
    await act(manager, "Finish");
    await expectStatus(manager, "Finished");
    await manager.close();
  });

  await test.step("Factory Worker makes the two serial numbers and a transfer to the warehouse, Factory Manager posts it", async () => {
    const worker = await openAs(context, USERS.factoryWorker);
    await openRow(worker, "/factory/work-orders", workOrderNumber);
    for (let unit = 1; unit <= 2; unit += 1) {
      await sheet(worker).getByRole("button", { name: /Generate S\/N/ }).first().click();
      await expect(sheet(worker).getByText(/RF-2D-\d{2}-\d{6}/)).toHaveCount(unit);
    }
    await sheet(worker).getByRole("button", { name: "Create transfer" }).click();
    await expect(worker).toHaveURL(/\/factory\/transfers\/new/);
    await expect(worker.locator("#ft-qty")).toHaveValue("2"); // the quantity is the quantity left, filled by the page
    await expect(worker.locator("#ft-warehouseId")).toContainText("WH-F"); // the only finished goods warehouse is chosen by the page
    await save(worker);
    await expectToast(worker, "saved");
    const transferNumber = (await sheet(worker).getByText(/(FT|TR)-\d{4}-\d{4}/).first().innerText()).trim();
    await worker.close();

    const manager = await openAs(context, USERS.factoryManager);
    await openRow(manager, "/factory/transfers", transferNumber);
    await act(manager, "Transfer");
    await manager.close();
  });

  let deliveryNumber;
  await test.step("Sale Worker marks the order ready and makes the delivery note", async () => {
    await saleWorker.goto("/sale/orders");
    await settle(saleWorker);
    await saleWorker.getByText(orderNumber).first().click({ force: true });
    await act(saleWorker, "Mark ready to deliver");
    await expectStatus(saleWorker, "Ready to deliver");
    await act(saleWorker, "Create delivery note");
    await expect(saleWorker).toHaveURL(/\/sale\/deliveries\/\d+/);
    deliveryNumber = (await sheet(saleWorker).getByText(/DN-\d{4}-\d{4}/).first().innerText()).trim();
  });

  await test.step("Sale Worker names the two units on the delivery note and confirms the delivery", async () => {
    await sheet(saleWorker).getByRole("button", { name: /^Choose/ }).click();
    await saleWorker.getByRole("button", { name: /^Choose the first/ }).click();
    await saleWorker.keyboard.press("Escape");
    await save(saleWorker);
    await expectToast(saleWorker, "saved");
    await act(saleWorker, "Confirm delivery");
    await expectStatus(saleWorker, "Delivered");
  });

  let invoiceNumber;
  await test.step("Accounting Worker makes the invoice from the delivery note, Accounting Manager issues it", async () => {
    const worker = await openAs(context, USERS.accountingWorker);
    await worker.goto("/accounting/invoices");
    await settle(worker);
    await worker.getByRole("button", { name: "Create invoice" }).or(worker.getByRole("link", { name: "Create invoice" })).first().click();
    await expect(sheet(worker).getByText(/VAT10/)).toBeVisible(); // the tax rate is filled by the page once the lists are loaded
    await save(worker);
    await expectToast(worker, "saved");
    invoiceNumber = (await sheet(worker).getByText(/INV-\d{4}-\d{4}/).first().innerText()).trim();
    await worker.close();

    const manager = await openAs(context, USERS.accountingManager);
    await openRow(manager, "/accounting/invoices", invoiceNumber);
    await act(manager, "Issue invoice");
    await manager.close();
  });

  await test.step("Accounting Worker receives the money in full and the invoice is paid", async () => {
    const worker = await openAs(context, USERS.accountingWorker);
    await openRow(worker, "/accounting/invoices", invoiceNumber);
    await expect(sheet(worker).getByText("¥140,800").first()).toBeVisible(); // 2 x 64,000 + 10 % tax
    await sheet(worker).getByRole("button", { name: "Receive payment" }).or(sheet(worker).getByRole("link", { name: "Receive payment" })).click();
    await expect(worker).toHaveURL(/\/accounting\/receipts\/new/);
    await expect(sheet(worker).getByLabel(/^Amount/)).not.toHaveValue(""); // the open balance is filled by the page
    await pickFirst(worker, "receipts-methodId");
    await pickFirst(worker, "receipts-bankAccountId");
    await save(worker);
    await expectToast(worker, "saved");
    await act(worker, "Confirm");
    await worker.goto("/accounting/invoices");
    await settle(worker);
    // a row of the table on a big screen, a card on a phone
    await expect(worker.locator("main tr, main li").filter({ hasText: invoiceNumber }).getByText("Paid", { exact: true }).first()).toBeVisible();
    await worker.close();
  });

  await test.step("Sale Manager closes the order", async () => {
    const manager = await openAs(context, USERS.saleManager);
    await openRow(manager, "/sale/orders", orderNumber);
    await act(manager, "Close order");
    await expectStatus(manager, "Closed");
    await manager.close();
  });

  await test.step("The whole life of a unit can be read from its serial number", async () => {
    await saleWorker.goto("/trace");
    await settle(saleWorker);
    await saleWorker.getByRole("searchbox").or(saleWorker.getByRole("textbox")).first().fill("RF-2D-26-000001");
    await saleWorker.keyboard.press("Enter");
    await saleWorker.getByText("RF-2D-26-000001").first().click({ force: true });
    await settle(saleWorker);
    for (const text of [workOrderNumber, orderNumber, deliveryNumber, invoiceNumber]) {
      await expect(saleWorker.locator("main").getByText(text).first(), `the trace of the unit should show ${text}`).toBeVisible();
    }
  });

  await test.step("The books agree: no negative stock, the finished goods came in and went out, the invoice is paid", async () => {
    const manager = await openAs(context, USERS.factoryManager);
    await manager.goto("/stock");
    await settle(manager);
    const main = manager.locator("main");
    expect(await main.innerText(), "a material has a negative quantity on hand").not.toMatch(/-d/);
    await manager.getByRole("tab", { name: /Products/ }).or(manager.getByRole("button", { name: /Products/ })).first().click();
    await settle(manager);
    const row = main.locator("tr, li").filter({ hasText: "RF-2D" }).first(); // a row, or a card on a phone
    await expect(row, "the two refrigerators left the warehouse, so none are on hand").toContainText("0 pcs");
    await manager.close();
  });

  expect(errorsOf(context), "errors in the browser, in any tab").toEqual([]);
});
