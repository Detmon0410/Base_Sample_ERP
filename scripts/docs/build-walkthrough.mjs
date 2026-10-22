/*
 * Builds the Thai step-by-step guide of the whole job, from the QT to the receipt, from the screenshots that walk-*.mjs took of the running app
 * (scripts/docs/out/walkthrough). Output: docs/ProjectdocInfo/ThaiReading/Workflow QT to Receipt (ไทย).pdf
 *   node build-walkthrough.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, "out/walkthrough");
const OUT = path.resolve(HERE, "../../docs/ProjectdocInfo/ThaiReading/Workflow QT to Receipt (ไทย).pdf");

const ROLE = {
  sale: { name: "พนักงานขาย", account: "sale@gmail.com", color: "#7c3aed" },
  factory: { name: "พนักงานโรงงาน", account: "worker@gmail.com", color: "#0284c7" },
  admin: { name: "ผู้ดูแลระบบ", account: "admin@gmail.com", color: "#1e1e1e" },
};

// the steps: who, the title, what to do (the names of buttons and fields are those on the screen), the screenshots (file, caption)
const STEPS = [
  {
    role: "sale",
    title: "เข้าสู่ระบบ",
    todo: [
      "เปิดเว็บของระบบ แล้วกรอก **อีเมล** และ **รหัสผ่าน** ของพนักงานขาย จากนั้นกด Enter หรือปุ่มเข้าสู่ระบบ",
      "ถ้ากรอกถูก ระบบพาไปหน้า **Dashboard** ซึ่งแสดงจำนวนใบสั่งผลิตตามสถานะ (Draft / In progress / Completed)",
      "เมนูด้านบนแสดงเฉพาะหน้าที่พนักงานขายใช้ได้: Dashboard, Sales, Stock, Master data",
    ],
    shots: [["01-login", "หน้าเข้าสู่ระบบ"], ["02-dashboard", "แดชบอร์ดของพนักงานขาย"]],
  },
  {
    role: "sale",
    title: "เปิดรายการใบเสนอราคา (QT) และกดสร้างใหม่",
    todo: [
      "เลือกเมนู **Sales** เพื่อเปิดรายการ QT ทั้งหมด ตัวกรองด้านบน: All / Draft / Confirmed / In production / Done",
      "กดปุ่ม **New QT** เพื่อเริ่มใบเสนอราคาใหม่",
    ],
    shots: [["03-qt-list", "รายการ QT"], ["04-qt-new-empty", "ฟอร์ม New QT ที่ยังว่าง"]],
  },
  {
    role: "sale",
    title: "กรอกใบเสนอราคาและบันทึก",
    todo: [
      "กรอก **QT number** (เช่น QT-2026-020) และ **QT date** แล้วเลือก **Customer**",
      "ในส่วน Products เลือก **Product** ใส่ **Quantity** ราคาต่อหน่วยจะขึ้นให้ตามสินค้า แก้ได้ ถ้ามีสินค้าหลายอย่างกด **Add a product**",
      "ถ้าลูกค้าส่งใบสั่งซื้อมาแล้ว ใส่ **Customer PO number** และ **Customer PO date** ในกล่อง Customer PO ด้วย (ไม่บังคับตอนบันทึก)",
      "กด **Save** เมื่อบันทึกสำเร็จ ระบบแสดงข้อความ Saved. และเปิดหน้า QT ซึ่งมีปุ่ม Download PDF, Print, ส่วน Files และปุ่ม Confirm QT",
    ],
    shots: [["05-qt-filled", "กรอกข้อมูล QT ครบแล้ว"], ["06-qt-saved", "หลังกด Save: สถานะ Draft และปุ่มพิมพ์/ดาวน์โหลด"]],
  },
  {
    role: "sale",
    title: "พิมพ์ใบเสนอราคาส่งให้ลูกค้า",
    todo: [
      "กด **Download PDF** หรือ **Print** ที่มุมขวาบนของหน้า QT ระบบสร้างเอกสารใบเสนอราคาให้พร้อมช่องลงชื่อ (Prepared by / Approved by / Customer)",
      "ส่งเอกสารนี้ให้ลูกค้า และรอใบสั่งซื้อ (PO) กลับมา",
    ],
    shots: [["36-qt-document", "เอกสารใบเสนอราคาที่ระบบสร้าง (ตัวอย่างหลังพิมพ์)"]],
  },
  {
    role: "sale",
    title: "อัปโหลดไฟล์ใบสั่งซื้อ (PO) ของลูกค้า",
    todo: [
      "ในกล่อง **Files** เลือก Kind เป็น **PO file** แล้วลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์ (PDF, PNG หรือ JPG ไม่เกิน 10 MB)",
      "ไฟล์ที่อัปโหลดจะแสดงในรายการ พร้อมปุ่มดาวน์โหลดและลบ ถ้าอัปโหลด PO file ใหม่ ไฟล์เดิมจะถูกแทนที่",
      "ถ้าไม่มีไฟล์ PO ระบบจะเตือนตอนยืนยัน แต่ยังทำต่อได้",
    ],
    shots: [["07-qt-po-uploaded", "อัปโหลดไฟล์ PO แล้ว"]],
  },
  {
    role: "sale",
    title: "ยืนยัน QT (Confirm QT)",
    todo: [
      "ตรวจว่ามีลูกค้าและสินค้าอย่างน้อยหนึ่งรายการ (ถ้าแก้ไขอะไรไว้ ให้กด Save ก่อน) แล้วกด **Confirm QT**",
      "ระบบถามยืนยัน: หลังยืนยัน จะแก้ลูกค้าและสินค้าใน QT ไม่ได้ และ QT ลบไม่ได้อีก กด **Confirm**",
      "ระบบสร้าง **ใบสั่งผลิตฉบับร่าง** ให้เองหนึ่งใบ (ในตัวอย่างคือ ORD-2026-0008) และคัดลอกไฟล์ PO ไปให้ ลิงก์ของใบสั่งผลิตอยู่ในแถบด้านบนของหน้า QT สถานะ QT เปลี่ยนเป็น Confirmed",
      "การยืนยันทำได้ครั้งเดียวต่อ QT",
    ],
    shots: [["08-qt-confirm-dialog", "กล่องยืนยัน Confirm this QT?"], ["09-qt-confirmed", "QT เป็น Confirmed และมีลิงก์ไปใบสั่งผลิต"]],
  },
  {
    role: "sale",
    title: "ดูใบสั่งผลิต (ฝ่ายขายดูได้อย่างเดียว)",
    todo: [
      "กดลิงก์ใบสั่งผลิตเพื่อดูรายละเอียด ฝ่ายขายแก้ใบสั่งผลิตไม่ได้ และเริ่มผลิตไม่ได้ ขั้นตอนต่อไปเป็นงานของโรงงาน",
      "ฝ่ายขายกลับมาดูความคืบหน้าของงานได้ตลอดที่หน้านี้หรือที่รายการ QT (ขั้นตอน Draft → Confirmed → In production → Done)",
    ],
    shots: [["10-order-sale-readonly", "ใบสั่งผลิตในมุมมองของพนักงานขาย (อ่านอย่างเดียว)"]],
  },
  {
    role: "factory",
    title: "เข้าสู่ระบบและเปิดรายการใบสั่งผลิต",
    todo: [
      "ออกจากระบบของพนักงานขาย แล้วเข้าสู่ระบบด้วยบัญชีพนักงานโรงงาน เมนูแรกชื่อ **Today** (เปิดแดชบอร์ด)",
      "เลือกเมนู **Production orders** ตัวกรอง All / Draft / In progress / Completed เปิดใบสั่งผลิตฉบับร่างที่ต้องการ",
    ],
    shots: [["11-login-factory", "เข้าสู่ระบบด้วยบัญชีพนักงานโรงงาน"], ["12-factory-today", "แดชบอร์ด (เมนู Today)"], ["13-orders-list", "รายการใบสั่งผลิต"]],
  },
  {
    role: "factory",
    title: "เพิ่มขั้นตอนการผลิต (Processes) และบันทึก",
    todo: [
      "ในใบสั่งผลิตฉบับร่าง ตรวจรายการสินค้า และตาราง **Materials (BOM)** ที่บอกว่าต้องใช้วัตถุดิบเท่าไรสำหรับรายการนี้",
      "ในส่วน Processes กด **Add a process** แล้วพิมพ์ชื่อขั้นตอน (เช่น Cutting, Assembly, Testing) กรอก Instructions ถ้าต้องการ เพิ่มได้ทุกสินค้า ต้องมีอย่างน้อยหนึ่งขั้นตอนต่อหนึ่งรายการ",
      "กด **Save** เพื่อบันทึก (ต้องบันทึกก่อนเริ่มผลิตเสมอ เพราะการเริ่มผลิตใช้ใบสั่งผลิตที่บันทึกแล้ว)",
    ],
    shots: [["14-order-draft", "ใบสั่งผลิตฉบับร่างที่ยังไม่มีขั้นตอน"], ["15-order-processes", "เพิ่มขั้นตอนแล้ว"], ["16-order-saved", "บันทึกแล้ว: ปุ่ม Start production อยู่ด้านล่าง"]],
  },
  {
    role: "factory",
    title: "เริ่มผลิต (Start production)",
    todo: [
      "เปิดใบสั่งผลิตที่บันทึกแล้ว กด **Start production** แล้วกด **Confirm**",
      "ระบบ **ตัดวัตถุดิบตาม BOM** จากล็อตในสต็อก โดยตัดล็อตที่เก่าที่สุดก่อน และล็อกสินค้ากับขั้นตอน (แก้ไม่ได้อีก)",
      "ถ้าวัตถุดิบไม่พอ ระบบแจ้งข้อผิดพลาด 409 STOCK_SHORT พร้อมรายการที่ขาด ให้ไปทำใบสั่งซื้อ (PO) ที่เมนู **Purchase** แล้วรับของเข้าสต็อกก่อน จึงกลับมาเริ่มผลิตใหม่",
      "หลังเริ่ม หน้าจอแสดง “Production started” และขั้นตอนแรกขึ้นป้าย Current",
    ],
    shots: [["17-start-dialog", "กล่องยืนยันการเริ่มผลิต"], ["18-order-started", "เริ่มผลิตแล้ว: มีปุ่ม Record progress ในแต่ละขั้นตอน"]],
  },
  {
    role: "factory",
    title: "บันทึกความคืบหน้า (Record progress)",
    todo: [
      "กด **Record progress** ที่ขั้นตอนที่ทำ ฟอร์มเปิดใต้ตาราง: เลือก **Status** (Not started / In progress / Completed) ใส่ **Completed quantity** (จำนวนรวมที่เสร็จจนถึงตอนนี้) และ **Work date** ใส่ Note ถ้าต้องการ",
      "กด **Save progress** ประวัติจะเพิ่มในตาราง Progress history พร้อมชื่อผู้บันทึก",
      "Not started = จำนวน 0, Completed = ครบตามจำนวนของรายการ, In progress = อยู่ระหว่างนั้น",
      "อัปโหลดรูปหรือเอกสารหลักฐานการผลิตได้ในกล่อง **Evidence** ท้ายหน้า",
    ],
    shots: [["19-progress-form", "กรอกความคืบหน้า: Cutting กำลังทำ 1 จาก 2"], ["20-progress-saved", "บันทึกแล้ว: ขั้นตอนแสดงสถานะ In progress"]],
  },
  {
    role: "factory",
    title: "ทำครบทุกขั้นตอน: ใบสั่งผลิตเป็น Completed",
    todo: [
      "บันทึกแต่ละขั้นตอนเป็น **Completed** ด้วยจำนวนเต็มจนครบทุกขั้นตอน",
      "เมื่อทุกขั้นตอนเสร็จ สถานะใบสั่งผลิตเปลี่ยนเป็น **Completed** อัตโนมัติ (ระบบคำนวณเอง ไม่ต้องตั้งเอง) และงานส่งต่อให้ผู้ดูแลระบบออกใบแจ้งหนี้",
      "ถ้าทำผิด ให้ผู้ดูแลระบบกด Reopen ขั้นตอนนั้นพร้อมใส่หมายเหตุ (พนักงานทั่วไปแก้ขั้นตอนที่ Completed ไม่ได้)",
    ],
    shots: [["21-order-completed-top", "ใบสั่งผลิตเป็น Completed"], ["22-order-completed-history", "ประวัติความคืบหน้าของทุกขั้นตอน"]],
  },
  {
    role: "admin",
    title: "เข้าสู่ระบบและเปิดหน้า Accounting",
    todo: [
      "เข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ เมนูมีครบ รวมถึง **Accounting**",
      "เปิดเมนู **Accounting** แท็บ **Customers pay us** แสดงสามแท็บ: To invoice (ใบสั่งผลิตที่เสร็จแล้วรอออกใบแจ้งหนี้), Waiting for payment, Paid ส่วนบนสุดสรุปยอดรอเก็บและยอดที่เราต้องจ่ายผู้จัดจำหน่าย",
    ],
    shots: [["23-login-admin", "เข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ"], ["24-admin-dashboard", "แดชบอร์ดของผู้ดูแลระบบ (มีการ์ดใบแจ้งหนี้ด้วย)"], ["25-accounting-to-invoice", "แท็บ To invoice: ORD-2026-0008 รอออกใบแจ้งหนี้"]],
  },
  {
    role: "admin",
    title: "ออกใบแจ้งหนี้ (Issue invoice)",
    todo: [
      "ในแท็บ To invoice กด **Issue invoice** ที่ใบสั่งผลิตที่เสร็จแล้ว",
      "ตรวจ **Invoice date** (ค่าเริ่มต้นคือวันนี้) แล้วกด **Issue invoice** ในกล่องยืนยัน",
      "ใบแจ้งหนี้คือสำเนาของใบสั่งผลิต ณ ตอนนั้น แก้หรือลบไม่ได้ และออกได้ครั้งเดียวต่อใบสั่งผลิต ระบบล็อกความคืบหน้าของใบสั่งผลิต",
      "ใบแจ้งหนี้ย้ายไปแท็บ **Waiting for payment** สถานะ Unpaid กดเลขที่ใบแจ้งหนี้เพื่อเปิดเอกสาร แล้วกด Download PDF หรือ Print ส่งให้ลูกค้า",
    ],
    shots: [["26-issue-invoice-dialog", "กล่องยืนยันออกใบแจ้งหนี้"], ["27-invoice-issued", "ออกแล้ว: To invoice เหลือ 0, Waiting for payment มียอด ¥240,000"], ["29-invoice-document", "เอกสารใบแจ้งหนี้ (ภาพนี้ถ่ายหลังชำระแล้ว จึงขึ้น Paid)"]],
  },
  {
    role: "admin",
    title: "บันทึกการรับชำระเงิน (Record payment)",
    todo: [
      "เมื่อลูกค้าโอนเงิน เปิดแท็บ **Waiting for payment** แล้วกด **Record payment** ที่ใบแจ้งหนี้นั้น",
      "ในกล่อง ตรวจ **Payment date** และ **Amount paid** ต้องเท่ากับยอดรวมของใบแจ้งหนี้พอดี (ตัวอย่าง ¥240,000) ระบบไม่รับชำระบางส่วน แล้วกด **Record payment**",
      "ใบแจ้งหนี้เปลี่ยนเป็น **Paid** และระบบออก **ใบเสร็จรับเงิน** ให้เองหนึ่งใบ จ่ายซ้ำไม่ได้",
    ],
    shots: [["28-waiting-for-payment", "แท็บ Waiting for payment: ใบแจ้งหนี้ Unpaid"], ["30-payment-dialog", "กล่องบันทึกการรับชำระ (ยอดเต็มใส่ให้แล้ว)"], ["31-payment-recorded", "บันทึกแล้ว: ไม่มีใบแจ้งหนี้ค้างชำระ"]],
  },
  {
    role: "admin",
    title: "ใบเสร็จรับเงิน (Receipt): จบงาน",
    todo: [
      "เปิดแท็บ **Paid** ใบแจ้งหนี้ที่ชำระแล้วมีเลขที่ใบเสร็จรับเงินกำกับ (เช่น Receipt: RC-2026-0008) กดเพื่อเปิดเอกสาร",
      "กด **Download PDF** หรือ **Print** เพื่อออกใบเสร็จรับเงินให้ลูกค้า มีช่องลงชื่อผู้รับเงิน (Received by) และลูกค้า (Customer)",
      "ที่ใบสั่งผลิตจะเห็นลิงก์ของใบแจ้งหนี้และใบเสร็จรับเงิน เป็นอันจบกระบวนการตั้งแต่ใบเสนอราคาจนรับเงิน",
    ],
    shots: [["32-paid-tab", "แท็บ Paid: ใบแจ้งหนี้และเลขที่ใบเสร็จรับเงิน"], ["33-receipt-document", "เอกสารใบเสร็จรับเงิน"], ["34-order-with-invoice-receipt", "ใบสั่งผลิตที่แสดงลิงก์ Invoice และ Receipt"]],
  },
];

const RULES = [
  ["QT", "ยืนยันได้เมื่อมีลูกค้าและสินค้าอย่างน้อยหนึ่งรายการ ยืนยันได้ครั้งเดียว หลังยืนยันแก้ลูกค้า/สินค้าไม่ได้ และลบไม่ได้ (ลบได้เฉพาะ Draft)"],
  ["ใบสั่งผลิต", "เกิดจากการยืนยัน QT เท่านั้น สร้างด้วยมือไม่ได้ ฝ่ายขายดูได้อย่างเดียว โรงงานและผู้ดูแลระบบเพิ่มขั้นตอนและเริ่มผลิต"],
  ["เริ่มผลิต", "ต้องมีรายการ มีขั้นตอนครบทุกรายการ และวัตถุดิบพอตาม BOM มิฉะนั้นได้ 409 STOCK_SHORT หลังเริ่มแก้สินค้าและขั้นตอนไม่ได้"],
  ["ความคืบหน้า", "สถานะใบสั่งผลิต (Draft / In progress / Completed) คำนวณจากขั้นตอน ขั้นตอนที่ Completed แก้ได้เฉพาะผู้ดูแลระบบ (Reopen พร้อมหมายเหตุ)"],
  ["ใบแจ้งหนี้", "เฉพาะผู้ดูแลระบบ ออกได้เมื่อใบสั่งผลิต Completed ครั้งเดียวต่อใบสั่งผลิต เป็นสำเนาที่แก้ไม่ได้"],
  ["การรับชำระ", "ต้องเท่ายอดรวมเต็มจำนวน ทำได้ครั้งเดียว ผลคือ Paid และออกใบเสร็จรับเงินหนึ่งใบ"],
];

const md = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
const img = (name) => `data:image/png;base64,${fs.readFileSync(path.join(SHOTS, `${name}.png`)).toString("base64")}`;
const chip = (role) => `<span class="chip" style="background:${ROLE[role].color}">${ROLE[role].name}</span>`;

const body = [];
body.push(`<section class="cover"><h1>ขั้นตอนการทำงานของระบบ Refrigerator Factory</h1><p class="sub">ตั้งแต่สร้างใบเสนอราคา (QT) จนถึงใบเสร็จรับเงิน (Receipt) พร้อมภาพหน้าจอจริงและสิ่งที่ต้องทำในแต่ละขั้น</p></section>`);
body.push(`<h2>ภาพรวม</h2><p>งานหนึ่งงานผ่านสามบทบาทตามลำดับ: <b>พนักงานขาย</b> ทำใบเสนอราคาและยืนยัน → <b>พนักงานโรงงาน</b> วางขั้นตอน เริ่มผลิต และบันทึกความคืบหน้า → <b>ผู้ดูแลระบบ</b> ออกใบแจ้งหนี้ รับชำระ และออกใบเสร็จรับเงิน ภาพหน้าจอทั้งหมดถ่ายจากระบบที่ทำงานจริงตามตัวอย่างงานเดียวกัน (QT-2026-020 → ORD-2026-0008 → INV-2026-0008 → RC-2026-0008) ปุ่มและช่องในภาพเป็นภาษาอังกฤษตามหน้าจอ (ระบบสลับ EN / JA ได้) จึงเขียนชื่อปุ่มเป็นตัวหนาตามที่เห็น</p>`);
body.push(`<table class="summary"><thead><tr><th>ขั้น</th><th>ผู้ทำ</th><th>สิ่งที่ทำ</th></tr></thead><tbody>${STEPS.map((s, i) => `<tr><td class="c">${i + 1}</td><td>${chip(s.role)}</td><td>${md(s.title)}</td></tr>`).join("")}</tbody></table>`);
body.push(`<h3>บัญชีที่ใช้ในการสาธิต</h3><table class="summary"><thead><tr><th>บทบาท</th><th>อีเมล</th></tr></thead><tbody>${Object.values(ROLE).map((r) => `<tr><td>${r.name}</td><td><code>${r.account}</code></td></tr>`).join("")}</tbody></table>`);
body.push(`<h3>กฎสำคัญที่ควรจำ</h3><table class="summary"><tbody>${RULES.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${md(v)}</td></tr>`).join("")}</tbody></table>`);

let lastRole = null;
STEPS.forEach((s, i) => {
  if (s.role !== lastRole) {
    body.push(`<h2 class="part" style="border-color:${ROLE[s.role].color}">ส่วนที่ ${["sale", "factory", "admin"].indexOf(s.role) + 1}: ${ROLE[s.role].name}</h2>`);
    lastRole = s.role;
  }
  body.push(`<article class="step"><header><span class="num" style="background:${ROLE[s.role].color}">${i + 1}</span><h3>${md(s.title)}</h3>${chip(s.role)}</header>
<div class="todo"><p class="lead">ต้องทำอะไร</p><ol>${s.todo.map((t) => `<li>${md(t)}</li>`).join("")}</ol></div>
<div class="shots n${s.shots.length}">${s.shots.map(([file, cap]) => `<figure><img src="${img(file)}"><figcaption>${md(cap)}</figcaption></figure>`).join("")}</div></article>`);
});

const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>ขั้นตอนการทำงาน QT ถึงใบเสร็จรับเงิน</title><style>
@page { size: A4 portrait; margin: 16mm 16mm 18mm; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: "Leelawadee UI", Tahoma, Arial, sans-serif; font-size: 10.5pt; color: #1e293b; line-height: 1.5; }
h1 { font-size: 24pt; margin: 0 0 6pt; }
.cover { border-bottom: 2.5pt solid #0284c7; padding-bottom: 10pt; margin-bottom: 14pt; }
.sub { font-size: 12pt; margin: 0; color: #475569; }
h2 { font-size: 16pt; margin: 18pt 0 8pt; break-after: avoid; }
h2.part { border-left: 6pt solid; padding-left: 8pt; margin-top: 0; }
h3 { font-size: 12.5pt; margin: 12pt 0 5pt; break-after: avoid; }
table.summary { width: 100%; border-collapse: collapse; margin: 0 0 10pt; font-size: 9.5pt; }
table.summary th, table.summary td { border: 0.5pt solid #1e293b; padding: 3pt 6pt; vertical-align: top; }
table.summary th { background: #e0f2fe; text-align: left; }
td.c { text-align: center; width: 30pt; }
code { font-family: Consolas, monospace; font-size: 9pt; }
.chip { color: #fff; border-radius: 9pt; padding: 1pt 8pt; font-size: 9pt; white-space: nowrap; }
.step { break-inside: avoid; margin: 0 0 16pt; padding-bottom: 8pt; border-bottom: 0.5pt solid #cbd5e1; }
.step header { display: flex; align-items: center; gap: 8pt; margin-bottom: 4pt; }
.step header h3 { margin: 0; flex: 1; }
.num { color: #fff; width: 22pt; height: 22pt; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; }
.lead { margin: 4pt 0 2pt; font-weight: bold; color: #0284c7; }
.todo ol { margin: 0 0 6pt; padding-left: 18pt; }
.todo li { margin-bottom: 2pt; }
.shots { display: flex; flex-direction: column; align-items: center; gap: 8pt; }
figure { margin: 0; text-align: center; break-inside: avoid; }
figure img { width: 118mm; border: 0.75pt solid #94a3b8; }
.n3 figure img { width: 88mm; }
.n3 { gap: 5pt; }
figcaption { font-size: 9pt; color: #475569; margin-top: 2pt; }
</style></head><body>${body.join("\n")}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
await page.pdf({
  path: OUT,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="width:100%;text-align:center;font-family:Leelawadee UI,Tahoma;font-size:8pt;color:#1e293b">ขั้นตอนการทำงาน QT ถึงใบเสร็จรับเงิน · หน้า <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
});
await browser.close();
console.log("wrote", OUT);
