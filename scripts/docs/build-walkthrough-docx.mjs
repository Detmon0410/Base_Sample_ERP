/*
 * The user manual as a Word file that can be edited: the same steps, pictures and numbers as the PDF (build-walkthrough.mjs), from
 * out/walkthrough/steps.json. The cover is real text (only the waves behind it are a picture, fixed to the page and behind the text),
 * the contents and the list of figures are written with their page numbers, headings are numbered (1., 1.1), every picture has a thin frame
 * and "ภาพที่ 1-1" under it, and the numbered texts follow it.
 * Every picture starts a new page, so the page numbers of the contents are exact in Word as well (the heading of a step is on the page of its first picture).
 * Output: docs/ProjectdocInfo/Workflow/Workflow.docx
 *   node build-walkthrough.mjs && node build-walkthrough-docx.mjs     (the waves come from out/walkthrough/guide.html)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { AlignmentType, BorderStyle, Document, Footer, HeadingLevel, HorizontalPositionRelativeFrom, ImageRun, LeaderType, Packer, PageNumber, Paragraph, Tab, TabStopType, TextRun, TextWrappingType, VerticalPositionRelativeFrom } from "docx";
import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, "out/walkthrough");
const OUT = path.resolve(HERE, "../../docs/ProjectdocInfo/Workflow/Workflow.docx");
const { steps } = JSON.parse(fs.readFileSync(path.join(SHOTS, "steps.json"), "utf8"));
const TITLES = JSON.parse(fs.readFileSync(path.join(HERE, "walk-titles.json"), "utf8"));
const BLUE = "0085C8";

const ROLE = {
  sale: { name: "Sale Worker", account: "sale@gmail.com", password: "sale" },
  factory: { name: "Factory Worker", account: "worker@gmail.com", password: "worker" },
  admin: { name: "Admin", account: "admin@gmail.com", password: "admin" },
};
const PARTS = ["sale", "factory", "admin"];

// the text as the PDF writes it: roles in English, no bold marks
const plain = (text) =>
  text
    .replace(/พนักงานขาย/g, " Sale Worker ")
    .replace(/พนักงานโรงงาน/g, " Factory Worker ")
    .replace(/ผู้ดูแลระบบ/g, " Admin ")
    .replace(/ {2,}/g, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .trim();

const FONT = { ascii: "Arial", hAnsi: "Arial", cs: "Tahoma", eastAsia: "Tahoma" };
// a tab character must be a tab element of Word (a tab inside the text is shown as a space)
const run = (text, extra = {}) => {
  const parts = text.split("	");
  const children = parts.flatMap((part, i) => (i ? [new Tab(), part] : [part]));
  return new TextRun({ children, font: FONT, size: 24, ...extra });
};

// the waves of the cover as a picture with a clear background
async function wavesPng() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(pathToFileURL(path.join(SHOTS, "guide.html")).href);
  const svg = await page.evaluate(() => document.querySelector(".cover .waves").outerHTML);
  await page.setContent(`<body style="margin:0;background:transparent"><div id="w" style="width:794px;height:1123px;position:relative;overflow:hidden">${svg.replace("<svg", '<svg style="position:absolute;left:-11px;top:-11px;width:calc(100% + 22px);height:calc(100% + 22px)"')}</div></body>`);
  const png = await page.locator("#w").screenshot({ omitBackground: true });
  await browser.close();
  return png;
}

const pngSize = (buffer) => ({ width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) });
const WIDTH = 688; // the width of the text area (A4 less 14 mm on each side) in pixels at 96 dpi
const frame = { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 0 };
const CONTENT_TWIPS = 11906 - 2 * 794;

// ------------------------------------------------------------------ the numbers and the pages
const numbers = [];
const counters = {};
for (const s of steps) {
  counters[s.role] = (counters[s.role] ?? 0) + 1;
  numbers.push(`${PARTS.indexOf(s.role) + 1}.${counters[s.role]}`);
}
const figCount = {};
const figures = []; // { no, title, shot, step, page }
steps.forEach((s, i) => {
  for (const shot of s.shots) {
    figCount[s.role] = (figCount[s.role] ?? 0) + 1;
    figures.push({ no: `${PARTS.indexOf(s.role) + 1}-${figCount[s.role]}`, title: plain(TITLES[shot.file] ?? shot.caption ?? s.title), shot, step: i });
  }
});
const FIRST_FIGURE_PAGE = 4; // 1 cover, 2 contents, 3 list of figures; then one picture on every page
figures.forEach((f, k) => (f.page = FIRST_FIGURE_PAGE + k));
const stepPage = steps.map((_, i) => figures.find((f) => f.step === i).page);
const partPage = PARTS.map((role) => stepPage[steps.findIndex((s) => s.role === role)]);

// ------------------------------------------------------------------ the pages of the contents
const tocRow = (text, page, { bold = false, indent = 0 } = {}) =>
  new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_TWIPS, leader: LeaderType.NONE }],
    indent: { left: indent },
    spacing: { before: bold ? 100 : 0, after: 40 },
    children: [run(text, { bold }), run(`\t${page}`, { bold })],
  });
const contents = [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [run("สารบัญ", { bold: true, size: 34 })] }), new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_TWIPS }], spacing: { after: 100 }, children: [run("\tหน้า", { bold: true })] })];
PARTS.forEach((role, pi) => {
  contents.push(tocRow(`${pi + 1}. ${ROLE[role].name}`, partPage[pi], { bold: true }));
  steps.forEach((s, i) => {
    if (s.role === role) contents.push(tocRow(`${numbers[i]} ${plain(s.title)}`, stepPage[i], { indent: 480 }));
  });
});
const figureList = [new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [run("สารบัญภาพ", { bold: true, size: 34 })] }), new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_TWIPS }], spacing: { after: 100 }, children: [run("ภาพที่", { bold: true }), run("\tหน้า", { bold: true })] })];
for (const f of figures) figureList.push(new Paragraph({ tabStops: [{ type: TabStopType.LEFT, position: 900 }, { type: TabStopType.RIGHT, position: CONTENT_TWIPS }], spacing: { after: 20 }, children: [run(`${f.no}\t${f.title}\t${f.page}`, { size: 22 })] }));

// ------------------------------------------------------------------ the steps
const children = [];
let lastRole = null;
steps.forEach((s, i) => {
  const firstOfPart = s.role !== lastRole;
  if (firstOfPart) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, keepNext: true, children: [run(`${PARTS.indexOf(s.role) + 1}. ${ROLE[s.role].name}`, { bold: true, size: 34 })] }));
    lastRole = s.role;
  }
  s.shots.forEach((shot, k) => {
    const f = figures.find((x) => x.shot === shot);
    const startsPage = !(k === 0 && firstOfPart); // the first picture of a part follows the heading of the part on the same page
    if (k === 0) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, pageBreakBefore: startsPage, keepNext: true, spacing: { before: 120, after: 80 }, children: [run(`${numbers[i]} ${plain(s.title)}`, { bold: true, size: 28 })] }));
      for (const note of s.notes) children.push(new Paragraph({ bullet: { level: 0 }, keepNext: true, children: [run(plain(note))] }));
    }
    const data = fs.readFileSync(path.join(SHOTS, `${shot.file}.png`));
    const { width, height } = pngSize(data);
    const w = shot.paper ? 454 : WIDTH - 2; // a paper (invoice, receipt) is shown at 120 mm
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, pageBreakBefore: k > 0, keepNext: true, spacing: { before: 120 }, border: shot.paper ? undefined : { top: frame, bottom: frame, left: frame, right: frame }, children: [new ImageRun({ type: "png", data, transformation: { width: w, height: Math.round((w * height) / width) } })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: shot.marks.length > 0, spacing: { before: 60, after: 100 }, children: [run(`ภาพที่ ${f.no}`, { bold: true, size: 22 }), run(` ${f.title}`, { size: 22 })] }));
    shot.marks.forEach((text, m) => children.push(new Paragraph({ spacing: { after: 40 }, keepNext: m < shot.marks.length - 1, indent: { left: 360, hanging: 360 }, children: [run(`${m + 1}.\t${plain(text)}`)] })));
    if (i === 0 && k === 0) {
      // the accounts to try the system with, at the first sign-in
      children.push(new Paragraph({ spacing: { before: 200, after: 60 }, keepNext: true, children: [run("บัญชีสำหรับทดลองใช้งาน", { bold: true, size: 26 })] }));
      for (const r of Object.values(ROLE)) children.push(new Paragraph({ spacing: { after: 40 }, children: [run(`${r.name}  อีเมล: ${r.account}  รหัสผ่าน: ${r.password}`)] }));
    }
  });
});

// ------------------------------------------------------------------ the cover: text that can be edited, the waves behind it
const waves = await wavesPng();
const logo = fs.readFileSync(path.resolve(HERE, "../../frontend/public/logo.png"));
const logoSize = pngSize(logo);
const center = (children_, spacing) => new Paragraph({ alignment: AlignmentType.CENTER, spacing, children: children_ });
const coverChildren = [
  new Paragraph({
    spacing: { before: 0, after: 0 },
    children: [new ImageRun({ type: "png", data: waves, transformation: { width: 794, height: 1123 }, floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 }, verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 }, behindDocument: true, allowOverlap: true, wrap: { type: TextWrappingType.NONE } } })],
  }),
  center([new ImageRun({ type: "png", data: logo, transformation: { width: 113, height: Math.round((113 * logoSize.height) / logoSize.width) } })], { before: 1500, after: 120 }),
  center([run("Refrigerator Factory", { bold: true, size: 24 })], { after: 1300 }),
  center([run("คู่มือการใช้งาน", { bold: true, size: 72, color: BLUE })], { after: 60 }),
  center([run("USER MANUAL", { bold: true, size: 36 })], { after: 1300 }),
  center([run("ระบบบริหารจัดการโรงงาน", { bold: true, size: 28 })], { after: 60 }),
  center([run("ใบเสนอราคา ใบสั่งผลิต สต็อก จัดซื้อ และบัญชี", { bold: true, size: 28 })], { after: 1200 }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 800 }, indent: { left: 3300, right: 3300 }, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: BLUE, space: 1 } }, children: [] }),
  center([run("จัดทำโดย", { bold: true, size: 24 })], { after: 40 }),
  center([run("Japan System", { bold: true, size: 40, color: BLUE })], { after: 0 }),
];

const A4 = { width: 11906, height: 16838 };
const doc = new Document({
  creator: "Japan System",
  title: "คู่มือการใช้งาน Refrigerator Factory",
  styles: { default: { document: { run: { font: FONT, size: 24, color: "000000" } } } },
  sections: [
    { properties: { page: { size: A4, margin: { top: 794, bottom: 794, left: 794, right: 794 } } }, children: coverChildren },
    {
      properties: { page: { size: A4, margin: { top: 794, bottom: 1021, left: 794, right: 794 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 22 })] })] }) },
      children: [...contents, ...figureList, ...children],
    },
  ],
});
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, await Packer.toBuffer(doc));
console.log("wrote", OUT, `(${figures.length} figures, the last on page ${figures.at(-1).page})`);
