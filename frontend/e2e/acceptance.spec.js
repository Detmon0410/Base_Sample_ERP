import fs from "node:fs";

import { expect, test } from "@playwright/test";

import { USERS, rawKeys, settle, signIn, watchErrors } from "./helpers.js";

// The acceptance case of the requirements (BaseRequirement_md/simplified_factory_system_requirements.md, section 10): the ten steps
// of the example, in one run, with the Admin and a Worker whose account is made in step 1. Desktop only.

test.skip(({ viewport }) => (viewport?.width ?? 1280) < 1000, "one flow, on the desktop");
test.setTimeout(3 * 60 * 1000);

const WORKER = { name: "Mika Sato", email: "mika@factory.jp", password: "secret1" };

/** Clicks a "Download PDF" button and checks the file: its name is the number of the document, and it is a real PDF. */
const downloadPdf = async (page, index, fileName) => {
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PDF" }).nth(index).click()]);
  expect(download.suggestedFilename()).toBe(fileName);
  const bytes = fs.readFileSync(await download.path());
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  expect(bytes.length).toBeGreaterThan(5000); // a drawn page, not an empty file
};

const logOut = async (page) => {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
};

/** The row of a process in the table of a product (its name starts with the step number; the history rows start with a date). */
const processRow = (page, name) => page.getByRole("row", { name: new RegExp(String.raw`^\d+ ${name}`) });

const open = async (page, path, link) => {
  await page.goto(path);
  await settle(page);
  if (link) await page.getByRole("link", { name: link }).click();
};

test("the example of the requirements, from the customer to the receipt", async ({ page }) => {
  const errors = watchErrors(page);
  // the print dialog cannot be driven: it is replaced by a note of which document was sent to it
  await page.addInitScript(() => {
    window.print = () => {
      window.__printed = document.body.dataset.printing;
    };
  });
  await signIn(page, USERS.admin);

  // 1. a customer, a product, a material lot, the BOM reference and the staff accounts
  await open(page, "/customers", "New customer");
  await page.getByLabel("Name", { exact: true }).fill("Tokyo Cold Chain");
  await page.getByLabel("Address").fill("1-2-3 Koto, Tokyo");
  await page.getByLabel("Email").fill("buyer@tokyocold.jp");
  await page.getByLabel("Telephone").fill("03-1234-5678");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: "Tokyo Cold Chain" })).toBeVisible();

  await open(page, "/stock/materials", "New material");
  await page.getByLabel("Code").fill("STEEL-01");
  await page.getByLabel("Name", { exact: true }).fill("Steel sheet");
  await page.getByRole("button", { name: "Add a lot" }).click();
  await page.getByLabel("Lot number").fill("LOT-A");
  await page.getByLabel("Quantity").fill("100");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: "STEEL-01" })).toBeVisible();

  await open(page, "/products", "New product");
  await page.getByLabel("Code").fill("FR-100");
  await page.getByLabel("Name", { exact: true }).fill("Refrigerator 100L");
  await page.getByLabel("Price").fill("45000");
  await page.getByRole("button", { name: "Add a material" }).click();
  await page.getByLabel("Material").selectOption({ label: "STEEL-01 Steel sheet" });
  await page.getByLabel("Quantity").fill("2.5");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: "FR-100" })).toBeVisible();

  await open(page, "/users", "New user");
  await page.getByLabel("Name", { exact: true }).fill(WORKER.name);
  await page.getByLabel("Email").fill(WORKER.email);
  await page.getByLabel("Department").selectOption("Factory");
  await page.getByLabel("Role").selectOption("Worker");
  await page.getByLabel("Password").fill(WORKER.password);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: WORKER.name })).toBeVisible();

  // 2. a QT reference with its file
  await open(page, "/qt", "New QT reference");
  await page.getByLabel("QT number").fill("QT-001");
  await page.getByLabel("Customer").selectOption({ label: "Tokyo Cold Chain" });
  await page.getByLabel("Notes").fill("Ten refrigerators");
  await page.getByLabel("QT file").setInputFiles({ name: "qt-001.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 quotation QT-001") });
  await expect(page.getByText("Attached file:")).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("row", { name: /QT-001/ })).toContainText("qt-001.pdf");

  // 3 and 4. an order of 10 units linked to the QT, and its processes added by hand
  await open(page, "/orders", "New production order");
  await page.getByLabel("QT reference").selectOption({ label: "QT-001 Tokyo Cold Chain" });
  await expect(page.getByLabel("Customer")).toHaveValue(/\d+/); // the customer of the QT
  await page.getByLabel("Product", { exact: true }).selectOption({ label: "FR-100 Refrigerator 100L" });
  await expect(page.getByLabel("Agreed unit price")).toHaveValue("45000");
  await page.getByLabel("Quantity").fill("10");
  await page.getByRole("button", { name: "Add a process" }).click();
  await page.getByRole("button", { name: "Add a process" }).click();
  await page.getByLabel("Process", { exact: true }).nth(0).fill("Cutting");
  await page.getByLabel("Process", { exact: true }).nth(1).fill("Welding");
  await page.getByRole("button", { name: "Save" }).click();

  const orderLink = page.getByRole("link", { name: /^ORD-\d{4}-0001$/ });
  await expect(orderLink).toBeVisible();
  const orderNumber = (await orderLink.textContent()).trim();
  await orderLink.click();
  await page.getByRole("button", { name: "Start production" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("New"); // started, but no process has started yet
  await logOut(page);

  // 5. a Worker records progress and completes 10 units on every process
  await signIn(page, WORKER);
  await open(page, "/orders", orderNumber);
  for (const name of ["Cutting", "Welding"]) {
    await page.getByRole("button", { name: "Record progress" }).first().click();
    await page.getByLabel("Status").selectOption("In Progress");
    await page.getByLabel("Completed quantity (total so far)").fill("4");
    await page.getByRole("button", { name: "Save progress" }).click();
    await expect(processRow(page, name)).toContainText("In progress");

    if (name === "Cutting") {
      // the Dashboard of the Worker shows the order in progress: 4 of the 20 pieces (two processes of 10) are done
      await open(page, "/");
      await expect(page.getByRole("link", { name: orderNumber })).toBeVisible();
      await expect(page.getByText("20% (4 of 20)")).toBeVisible();
      await open(page, "/orders", orderNumber);
    }

    await processRow(page, name).getByRole("button", { name: "Record progress" }).click();
    await page.getByLabel("Status").selectOption("Completed");
    await page.getByLabel("Completed quantity (total so far)").fill("10");
    await page.getByRole("button", { name: "Save progress" }).click();
    await expect(processRow(page, name)).toContainText("Completed");
  }
  // 6. the order is Completed
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Completed");
  await expect(page.getByRole("button", { name: "Record progress" })).toHaveCount(0); // a Worker cannot reopen
  await logOut(page);

  // 7. the Admin deducts material stock by hand and reads the history
  await signIn(page, USERS.admin);
  await open(page, "/stock/materials", "STEEL-01");
  await page.getByLabel("Type").selectOption("Deduct");
  await page.getByLabel("Lot", { exact: true }).selectOption({ label: "LOT-A (100)" });
  await page.getByLabel("Quantity").fill("25");
  await page.getByLabel("Production order (optional)").selectOption({ label: `${orderNumber} Tokyo Cold Chain` });
  await page.getByLabel("Note").fill("Used for the order");
  await page.getByRole("button", { name: "Save the change" }).click();
  await expect(page.getByRole("row", { name: /LOT-A/ }).first()).toContainText("75");
  const history = page.getByRole("heading", { name: "Stock history" }).locator("xpath=ancestor::section");
  await expect(history.getByRole("row", { name: /Deduct/ })).toContainText("-25");
  await expect(history.getByRole("row", { name: /Deduct/ })).toContainText(orderNumber);

  // the movements page: the same deduction among the changes of every material; a click on the row opens the material
  await open(page, "/stock/movements");
  await expect(page.getByRole("row", { name: /Deduct/ })).toContainText("STEEL-01");
  await expect(page.getByRole("row", { name: /Deduct/ })).toContainText("-25");
  await expect(page.getByRole("row", { name: /Deduct/ })).toContainText(orderNumber);
  await page.getByLabel("Type").selectOption("Add");
  await expect(page.getByRole("row", { name: /Deduct/ })).toHaveCount(0);
  await page.getByLabel("Type").selectOption("Deduct");
  await page.getByRole("row", { name: /Deduct/ }).getByText("Used for the order").click();
  await expect(page).toHaveURL(/\/stock\/materials\/\d+$/);

  // 8. an invoice for the completed order, and its document sent to print / PDF
  await open(page, "/invoices", "New invoice");
  await page.getByLabel("Production order").selectOption({ label: `${orderNumber} Tokyo Cold Chain` });
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  const invoiceLink = page.getByRole("link", { name: /^INV-\d{4}-0001$/ });
  await expect(invoiceLink).toBeVisible();
  const invoiceNumber = (await invoiceLink.textContent()).trim();
  await invoiceLink.click();
  await expect(page.getByText("Total: ¥450,000", { exact: true })).toBeVisible();
  await downloadPdf(page, 0, `${invoiceNumber}.pdf`); // the invoice as a PDF file
  await page.getByRole("button", { name: "Print", exact: true }).click();
  expect(await page.evaluate(() => window.__printed)).toBe("invoice");

  // 9. the full payment: Paid, and the receipt
  await page.getByLabel("Amount paid").fill("449999");
  await page.getByLabel("Payment method").selectOption("Bank transfer");
  await page.getByLabel("Reference or notes (optional)").fill("Slip 20261010");
  await page.getByRole("button", { name: "Record the payment" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("The payment must be equal to the total of the invoice.")).toBeVisible();
  await page.getByLabel("Amount paid").fill("450000");
  await page.getByRole("button", { name: "Record the payment" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Paid");
  await expect(page.getByRole("heading", { level: 2, name: "Receipt" })).toBeVisible();
  await expect(page.getByText("Payment method: Bank transfer")).toBeVisible();
  const receiptNumber = (await page.locator("[data-print-doc=receipt] dd").first().textContent()).trim();
  await downloadPdf(page, 1, `${receiptNumber}.pdf`); // the receipt as a PDF file
  await page.getByRole("button", { name: "Print", exact: true }).nth(1).click();
  expect(await page.evaluate(() => window.__printed)).toBe("receipt");

  // 10. the order shows its QT reference, the progress, the invoice and the receipt
  await open(page, "/orders", orderNumber);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Completed");
  await expect(page.getByRole("link", { name: "QT-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: invoiceNumber })).toBeVisible();
  await expect(page.getByRole("link", { name: /^RC-\d{4}-0001$/ })).toBeVisible();
  const progress = page.getByRole("heading", { name: "Progress history" }).locator("xpath=ancestor::section");
  await expect(progress.getByRole("row")).toHaveCount(5); // the header and the four updates
  await expect(progress.getByText("Mika Sato").first()).toBeVisible();

  // deleting: a record that is still used is refused and the message says where it is used
  await open(page, "/customers", "Tokyo Cold Chain");
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("This record cannot be deleted because it is still used:")).toBeVisible();
  await expect(page.getByText("QT references: QT-001")).toBeVisible();
  await expect(page.getByText(`Production orders: ${orderNumber}`)).toBeVisible();

  await open(page, "/products", "FR-100");
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText(`Production orders: ${orderNumber}`)).toBeVisible();

  await open(page, "/stock/materials", "STEEL-01");
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Products: FR-100")).toBeVisible(); // its BOM line
  await expect(page.getByText("Stock changes after the first stock: 1")).toBeVisible(); // the deduction of step 7

  // a record that nobody uses is deleted, and the list opens without it
  await open(page, "/customers", "New customer");
  await page.getByLabel("Name", { exact: true }).fill("Free Customer");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("link", { name: "Free Customer" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("link", { name: "Tokyo Cold Chain" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Free Customer" })).toHaveCount(0);

  // the Dashboard: no order is New or in progress, one is Completed, nothing is unpaid, the payment of this month is in the money tile
  await open(page, "/");
  await expect(page.getByRole("link", { name: /^Completed\s*1$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^New\s*0$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Unpaid invoices\s*0$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Paid this month\s*¥450,000$/ })).toBeVisible();
  await expect(page.getByText("No order is in progress.")).toBeVisible();
  await expect(page.getByText("No unpaid invoice.")).toBeVisible();
  await expect(page.getByRole("link", { name: "STEEL-01" })).toBeVisible(); // the material with the least stock
  await expect(page.getByRole("img", { name: /Invoiced and paid, last 6 months/ })).toBeVisible();

  // the pages that now hold real data show no untranslated key
  for (const path of ["/orders", "/stock", "/stock/materials", "/invoices", "/qt", "/products", "/customers", "/users"]) {
    await open(page, path);
    expect(await rawKeys(page), `${path}: text that looks like an untranslated key`).toEqual([]);
  }

  expect(errors.take()).toEqual([]);
});
