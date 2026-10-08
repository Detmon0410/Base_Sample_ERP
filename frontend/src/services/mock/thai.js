// Thai names for the workflow test (docs/specs/f13-workflow-test.md): with VITE_MOCK_SEED=empty the master data, the people and
// the accounting settings come with Thai names. Codes never change, only the names (and the words in the records). The demo
// keeps its English names (the tests read them).

import { EMPTY_SEED } from "./seedMode.js";

const byCode = (names) => (rows) => rows.map((row) => (names[row.code] ? { ...row, ...names[row.code] } : row));

const CUSTOMER_FIRST = ["ซากุระ", "ฟูจิ", "ฮิคาริ", "นิปปอน", "โตเกียว", "โอซาก้า", "เกียวโต", "นาโกย่า", "ฮอกไกโด", "คันไซ"];
const CUSTOMER_KIND = ["ร้านเครื่องใช้ไฟฟ้า", "โฮมมาร์ท", "อิเล็กทริก", "ลิฟวิ่ง", "รีเทล", "เทรดดิ้ง"];

const NAMES = {
  customers: (rows) =>
    rows.map((row, index) => ({
      ...row,
      name: index === 0 ? "ร้านเอบีซี เครื่องใช้ไฟฟ้า" : index === 1 ? "เบสต์โฮม มาร์ท" : `${CUSTOMER_FIRST[(index - 2) % CUSTOMER_FIRST.length]} ${CUSTOMER_KIND[(index - 2) % CUSTOMER_KIND.length]}`,
      ...(index < 2 ? { address: "1-2-3 ชินจูกุ โตเกียว", contactPerson: "คุณทานากะ" } : {}),
    })),
  suppliers: byCode({
    S001: { name: "บริษัท คอมป์โค จำกัด", contactPerson: "คุณโมริ", address: "2-3-4 อุเมดะ โอซาก้า" },
    S002: { name: "บริษัท สตีลโค จำกัด", contactPerson: "คุณอิโตะ", address: "5-6-7 ซากาเอะ นาโกย่า" },
    S003: { name: "บริษัท แบ็คอัพโค จำกัด" },
  }),
  materials: byCode({
    COMP: { name: "คอมเพรสเซอร์" },
    DOOR: { name: "แผงประตู" },
    FOAM: { name: "โฟมฉนวน" },
    STEEL: { name: "แผ่นเหล็ก" },
    SHELF: { name: "ชั้นวาง" },
    THERMO: { name: "เทอร์โมสตัท" },
  }),
  products: byCode({
    "RF-2D": { name: "ตู้เย็น 2 ประตู 15 คิว", category: "ตู้เย็น" },
    "RF-1D": { name: "ตู้เย็น 1 ประตู 9 คิว", category: "ตู้เย็น" },
  }),
  machines: byCode({
    "LN-01": { name: "สายการประกอบ 1" },
    "LN-02": { name: "สายฉีดโฟม" },
    "LN-03": { name: "สายบรรจุ" },
    "QC-01": { name: "สถานีตรวจคุณภาพ" },
  }),
  employees: byCode({
    E001: { name: "สมศักดิ์ แสงทอง", position: "พนักงานผลิต" },
    E002: { name: "ปรีชา ทองดี", position: "พนักงานตรวจคุณภาพ" },
    E003: { name: "อรุณี เพชรดี", position: "พนักงานผลิต" },
  }),
  uom: byCode({ pcs: { name: "ชิ้น" }, kg: { name: "กิโลกรัม" }, m: { name: "เมตร" }, set: { name: "ชุด" }, box: { name: "กล่อง" } }),
  warehouses: byCode({ "WH-R": { name: "คลังวัตถุดิบ" }, "WH-F": { name: "คลังสินค้าสำเร็จรูป" } }),
  accounts: byCode({
    1100: { name: "เงินสด" },
    1110: { name: "เงินฝากธนาคาร - ออมทรัพย์ทั่วไป" },
    1115: { name: "เงินฝากธนาคาร - ออมทรัพย์พิเศษ" },
    1200: { name: "ลูกหนี้การค้า" },
    1300: { name: "สต็อกวัตถุดิบ" },
    1310: { name: "สต็อกสินค้าสำเร็จรูป" },
    1400: { name: "ภาษีซื้อ" },
    2100: { name: "เจ้าหนี้การค้า" },
    2200: { name: "ภาษีขาย" },
    2300: { name: "ค่าใช้จ่ายค้างจ่าย" },
    3000: { name: "ทุน" },
    3100: { name: "กำไรสะสม" },
    4100: { name: "รายได้จากการขาย" },
    5100: { name: "ซื้อสินค้าและต้นทุนขาย" },
    5200: { name: "เงินเดือน" },
    5300: { name: "ค่าสาธารณูปโภค" },
  }),
  taxRates: byCode({ VAT10: { name: "อัตรามาตรฐาน" }, VAT8: { name: "อัตราลด" }, VAT0: { name: "ยกเว้นภาษี" }, WHT10: { name: "ภาษีหัก ณ ที่จ่าย" } }),
  paymentMethods: byCode({ CASH: { name: "เงินสด" }, BANK: { name: "โอนเงินผ่านธนาคาร" }, CHEQUE: { name: "เช็ค" } }),
  bankAccounts: byCode({
    "BA-01": { name: "บัญชีหลัก", bankName: "ธนาคารมิซูโฮ", branch: "ชินจูกุ" },
    "BA-02": { name: "บัญชีออมทรัพย์", bankName: "ธนาคารเอ็มยูเอฟจี", branch: "มารุโนะอุจิ" },
  }),
  routing: (rows) => {
    const words = { "Press and form body": "ขึ้นรูปตัวถัง", "Foam insulation": "ฉีดโฟมฉนวน", "Assembly and packing": "ประกอบและบรรจุ", "Quality check": "ตรวจสอบคุณภาพ" };
    return rows.map((row) => ({ ...row, processName: words[row.processName] ?? row.processName }));
  },
};

/** The rows of a kind of master data with Thai names (only in the workflow test; the demo gets the rows as they are). */
export const thai = (kind, rows) => (EMPTY_SEED && NAMES[kind] ? NAMES[kind](rows) : rows);

/** The people who can sign in. */
export const THAI_PEOPLE = {
  "admin@gmail.com": "อภิชาติ รักษ์ระบบ",
  "sale.manager@kanou.test": "สมชาย ใจดี",
  "sale.worker@kanou.test": "สมหญิง สุขสันต์",
  "factory.manager@kanou.test": "วิชัย มั่นคง",
  "factory.worker@kanou.test": "ประสิทธิ์ ขยันงาน",
  "purchase.manager@kanou.test": "สุดา พิทักษ์",
  "purchase.worker@kanou.test": "มานี มีสุข",
  "accounting.manager@kanou.test": "วรรณา ศรีสุข",
  "accounting.worker@kanou.test": "นภา ใจเย็น",
};
