import fs from "node:fs";

import { expect, test } from "@playwright/test";

import { USERS, rawKeys, settle, signIn, watchErrors } from "./helpers.js";

// The acceptance case of the requirements (docs/BaseRequirement_md/simplified_factory_system_requirements.md, section 10): the ten steps
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

/** Log out is in the user menu: the name of the user opens it. */
const logOut = async (page, name) => {
  await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
};

/** The row of a process in the table of a product (its name starts with the step number; the history rows start with a date). */
const processRow = (page, name) => page.getByRole("row", { name: new RegExp(String.raw`^\d+ ${name}`) });

const open = async (page, path, link) => {
  await page.goto(path);
  await settle(page);
  if (link) await page.getByRole("link", { name: link }).first().click(); // an empty list has a second "New ..." button in its body
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
  await open(page, "/master/customers", "New customer");
  await page.getByLabel("Name", { exact: true }).fill("Tokyo Cold Chain");
  await page.getByLabel("Address").fill("1-2-3 Koto, Tokyo");
  await page.getByLabel("Email").fill("buyer@tokyocold.jp");
  await page.getByLabel("Telephone").fill("03-1234-5678");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: "Tokyo Cold Chain" })).toBeVisible();

  await open(page, "/stock/materials", "New material");
  await page.getByLabel("Code").fill("STEEL-01");
  await page.getByLabel("Name", { exact: true }).fill("Steel sheet");
  await page.getByLabel("Minimum level (optional)").fill("80"); // 100 in the lot is above it: Normal until the deduction of step 7
  await page.getByRole("button", { name: "Add a lot" }).click();
  await page.getByLabel("Lot number").fill("LOT-A");
  await page.getByLabel("Quantity").fill("100");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: "STEEL-01" })).toBeVisible();

  await open(page, "/master/products", "New product");
  await page.getByLabel("Code").fill("FR-100");
  await page.getByLabel("Name", { exact: true }).fill("Refrigerator 100L");
  await page.getByLabel("Price").fill("45000");
  await page.getByRole("button", { name: "Add a material" }).click();
  await page.getByLabel("Material").selectOption({ label: "STEEL-01 Steel sheet" });
  await page.getByLabel("Quantity").fill("2.5");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: "FR-100" })).toBeVisible();

  await open(page, "/master/users", "New user");
  await page.getByLabel("Name", { exact: true }).fill(WORKER.name);
  await page.getByLabel("Email").fill(WORKER.email);
  await page.getByLabel("Department").selectOption("Factory");
  await page.getByLabel("Role").selectOption("Worker");
  await page.getByLabel("Password").fill(WORKER.password);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("link", { name: WORKER.name })).toBeVisible();

  // 2. a QT with its lines and the customer's PO file, Download PDF and Print at the top, then Confirm QT makes the order
  await open(page, "/sale/quotations", "New QT");
  await page.getByLabel("QT number").fill("QT-001");
  await page.getByLabel("Customer", { exact: true }).selectOption({ label: "Tokyo Cold Chain" });
  await page.getByLabel("Notes").fill("Ten refrigerators");
  // a new QT starts with one product line
  await page.getByLabel("Product", { exact: true }).selectOption({ label: "FR-100 Refrigerator 100L" });
  await expect(page.getByLabel("Unit price")).toHaveValue("45000"); // the price of the product
  await page.getByLabel("Quantity").fill("10");
  await page.getByLabel("Customer PO number").fill("PO-77");
  await page.getByRole("button", { name: "Save" }).click();

  // the same QT opens: the steps of the job, the PO file, Download PDF and Print at the top (the paper itself is not shown), and Confirm QT
  await expect(page).toHaveURL(/\/sale\/quotations\/\d+$/);
  const steps = page.getByRole("list", { name: "Steps of this job" });
  await expect(steps.locator('[aria-current="step"]')).toHaveText("Draft");
  await page.getByLabel(/Choose a file/).setInputFiles({ name: "po-77.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 customer PO 77") });
  await page.getByRole("button", { name: "Upload" }).click();
  await expect(page.getByRole("button", { name: "Delete: po-77.pdf" })).toBeVisible(); // it is in the list of the files
  await expect(page.locator('[data-print-doc="qt"]')).toContainText("QT-001");
  await expect(page.getByRole("heading", { name: "QT form" })).toHaveCount(0);
  await downloadPdf(page, 0, "QT-001.pdf"); // the QT as a PDF file
  await page.getByRole("button", { name: "Print", exact: true }).click();
  expect(await page.evaluate(() => window.__printed)).toBe("qt");
  await page.getByRole("button", { name: "Confirm QT" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();

  // 3 and 4. the production order is on the same page (made from the QT, with its price); its processes are added by hand
  const production = page.locator('section[aria-labelledby="qt-production"]');
  await expect(page.locator("#qt-production")).toContainText(/ORD-\d{4}-0001/);
  await expect(steps.locator('[aria-current="step"]')).toHaveText("Confirmed");
  const orderNumber = (await page.locator("#qt-production").textContent()).match(/ORD-\d{4}-0001/)[0];
  await expect(production.getByLabel("Quantity")).toHaveValue("10");
  await expect(production.getByLabel("Agreed unit price")).toHaveValue("45000");
  await production.getByRole("button", { name: "Add a process" }).click();
  await production.getByRole("button", { name: "Add a process" }).click();
  await production.getByLabel("Process", { exact: true }).nth(0).fill("Cutting");
  await production.getByLabel("Process", { exact: true }).nth(1).fill("Welding");
  await production.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  // the Admin starts the production from the same page: the QT is "In production"
  await production.getByRole("button", { name: "Start production" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(steps.locator('[aria-current="step"]')).toHaveText("In production");
  await expect(production.getByRole("button", { name: "Add a process" })).toHaveCount(0); // the processes are locked after the start
  await logOut(page, "Admin");

  // 5. a Worker records progress and completes 10 units on every process
  await signIn(page, WORKER);
  await open(page, "/sale/orders", orderNumber);
  for (const name of ["Cutting", "Welding"]) {
    await page.getByRole("button", { name: "Record progress" }).first().click();
    await page.getByLabel("Status").selectOption("In Progress");
    await page.getByLabel("Completed quantity (total so far)").fill("4");
    await page.getByRole("button", { name: "Save progress" }).click();
    await expect(processRow(page, name)).toContainText("In progress");

    await processRow(page, name).getByRole("button", { name: "Record progress" }).click();
    await page.getByLabel("Status").selectOption("Completed");
    await page.getByLabel("Completed quantity (total so far)").fill("10");
    await page.getByRole("button", { name: "Save progress" }).click();
    await expect(processRow(page, name)).toContainText("Completed");
  }
  // 6. the order is Completed
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Completed");
  await expect(page.getByRole("button", { name: "Record progress" })).toHaveCount(0); // a Worker cannot reopen
  await logOut(page, WORKER.name);

  // 7. Start production deducted the BOM by itself (2.5 x 10 = 25 of the lot); the Admin reads the history
  await signIn(page, USERS.admin);
  await open(page, "/stock/materials", "STEEL-01");
  await expect(page.getByRole("row", { name: /LOT-A/ }).first()).toContainText("75");
  const history = page.getByRole("heading", { name: "Stock history" }).locator("xpath=ancestor::section");
  await expect(history.getByRole("row", { name: /Deduct/ })).toContainText("-25");
  await expect(history.getByRole("row", { name: /Deduct/ })).toContainText(orderNumber);
  await expect(history.getByRole("row", { name: /Deduct/ })).toContainText("Production started");

  // the movements page: the same deduction among the changes of every material; a click on the row opens the material
  await open(page, "/stock/movements");
  await expect(page.getByRole("row", { name: /Deduct/ })).toContainText("STEEL-01");
  await expect(page.getByRole("row", { name: /Deduct/ })).toContainText("-25");
  await expect(page.getByRole("row", { name: /Deduct/ })).toContainText(orderNumber);
  await page.getByLabel("Type").selectOption("Add");
  await expect(page.getByRole("row", { name: /Deduct/ })).toHaveCount(0);
  await page.getByLabel("Type").selectOption("Deduct");
  await page.getByRole("row", { name: /Deduct/ }).getByText("Production started").click();
  await expect(page).toHaveURL(/\/stock\/materials\/\d+$/);

  // the list of the materials: the quantity after the deduction and the status
  await open(page, "/stock/materials");
  const steelRow = page.getByRole("row", { name: /STEEL-01/ });
  await expect(steelRow).toContainText("Steel sheet");
  await expect(steelRow).toContainText("75");
  await expect(steelRow).toContainText("Low"); // 75 is at or below the minimum level of 80
  await page.getByRole("tab", { name: "Normal" }).click();
  await expect(page.getByRole("link", { name: "STEEL-01" })).toHaveCount(0);

  // 8. the Accounting page: the completed order waits to be invoiced; Issue invoice asks the date; the invoice document goes to print / PDF
  await open(page, "/accounting");
  await expect(page.getByRole("row", { name: new RegExp(orderNumber) })).toContainText("Tokyo Cold Chain");
  await page.getByRole("row", { name: new RegExp(orderNumber) }).getByRole("button", { name: /^Issue invoice/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Issue invoice" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: /Waiting for payment/ }).click();
  const invoiceRow = page.getByRole("row", { name: /Tokyo Cold Chain/ });
  await expect(invoiceRow).toContainText("¥450,000");
  const invoiceLink = invoiceRow.getByRole("link", { name: /^INV-\d{4}-0001$/ });
  const invoiceNumber = (await invoiceLink.textContent()).trim();
  await invoiceLink.click();
  await expect(page.getByText("Total: ¥450,000", { exact: true })).toBeVisible();
  await downloadPdf(page, 0, `${invoiceNumber}.pdf`); // the invoice as a PDF file
  await page.getByRole("button", { name: "Print", exact: true }).click();
  expect(await page.evaluate(() => window.__printed)).toBe("invoice");

  // 9. the full payment, from the work list: a wrong amount is refused, then Paid, and the receipt
  await open(page, "/accounting");
  await page.getByRole("tab", { name: /Waiting for payment/ }).click();
  await page.getByRole("row", { name: /Tokyo Cold Chain/ }).getByRole("button", { name: /^Record payment/ }).click();
  const pay = page.getByRole("dialog");
  await expect(pay.getByLabel("Amount paid")).toHaveValue("450000"); // it starts as the total
  await pay.getByLabel("Amount paid").fill("449999");
  await pay.getByRole("button", { name: "Record payment" }).click();
  await expect(pay.getByText("The payment must be equal to the total of the invoice.")).toBeVisible();
  await pay.getByLabel("Amount paid").fill("450000");
  await pay.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("tab", { name: /^Paid/ }).click();
  const paidRow = page.getByRole("row", { name: /Tokyo Cold Chain/ });
  await expect(paidRow).toContainText("Paid");
  await expect(paidRow).toContainText("¥450,000");

  // the invoice document shows the payment made
  await paidRow.getByRole("link", { name: invoiceNumber }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Paid");
  await expect(page.getByText(/^Paid on \d{4}-\d{2}-\d{2}: ¥450,000$/)).toBeVisible(); // the payment made

  // the receipt has its own page, opened from the Paid tab (or from the invoice)
  await page.getByRole("link", { name: /^RC-\d{4}-0001$/ }).click();
  await expect(page).toHaveURL(/\/receipts\/\d+$/);
  await expect(page.getByRole("heading", { level: 2, name: "Receipt" })).toBeVisible();
  await expect(page.getByText(/Payment method/)).toHaveCount(0); // there is no payment method
  const receiptNumber = (await page.locator("[data-print-doc=receipt] h2 + p").first().textContent()).trim();
  await downloadPdf(page, 0, `${receiptNumber}.pdf`); // the receipt as a PDF file
  await page.getByRole("button", { name: "Print", exact: true }).click();
  expect(await page.evaluate(() => window.__printed)).toBe("receipt");
  await expect(page.getByRole("link", { name: invoiceNumber })).toBeVisible(); // the way back to the invoice

  // the old addresses of the lists open the work list
  await open(page, "/accounting/receipts");
  await expect(page).toHaveURL(/\/accounting$/);

  // 10. the order shows its QT reference, the progress, the invoice and the receipt
  await open(page, "/sale/orders", orderNumber);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Completed");
  await expect(page.getByRole("link", { name: "QT-001" })).toBeVisible();
  await expect(page.getByRole("link", { name: invoiceNumber })).toBeVisible();
  await expect(page.getByRole("link", { name: /^RC-\d{4}-0001$/ })).toBeVisible();
  const progress = page.getByRole("heading", { name: "Progress history" }).locator("xpath=ancestor::section");
  await expect(progress.getByRole("row")).toHaveCount(5); // the header and the four updates
  await expect(progress.getByText("Mika Sato").first()).toBeVisible();

  // deleting: a record that is still used is refused and the message says where it is used
  await open(page, "/master/customers", "Tokyo Cold Chain");
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("This record cannot be deleted because it is still used:")).toBeVisible();
  await expect(page.getByText("QT references: QT-001")).toBeVisible();
  await expect(page.getByText(`Production orders: ${orderNumber}`)).toBeVisible();

  await open(page, "/master/products", "FR-100");
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText(`Production orders: ${orderNumber}`)).toBeVisible();

  await open(page, "/stock/materials", "STEEL-01");
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("Products: FR-100")).toBeVisible(); // its BOM line
  await expect(page.getByText("Stock changes after the first stock: 1")).toBeVisible(); // the deduction of step 7

  // a record that nobody uses is deleted, and the list opens without it
  await open(page, "/master/customers", "New customer");
  await page.getByLabel("Name", { exact: true }).fill("Free Customer");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("link", { name: "Free Customer" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("link", { name: "Tokyo Cold Chain" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Free Customer" })).toHaveCount(0);

  // the Dashboard: no order is New or in progress, one is Completed, nothing is unpaid, the payment of this month is in the money tile
  await open(page, "/");
  await expect(page.getByRole("link", { name: /^Completed\s*1$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Draft\s*0$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Unpaid invoices\s*0$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Paid this month\s*¥450,000$/ })).toBeVisible();

  // the pages that now hold real data show no untranslated key
  for (const path of ["/sale/orders", "/stock", "/stock/materials", "/accounting", "/sale/quotations", "/master/products", "/master/customers", "/master/users"]) {
    await open(page, path);
    expect(await rawKeys(page), `${path}: text that looks like an untranslated key`).toEqual([]);
  }

  expect(errors.take()).toEqual([]);
});
