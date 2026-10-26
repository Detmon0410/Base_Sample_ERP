/*
 * Builds the Thai user manual of the whole job, from the QT to the receipt, from out/walkthrough/steps.json and the screenshots that
 * walk-all.mjs took of the running app (red numbered frames on the places to click; the text under a picture uses the same numbers).
 * It has a cover, a table of contents and a list of figures with page numbers, numbered headings (1., 1.1) and numbered figures (ภาพที่ 1-1).
 * Output: docs/ProjectdocInfo/Workflow/Workflow.pdf
 *   node walk-all.mjs && node build-walkthrough.mjs
 * The page numbers of the contents are read from the finished PDF (python with pypdf), and the guide is built again with them.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, "out/walkthrough");
const OUT = path.resolve(HERE, "../../docs/ProjectdocInfo/Workflow/Workflow.pdf");
const { steps } = JSON.parse(fs.readFileSync(path.join(SHOTS, "steps.json"), "utf8"));
const TITLES = JSON.parse(fs.readFileSync(path.join(HERE, "walk-titles.json"), "utf8"));

const ROLE = {
  sale: { name: "Sale Worker", account: "sale@gmail.com", password: "sale" },
  factory: { name: "Factory Worker", account: "worker@gmail.com", password: "worker" },
  admin: { name: "Admin", account: "admin@gmail.com", password: "admin" },
};

const logo = fs.readFileSync(path.join(HERE, "../../frontend/public/logo.png")).toString("base64");
// the roles are written as the system writes them (Sale Worker, Factory Worker, Admin) everywhere in the guide
const md = (text) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/พนักงานขาย/g, " Sale Worker ")
    .replace(/พนักงานโรงงาน/g, " Factory Worker ")
    .replace(/ผู้ดูแลระบบ/g, " Admin ")
    .replace(/ {2,}/g, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1"); // no bold in the text
const img = (name) => `data:image/png;base64,${fs.readFileSync(path.join(SHOTS, `${name}.png`)).toString("base64")}`;
const chip = (role) => `<span class="chip">${ROLE[role].name}</span>`;

// Noto Sans Thai (loopless Thai, free licence), embedded in the PDF: the Thai and the Latin parts are separate files
const fontFile = (name) => fs.readFileSync(path.join(HERE, "fonts", name)).toString("base64");
const THAI_RANGE = "U+0E01-0E5B, U+200C-200D, U+25CC";
const LATIN_RANGE = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const FONT_FACES = [400, 700]
  .flatMap((weight) => [["thai", THAI_RANGE]].map(([set, range]) => `@font-face { font-family: "Noto Sans Thai"; font-weight: ${weight}; font-display: block; src: url(data:font/woff2;base64,${fontFile(`noto-sans-thai-${set}-${weight}-normal.woff2`)}) format("woff2"); unicode-range: ${range}; }`))
  .join("\n");
const FONT_STACK = "sans-serif"; // the plain sans-serif of the system for Latin and Thai letters (Noto Sans Thai: FONT_FACES and the fonts folder are kept to go back)

const PARTS = ["sale", "factory", "admin"];
// 1. is a part, 1.1 a step of the part; the figures are numbered inside the part: 1-1, 1-2 ...
const counters = {};
const numbers = steps.map((s) => {
  counters[s.role] = (counters[s.role] ?? 0) + 1;
  return `${PARTS.indexOf(s.role) + 1}.${counters[s.role]}`;
});
const figCount = {};
const figures = [];
for (const s of steps) {
  for (const shot of s.shots) {
    figCount[s.role] = (figCount[s.role] ?? 0) + 1;
    shot.no = `${PARTS.indexOf(s.role) + 1}-${figCount[s.role]}`;
    shot.title = TITLES[shot.file] ?? shot.caption ?? s.title;
    figures.push(shot);
  }
}

/** The HTML of the guide. `pages` has the page of every heading and figure ({ part, step, fig }); a page not known yet is empty. */
function buildHtml(pages) {
  const pg = (kind, key) => pages[kind]?.[key] ?? "";
  const body = [];
  // the waves behind the cover: the colours of the system (blue), light to dark
  const waves = `<svg class="waves" viewBox="0 0 210 297" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0 0 H70 C 52 16 24 30 0 62 Z" fill="#006ba3" fill-opacity=".6"/>
<path d="M45 0 H210 V52 C 186 66 150 52 122 38 C 98 26 70 22 45 0 Z" fill="#0085c8" fill-opacity=".28"/>
<path d="M78 0 H190 C 160 22 128 20 104 12 C 94 8 86 6 78 0 Z" fill="#0085c8" fill-opacity=".55"/>
<path d="M0 297 V262 C 40 244 92 252 132 266 C 164 277 192 276 210 266 V297 Z" fill="#0085c8" fill-opacity=".18"/>
<path d="M58 297 C 82 278 124 276 156 290 L 168 297 Z" fill="#0085c8" fill-opacity=".45"/>
<path d="M210 297 V236 C 204 262 192 282 164 297 Z" fill="#006ba3" fill-opacity=".6"/>
</svg>`;
  body.push(`<section class="cover">${waves}<div class="cover-body"><div class="badge"><img src="data:image/png;base64,${logo}"></div><p class="brand">Refrigerator Factory</p><h1>คู่มือการใช้งาน</h1><p class="en">USER MANUAL</p><p class="lead">ระบบบริหารจัดการโรงงาน<br>ใบเสนอราคา ใบสั่งผลิต สต็อก จัดซื้อ และบัญชี</p><div class="rule"></div><p class="by">จัดทำโดย</p><p class="who">Japan System</p></div></section>`);

  const rows = [];
  PARTS.forEach((role, pi) => {
    rows.push(`<div class="row part"><span>${pi + 1}. ${ROLE[role].name}</span><span>${pg("part", pi + 1)}</span></div>`);
    steps.forEach((s, i) => {
      if (s.role === role) rows.push(`<div class="row step"><span>${numbers[i]} ${md(s.title)}</span><span>${pg("step", numbers[i])}</span></div>`);
    });
  });
  body.push(`<section class="toc"><h2 class="center">สารบัญ</h2><div class="row head"><span></span><span>หน้า</span></div>${rows.join("")}</section>`);

  body.push(`<section class="toc"><h2 class="center">สารบัญภาพ</h2><div class="row head"><span>ภาพที่</span><span>หน้า</span></div>${figures.map((f) => `<div class="row"><span><span class="no">${f.no}</span> ${md(f.title)}</span><span>${pg("fig", f.no)}</span></div>`).join("")}</section>`);

  // the accounts to try the system with: shown at the first sign-in, where they are needed
  const accounts = `<div class="accounts"><h3>บัญชีสำหรับทดลองใช้งาน</h3>${Object.values(ROLE).map((r) => `<p class="acct">${r.name} อีเมล: <code>${r.account}</code> รหัสผ่าน: <code>${r.password}</code></p>`).join("")}</div>`;

  let lastRole = null;
  steps.forEach((s, i) => {
    if (s.role !== lastRole) {
      body.push(`<h2 class="part">${PARTS.indexOf(s.role) + 1}. ${ROLE[s.role].name}</h2>`);
      lastRole = s.role;
    }
    const shotHtml = (shot) => {
      const legend = shot.marks.length ? `<ol class="legend">${shot.marks.map((t, k) => `<li><span class="n">${k + 1}.</span><span>${md(t)}</span></li>`).join("")}</ol>` : "";
      return `<figure class="shot${shot.paper ? " paper" : ""}"><img src="${img(shot.file)}"><figcaption><b>ภาพที่ ${shot.no}</b> ${md(shot.title)}</figcaption>${legend}</figure>`;
    };
    // the heading, its notes and the first picture stay on one page; the next pictures follow
    body.push(`<section class="keep"><header class="stephead"><h3>${numbers[i]} ${md(s.title)}</h3>${chip(s.role)}</header>${s.notes.length ? `<ul class="notes">${s.notes.map((t) => `<li>${md(t)}</li>`).join("")}</ul>` : ""}${s.shots[0] ? shotHtml(s.shots[0]) : ""}${i === 0 ? accounts : ""}</section>`);
    for (const shot of s.shots.slice(1)) body.push(shotHtml(shot));
  });

  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>คู่มือการใช้งาน Refrigerator Factory</title><style>

@page { size: A4 portrait; margin: 14mm 14mm 18mm; @bottom-center { content: counter(page); font: 11pt ${FONT_STACK}; color: #000; } }
@page cover { size: A4 portrait; margin: 0; @bottom-center { content: none; } }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: ${FONT_STACK}; font-size: 12pt; color: #000; line-height: 1.5; }
h1 { font-size: 22pt; margin: 0 0 6pt; }
.cover { page: cover; position: relative; width: 210mm; height: 297mm; overflow: hidden; break-after: page; }
.cover .waves { position: absolute; left: -3mm; top: -3mm; width: calc(100% + 6mm); height: calc(100% + 6mm); }
.cover-body { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: 40mm; }
.cover .badge { width: 30mm; height: 30mm; display: flex; align-items: center; justify-content: center; }
.cover .badge img { width: 30mm; height: 30mm; object-fit: contain; }
.cover .brand { margin: 8pt 0 0; font-weight: bold; font-size: 12pt; letter-spacing: .5pt; }
.cover h1 { font-size: 36pt; color: #0085c8; margin: 30mm 0 0; line-height: 1.15; }
.cover .en { font-size: 18pt; font-weight: bold; letter-spacing: 0; margin: 8pt 0 0; }
.cover .lead { font-size: 14pt; font-weight: bold; line-height: 1.7; margin: 30mm 0 0; }
.cover .rule { width: 62mm; border-top: 3pt solid #0085c8; margin: 36mm 0 0; }
.cover .by { font-size: 12pt; font-weight: bold; margin: 24mm 0 0; }
.cover .who { font-size: 20pt; font-weight: bold; color: #0085c8; margin: 2pt 0 0; line-height: 1.2; }
h2 { font-size: 17pt; color: #000; margin: 18pt 0 8pt; break-after: avoid; }
h2.center { text-align: center; margin-top: 0; color: #000; }
.toc h3 { color: #000; }
.toc table.summary th { background: #fff; }
h2.part { border-left: 6pt solid #0085c8; padding-left: 8pt; margin-top: 0; break-before: page; }
h3 { font-size: 14pt; color: #000; margin: 12pt 0 5pt; break-after: avoid; }
.toc { break-before: page; }
.accounts h3 { color: #000; margin: 10pt 0 4pt; }
.toc .row { display: flex; justify-content: space-between; gap: 12pt; padding: 1pt 0; line-height: 1.35; }
.toc .row > span:last-child { flex: 0 0 auto; }
.toc .row.head { font-weight: bold; margin-bottom: 6pt; }
.toc .row.part { font-weight: bold; margin-top: 5pt; }
.toc .row.step { padding-left: 24pt; }
.toc .no { display: inline-block; min-width: 34pt; }
table.summary { width: 100%; border-collapse: collapse; margin: 0 0 10pt; font-size: 11pt; }
table.summary th, table.summary td { border: 0.5pt solid #000; padding: 3pt 6pt; vertical-align: top; }
table.summary th { background: #e6f3fa; text-align: left; }
code { font-family: Consolas, monospace; font-size: 11pt; }
.acct { margin: 0 0 3pt; line-height: 1.5; }
.chip { color: #0085c8; border: 0.75pt solid #0085c8; border-radius: 9pt; padding: 0 8pt; font-size: 10.5pt; white-space: nowrap; }
.keep { break-inside: avoid; }
.stephead { display: flex; align-items: center; gap: 8pt; margin: 14pt 0 4pt; break-after: avoid; break-inside: avoid; }
.stephead h3 { margin: 0; flex: 1; }
ul.notes { margin: 0 0 6pt; padding-left: 18pt; font-size: 12pt; color: #000; break-after: avoid; }
.shot { margin: 6pt 0 10pt; break-inside: avoid; }
.shot img { display: block; box-sizing: border-box; width: 100%; border: 0.75pt solid #000; }
.shot.paper img { width: 120mm; margin: 0 auto; }
figcaption { font-size: 11pt; color: #000; margin: 4pt 0; text-align: center; }
ol.legend { list-style: none; margin: 5pt 0 0; padding: 0; font-size: 12pt; }
ol.legend li { display: flex; gap: 7pt; align-items: baseline; margin-bottom: 2pt; }
.n { flex: 0 0 auto; min-width: 14pt; color: #000; }
</style></head><body>${body.join("\n")}</body></html>`;
}

// the page of every heading and figure, read from the PDF (the numbers in the contents must be those of the finished document);
// the search starts after the pages of the contents
const FIND = `
import json, re, sys
from pypdf import PdfReader
r = PdfReader(sys.argv[1])
texts = [(p.extract_text() or "") for p in r.pages]
start = next((i for i, t in enumerate(texts) if "บัญชีสำหรับทดลอง" in t), 1) + 1
steps = json.loads(sys.argv[2])
figs = json.loads(sys.argv[3])
out = {"part": {}, "step": {}, "fig": {}}
def find(rx):
    for i in range(start, len(texts)):
        if re.search(rx, texts[i], re.M):
            return i + 1
    return None
for n in steps:
    out["step"][n] = find("^" + re.escape(n) + r"\\s")
    if n.endswith(".1"):
        part = n.split(".")[0]
        out["part"][part] = out["step"][n]  # the heading of the part is on the page of its first step
for f in figs:
    out["fig"][f] = find("ภาพท[^0-9\\n]{0,6}" + re.escape(f) + "(?![0-9])")
print(json.dumps(out))
`;

async function render(html) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await page.pdf({ path: OUT, preferCSSPageSize: true, displayHeaderFooter: false });
  await browser.close();
}

let pages = {};
for (let pass = 0; pass < 3; pass += 1) {
  const html = buildHtml(pages);
  fs.writeFileSync(path.join(SHOTS, "guide.html"), html);
  await render(html);
  const found = JSON.parse(execFileSync("python", ["-c", FIND, OUT, JSON.stringify(numbers), JSON.stringify(figures.map((f) => f.no))], { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } }));
  if (JSON.stringify(found) === JSON.stringify(pages)) break;
  pages = found;
}
const missing = [...Object.entries(pages.step), ...Object.entries(pages.fig)].filter(([, v]) => !v);
if (missing.length) console.log("page not found for", missing.map(([k]) => k).join(", "));
console.log("wrote", OUT);
