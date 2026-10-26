/*
 * Walks the real app from the QT to the receipt and saves, for every step, a screenshot with red numbered frames on the places to click,
 * plus out/walkthrough/steps.json (the text of every frame), which build-walkthrough.mjs turns into the Thai guide.
 *   node walk-all.mjs          (the app must run: backend :3001, frontend :5173; every run makes one new QT, order, invoice and receipt)
 * The steps are written once, here: the numbers on the picture and the numbers in the text always agree.
 */
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = "http://localhost:5173/";
const DIR = new URL("./out/walkthrough/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
fs.rmSync(DIR, { recursive: true, force: true });
fs.mkdirSync(DIR, { recursive: true });

const RUN = String(Date.now()).slice(-4);
const QT_NUMBER = `QT-2026-${RUN}`;
const PO_NUMBER = `PO-2026-${RUN}`;
const PO_FILE = `${DIR}customer-po.pdf`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1100, height: 760 }, deviceScaleFactor: 2 });
const page = await context.newPage();

// a sample customer PO file
{
  const p = await browser.newPage();
  await p.setContent(`<body style="font-family:Arial;padding:40px"><h2>PURCHASE ORDER</h2><p>No. ${PO_NUMBER} &nbsp; Date 2026-10-26</p><p>Sakura Cold Storage Co., Ltd.</p><table border=1 cellpadding=6 style="border-collapse:collapse"><tr><th>Item</th><th>Qty</th></tr><tr><td>Compact freezer 50</td><td>2</td></tr></table></body>`);
  await p.pdf({ path: PO_FILE, format: "A4" });
  await p.close();
}

const steps = [];
let current = null;
const step = (role, title, notes = []) => {
  current = { role, title, notes, shots: [] };
  steps.push(current);
};

/**
 * Draws a red frame and a numbered badge on each target, takes the picture, removes them.
 * `marks`: [[locator, "what to do"], ...]; the first mark is number 1. `caption`: a line under the picture.
 */
async function snap(name, marks = [], caption = "") {
  await page.waitForTimeout(700);
  const boxes = [];
  for (const [locator, text] of marks) {
    const target = typeof locator === "string" ? page.locator(locator).first() : locator.first();
    await target.scrollIntoViewIfNeeded().catch(() => {});
    boxes.push({ text, target });
  }
  await page.waitForTimeout(250);
  const rects = [];
  for (const { target } of boxes) rects.push(await target.boundingBox());
  await page.evaluate((list) => {
    const holder = document.createElement("div");
    holder.id = "walk-marks";
    holder.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647";
    list.forEach((r, i) => {
      if (!r) return;
      const frame = document.createElement("div");
      frame.style.cssText = `position:fixed;left:${r.x - 5}px;top:${r.y - 5}px;width:${r.width + 10}px;height:${r.height + 10}px;border:3px solid #e11d48;border-radius:8px;box-sizing:border-box;box-shadow:0 0 0 2px rgba(255,255,255,.9)`;
      const badge = document.createElement("div");
      badge.textContent = String(i + 1);
      badge.style.cssText = "position:absolute;left:-14px;top:-14px;width:26px;height:26px;border-radius:50%;background:#e11d48;color:#fff;font:700 15px/26px Arial,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff";
      frame.appendChild(badge);
      holder.appendChild(frame);
    });
    document.body.appendChild(holder);
  }, rects);
  await page.screenshot({ path: `${DIR}${name}.png` });
  await page.evaluate(() => document.getElementById("walk-marks")?.remove());
  current.shots.push({ file: name, caption, marks: marks.map(([, text]) => text), rects: rects.map((r) => Boolean(r)) });
  console.log("shot", name, marks.length ? `(${marks.length} marks)` : "");
}

/** The paper of a document, as the print shows it (it is drawn for the print only). */
async function snapPaper(name, doc, caption) {
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.emulateMedia({ media: "print" });
  await page.evaluate((d) => (document.body.dataset.printing = d), doc);
  await page.waitForTimeout(800);
  await page.locator(`[data-print-doc="${doc}"]`).first().screenshot({ path: `${DIR}${name}.png` });
  await page.evaluate(() => delete document.body.dataset.printing);
  await page.emulateMedia({ media: "screen" });
  await page.setViewportSize({ width: 1100, height: 760 });
  current.shots.push({ file: name, caption, marks: [], paper: true });
  console.log("shot", name);
}

const login = async (email, password) => {
  await page.context().clearCookies();
  await page.goto(BASE + "login");
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "login");
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
};
const submitLogin = async () => {
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1800);
};
const wait = (ms = 3800) => page.waitForTimeout(ms); // a toast of the page goes away

// ----------------------------------------------------------------------------------------------------------- Sale Worker
step("sale", "เข้าสู่ระบบ", ["ระบบพาไปหน้า Dashboard ซึ่งแสดงจำนวนใบสั่งผลิตตามสถานะ (Draft / In progress / Completed)", "เมนูด้านบนแสดงเฉพาะหน้าที่พนักงานขายใช้ได้"]);
await login("sale@gmail.com", "sale");
await snap("01-login", [
  ['input[type="email"]', "กรอก **อีเมล** ของพนักงานขาย"],
  ['input[type="password"]', "กรอก **รหัสผ่าน**"],
  [page.getByRole("button", { name: "Log in" }), "กด **Log in** (หรือกด Enter)"],
]);
await submitLogin();
await snap("02-dashboard", [[page.getByRole("button", { name: "Sales" }).first(), "เปิดเมนู **Sales** เพื่อทำใบเสนอราคา"]]);

step("sale", "เปิดรายการใบเสนอราคา (QT) และกดสร้างใหม่", ["ตัวกรองด้านบนของรายการ: All / Draft / Confirmed / In production / Done"]);
await page.goto(BASE + "sale/quotations");
await snap("03-qt-list", [[page.getByRole("link", { name: /New QT/ }), "กด **New QT** เพื่อเริ่มใบเสนอราคาใหม่"]]);

step("sale", "กรอกใบเสนอราคาและบันทึก", ["ราคาต่อหน่วยขึ้นให้ตามสินค้า แก้ได้ ถ้ามีสินค้าหลายอย่างกด **Add a product**", "ถ้าลูกค้าส่งใบสั่งซื้อ (PO) มาแล้ว ใส่เลขที่และวันที่ในกล่อง Customer PO ด้วย (ไม่บังคับ)"]);
await page.goto(BASE + "sale/quotations/new");
await page.waitForSelector('input[name="qtNumber"]');
await page.fill('input[name="qtNumber"]', QT_NUMBER);
await page.fill('input[name="qtDate"]', "2026-10-26");
await page.selectOption('select[name="customerId"]', { index: 1 });
await page.selectOption('select[name="lines.0.productId"]', { index: 2 });
await page.fill('input[name="lines.0.quantity"]', "2");
await page.fill('input[name="customerPoNumber"]', PO_NUMBER);
await page.fill('input[name="customerPoDate"]', "2026-10-26");
await snap("04-qt-form", [
  ['input[name="qtNumber"]', "ใส่ **QT number**"],
  ['input[name="qtDate"]', "ใส่ **QT date**"],
  ['select[name="customerId"]', "เลือก **Customer**"],
  ['select[name="lines.0.productId"]', "เลือก **Product**"],
  ['input[name="lines.0.quantity"]', "ใส่ **Quantity**"],
  [page.getByRole("button", { name: "Save" }), "กด **Save**"],
]);
await page.getByRole("button", { name: "Save" }).click();
await page.waitForSelector("text=Confirm QT");
await wait();
const qtUrl = page.url();
await snap("05-qt-saved", [
  [page.getByRole("button", { name: "Download PDF" }), "**Download PDF** ดาวน์โหลดใบเสนอราคาเป็นไฟล์ PDF"],
  [page.getByRole("button", { name: "Print" }).first(), "**Print** พิมพ์ใบเสนอราคาส่งให้ลูกค้า"],
  [page.getByRole("button", { name: "Confirm QT" }), "**Confirm QT** (ใช้ในขั้นตอนต่อไป หลังได้ PO จากลูกค้า)"],
], "หลังกด Save สถานะเป็น Draft");

step("sale", "พิมพ์ใบเสนอราคาส่งให้ลูกค้า", ["เอกสารมีช่องลงชื่อ (Prepared by / Approved by / Customer)", "ส่งให้ลูกค้าแล้วรอใบสั่งซื้อ (PO) กลับมา"]);
await snapPaper("06-qt-document", "qt", "เอกสารใบเสนอราคาที่ระบบสร้าง (ตัวอย่างหลังกดพิมพ์)");

step("sale", "อัปโหลดไฟล์ใบสั่งซื้อ (PO) ของลูกค้า", ["รองรับ PDF, PNG หรือ JPG ขนาดไม่เกิน 10 MB", "อัปโหลด PO file ใหม่ ไฟล์เดิมจะถูกแทนที่", "ถ้าไม่มีไฟล์ PO ระบบจะเตือนตอนยืนยัน แต่ยังทำต่อได้"]);
await page.locator('input[type="file"]').first().setInputFiles(PO_FILE);
await wait();
await page.reload();
await page.waitForSelector("text=Confirm QT");
await snap("07-qt-po", [
  [page.getByText("Drop a file here or click to browse").first(), "เลือก Kind เป็น **PO file** แล้วลากไฟล์มาวาง หรือคลิกเลือกไฟล์"],
  [page.getByRole("button", { name: /^customer-po\.pdf$/ }), "ไฟล์ที่อัปโหลดแล้ว กดชื่อไฟล์เพื่อเปิดดู"],
]);

step("sale", "ยืนยัน QT (Confirm QT)", ["ตรวจว่ามีลูกค้าและสินค้าอย่างน้อยหนึ่งรายการ (ถ้าแก้ไขอะไรไว้ ให้ Save ก่อน)", "หลังยืนยัน แก้ลูกค้าและสินค้าใน QT ไม่ได้ และลบ QT ไม่ได้อีก", "ระบบสร้างใบสั่งผลิตฉบับร่างให้หนึ่งใบ และคัดลอกไฟล์ PO ไปให้", "ยืนยันได้ครั้งเดียวต่อ QT"]);
await snap("08-qt-confirm", [[page.getByRole("button", { name: "Confirm QT" }), "กด **Confirm QT**"]]);
await page.getByRole("button", { name: "Confirm QT" }).click();
await page.waitForTimeout(900);
await snap("09-qt-confirm-dialog", [[page.locator("[role=alertdialog] button, [role=dialog] button").filter({ hasText: /^Confirm$/ }), "กด **Confirm** ในกล่องยืนยัน"]]);
await page.locator("[role=alertdialog] button, [role=dialog] button").filter({ hasText: /^Confirm$/ }).click();
await wait();
await page.evaluate(() => window.scrollTo(0, 0));
const orderHref = await page.locator("a").evaluateAll((a) => a.map((x) => x.getAttribute("href")).find((h) => /^\/sale\/orders\/\d+$/.test(h ?? "")));
await snap("10-qt-confirmed", [
  [page.locator("a[href^='/sale/orders/']").first(), "ลิงก์ไปที่ **ใบสั่งผลิต** ที่ระบบสร้างให้"],
  [page.getByText("Confirmed", { exact: true }).first(), "สถานะ QT เป็น **Confirmed**"],
]);

step("sale", "ดูใบสั่งผลิต (ฝ่ายขายดูได้อย่างเดียว)", ["ฝ่ายขายแก้ใบสั่งผลิตและเริ่มผลิตไม่ได้ ขั้นตอนต่อไปเป็นงานของโรงงาน"]);
await page.goto(BASE.slice(0, -1) + orderHref);
await snap("11-order-sale", [], "ใบสั่งผลิตในมุมมองของพนักงานขาย (อ่านอย่างเดียว)");
const orderUrl = BASE.slice(0, -1) + orderHref;

// ----------------------------------------------------------------------------------------------------------- Factory Worker
step("factory", "เข้าสู่ระบบและเปิดใบสั่งผลิต", ["เมนูแรกของพนักงานโรงงานชื่อ **Today** (แดชบอร์ด)", "ตัวกรอง: All / Draft / In progress / Completed"]);
await login("worker@gmail.com", "worker");
await snap("12-login-factory", [
  ['input[type="email"]', "กรอกอีเมลของ **พนักงานโรงงาน**"],
  [page.getByRole("button", { name: "Log in" }), "กด **Log in**"],
]);
await submitLogin();
await page.goto(BASE + "sale/orders");
await snap("13-orders", [
  [page.getByRole("link", { name: "Production orders" }).first(), "เมนู **Production orders**"],
  [page.locator("tbody tr").first().locator("a").first(), "กดเลขที่ใบสั่งผลิตที่เป็น Draft (แถวบนสุดคือใบล่าสุด)"],
]);

step("factory", "เพิ่มขั้นตอนการผลิต (Processes) และบันทึก", ["ตาราง **Materials (BOM)** บอกว่าต้องใช้วัตถุดิบเท่าไรสำหรับรายการนี้", "ต้องมีอย่างน้อยหนึ่งขั้นตอนต่อหนึ่งรายการ", "ต้อง Save ก่อนเริ่มผลิตเสมอ เพราะการเริ่มผลิตใช้ใบสั่งผลิตที่บันทึกแล้ว"]);
await page.goto(orderUrl);
await page.waitForSelector("text=Add a process");
await snap("14-order-draft", [[page.getByRole("button", { name: "Add a process" }), "กด **Add a process** เพื่อเพิ่มขั้นตอน"]], "ใบสั่งผลิตฉบับร่างที่ยังไม่มีขั้นตอน");
for (const [i, name] of ["Cutting", "Assembly", "Testing"].entries()) {
  await page.getByRole("button", { name: "Add a process" }).click();
  await page.fill(`input[name="lines.0.processes.${i}.name"]`, name);
}
await snap("15-order-processes", [
  ['input[name="lines.0.processes.0.name"]', "พิมพ์ชื่อขั้นตอน (เช่น Cutting, Assembly, Testing)"],
  [page.getByRole("button", { name: "Save" }), "กด **Save**"],
]);
await page.getByRole("button", { name: "Save" }).click();
await wait(2500);
await page.goto(orderUrl);
await page.waitForSelector("text=Start production");

step("factory", "เริ่มผลิต (Start production)", ["ระบบ **ตัดวัตถุดิบตาม BOM** จากล็อตในสต็อก โดยตัดล็อตที่เก่าที่สุดก่อน และล็อกสินค้ากับขั้นตอน", "ถ้าวัตถุดิบไม่พอ ระบบแจ้ง 409 STOCK_SHORT ให้ไปทำใบสั่งซื้อ (PO) ที่เมนู **Purchase** แล้วรับของเข้าสต็อกก่อน", "หลังเริ่ม หน้าจอแสดง “Production started” และขั้นตอนแรกขึ้นป้าย Current"]);
await snap("16-start", [[page.getByRole("button", { name: "Start production" }), "กด **Start production**"]]);
await page.getByRole("button", { name: "Start production" }).click();
await page.waitForTimeout(900);
await snap("17-start-dialog", [[page.locator("[role=alertdialog] button, [role=dialog] button").filter({ hasText: /^Confirm$/ }), "กด **Confirm** เพื่อยืนยัน"]]);
await page.locator("[role=alertdialog] button, [role=dialog] button").filter({ hasText: /^Confirm$/ }).click();
await wait();
await page.evaluate(() => window.scrollTo(0, 0));
await snap("18-started", [
  [page.getByText("Production started"), "ขึ้นข้อความ **Production started**"],
  [page.getByRole("button", { name: "Record progress" }).first(), "ปุ่ม **Record progress** ของแต่ละขั้นตอน"],
]);

step("factory", "บันทึกความคืบหน้า (Record progress)", ["Status: Not started = จำนวน 0, Completed = ครบตามจำนวนของรายการ, In progress = อยู่ระหว่างนั้น", "ประวัติเพิ่มในตาราง Progress history พร้อมชื่อผู้บันทึก", "อัปโหลดรูปหรือเอกสารหลักฐานได้ในกล่อง **Evidence** ท้ายหน้า"]);
const record = async (status, quantity, shotName) => {
  await page.getByRole("button", { name: "Record progress" }).first().click();
  await page.waitForSelector('select[name="status"]');
  await page.selectOption('select[name="status"]', { label: status });
  await page.fill('input[name="completedQuantity"]', String(quantity));
  await page.fill('input[name="workDate"]', "2026-10-26");
  if (shotName)
    await snap(shotName, [
      ['select[name="status"]', "เลือก **Status**"],
      ['input[name="completedQuantity"]', "ใส่ **Completed quantity** (จำนวนรวมที่เสร็จ)"],
      ['input[name="workDate"]', "ใส่ **Work date**"],
      [page.getByRole("button", { name: "Save progress" }), "กด **Save progress**"],
    ]);
  await page.getByRole("button", { name: "Save progress" }).click();
  await wait();
};
await record("In progress", 1, "19-progress-form");
await page.evaluate(() => window.scrollTo(0, 250));
await snap("20-progress-saved", [[page.getByText("In progress", { exact: true }).first(), "ขั้นตอนแสดงสถานะ **In progress**"]]);

step("factory", "ทำครบทุกขั้นตอน: ใบสั่งผลิตเป็น Completed", ["บันทึกแต่ละขั้นตอนเป็น **Completed** ด้วยจำนวนเต็มจนครบ", "เมื่อครบทุกขั้นตอน สถานะใบสั่งผลิตเป็น **Completed** อัตโนมัติ และงานส่งต่อให้ผู้ดูแลระบบออกใบแจ้งหนี้", "ถ้าทำผิด ให้ผู้ดูแลระบบกด Reopen พร้อมหมายเหตุ (พนักงานทั่วไปแก้ขั้นตอนที่ Completed ไม่ได้)"]);
await record("Completed", 2);
await record("Completed", 2);
await record("Completed", 2);
await page.evaluate(() => window.scrollTo(0, 0));
await snap("21-completed", [[page.getByText("Completed", { exact: true }).first(), "สถานะใบสั่งผลิตเป็น **Completed**"]]);
await page.evaluate(() => window.scrollTo(0, 600));
await snap("22-history", [[page.getByText("Progress history").first(), "**Progress history** ประวัติของทุกขั้นตอน"]]);

// ----------------------------------------------------------------------------------------------------------- Admin
step("admin", "เข้าสู่ระบบและเปิดหน้า Accounting", ["แท็บ **Customers pay us** มี 3 แท็บ: To invoice (รอออกใบแจ้งหนี้), Waiting for payment (รอรับชำระ), Paid", "ส่วนบนสุดสรุปยอดรอเก็บและยอดที่เราต้องจ่ายผู้จัดจำหน่าย"]);
await login("admin@gmail.com", "admin");
await snap("23-login-admin", [
  ['input[type="email"]', "กรอกอีเมลของ **ผู้ดูแลระบบ**"],
  [page.getByRole("button", { name: "Log in" }), "กด **Log in**"],
]);
await submitLogin();
await page.goto(BASE + "accounting");
await page.waitForTimeout(1200);
await snap("24-accounting", [
  [page.getByRole("link", { name: "Accounting" }).first(), "เมนู **Accounting**"],
  [page.locator('button:has-text("To invoice")').first(), "แท็บ **To invoice**: ใบสั่งผลิตที่เสร็จแล้วรอออกใบแจ้งหนี้"],
  [page.getByRole("button", { name: "Issue invoice" }).first(), "กด **Issue invoice**"],
]);

step("admin", "ออกใบแจ้งหนี้ (Issue invoice)", ["ตรวจ **Invoice date** (ค่าเริ่มต้นคือวันนี้) แล้วกด Issue invoice ในกล่องยืนยัน", "ใบแจ้งหนี้คือสำเนาของใบสั่งผลิตตอนนั้น แก้หรือลบไม่ได้ ออกได้ครั้งเดียวต่อใบสั่งผลิต และล็อกความคืบหน้าของใบสั่งผลิต", "ใบแจ้งหนี้ย้ายไปแท็บ **Waiting for payment** สถานะ Unpaid"]);
await page.getByRole("button", { name: "Issue invoice" }).first().click();
await page.waitForTimeout(900);
await snap("25-issue-dialog", [
  ['[role=dialog] input[name="invoiceDate"]', "ตรวจ **Invoice date**"],
  [page.locator("[role=dialog] button").filter({ hasText: "Issue invoice" }), "กด **Issue invoice**"],
]);
await page.locator("[role=dialog] button").filter({ hasText: "Issue invoice" }).click();
await wait();

step("admin", "บันทึกการรับชำระเงิน (Record payment)", ["เมื่อลูกค้าโอนเงิน กด **Record payment** ที่ใบแจ้งหนี้นั้น", "จำนวนเงินต้องเท่ายอดรวมของใบแจ้งหนี้พอดี (ระบบใส่ให้แล้ว) ไม่รับชำระบางส่วน", "ใบแจ้งหนี้เปลี่ยนเป็น **Paid** และระบบออก **ใบเสร็จรับเงิน** ให้เองหนึ่งใบ จ่ายซ้ำไม่ได้"]);
await page.locator('button:has-text("Waiting for payment")').first().click();
await page.waitForTimeout(1000);
await snap("26-waiting", [
  [page.locator('button:has-text("Waiting for payment")').first(), "แท็บ **Waiting for payment**"],
  [page.getByRole("button", { name: "Record payment" }).first(), "กด **Record payment**"],
]);
await page.getByRole("button", { name: "Record payment" }).first().click();
await page.waitForTimeout(900);
await snap("27-payment-dialog", [
  ['[role=dialog] input[name="amount"]', "**Amount paid** ต้องเท่ายอดรวม (ใส่ให้แล้ว)"],
  [page.locator("[role=dialog] button").filter({ hasText: "Record payment" }), "กด **Record payment**"],
]);
await page.locator("[role=dialog] button").filter({ hasText: "Record payment" }).click();
await wait();

step("admin", "ใบเสร็จรับเงิน (Receipt): จบงาน", ["แท็บ **Paid**: ใบแจ้งหนี้ที่ชำระแล้วมีปุ่มเลขที่ใบเสร็จรับเงิน", "กดปุ่มใบเสร็จรับเงินหรือไอคอนเครื่องพิมพ์ข้างเลขใบแจ้งหนี้ ระบบเปิดหน้าพิมพ์ทันที (บันทึกเป็น PDF ได้)", "ในหน้าใบสั่งผลิตจะเห็นลิงก์ Invoice และ Receipt เป็นอันจบกระบวนการ"]);
await page.locator('button:has-text("Paid")').first().click();
await page.waitForTimeout(1000);
await snap("28-paid", [
  [page.locator('button:has-text("Paid")').first(), "แท็บ **Paid**"],
  [page.locator('button[aria-label^="Print:"]').first(), "ไอคอนเครื่องพิมพ์: พิมพ์ **ใบแจ้งหนี้**"],
  [page.locator('button:has-text("Receipt: RC")').first(), "กดเพื่อพิมพ์ **ใบเสร็จรับเงิน**"],
]);
const receiptHref = await page.locator("a").evaluateAll((a) => a.map((x) => x.getAttribute("href")).find((h) => /^\/accounting\/invoices\/\d+$/.test(h ?? "")));
const invoiceId = receiptHref.split("/").pop();
await page.goto(BASE + `accounting/invoices/${invoiceId}`);
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);
await snapPaper("29-invoice-paper", "invoice", "เอกสารใบแจ้งหนี้ (ถ่ายหลังชำระแล้ว จึงขึ้นสถานะ Paid)");
const receiptId = await (async () => {
  await page.goto(BASE + "accounting");
  await page.locator('button:has-text("Paid")').first().click();
  await page.waitForTimeout(800);
  return page.locator("a").evaluateAll((a) => a.map((x) => x.getAttribute("href")).find((h) => /^\/accounting\/receipts\/\d+$/.test(h ?? "")));
})();
await page.goto(BASE.slice(0, -1) + (receiptId ?? `/accounting/receipts/${invoiceId}`));
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);
await snapPaper("30-receipt-paper", "receipt", "เอกสารใบเสร็จรับเงิน");
await page.goto(orderUrl);
await page.waitForTimeout(1500);
await snap("31-order-links", [
  [page.locator("a[href^='/accounting/invoices/'], button:has-text('INV-')").first(), "**Invoice** ของงานนี้"],
  [page.locator("a[href^='/accounting/receipts/'], button:has-text('RC-')").first(), "**Receipt** ของงานนี้"],
]);

fs.writeFileSync(`${DIR}steps.json`, JSON.stringify({ qt: QT_NUMBER, steps }, null, 2));
await browser.close();
console.log("done", steps.length, "steps");
