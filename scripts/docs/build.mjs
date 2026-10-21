/*
 * Builds the documents of docs/ProjectdocInfo: each .md -> "<name>.pdf" and "<name>.docx" next to it, with every diagram as vector SVG.
 *   node build.mjs "User Flow" [--check]
 * Flowcharts are drawn by render.js (ELK layout, orthogonal lines, rounded elbows, theme of diagram-theme.md); other Mermaid charts
 * (sequence, state, ER) by Mermaid itself. --check only renders the diagrams and their QA report (out/<name>/) and writes no document.
 * A diagram whose text would print smaller than MIN_FONT_PT on a portrait page goes on a landscape page; if it is still too small
 * there, the build fails: split the diagram.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, Packer, PageNumber, PageOrientation, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const DOCS = path.join(ROOT, "docs/ProjectdocInfo");
const MERMAID = path.join(HERE, "node_modules/mermaid/dist/mermaid.min.js");
const ELK = path.join(HERE, "node_modules/elkjs/lib/elk.bundled.js");

const MIN_FONT_PT = 7;
const PX_PER_MM = 96 / 25.4;
const MARGIN_MM = 18;
const PAGE = { portrait: { w: 210, h: 297 }, landscape: { w: 297, h: 210 } };
// the room of a figure on its page: the page less the margins and what always goes with it (the title, the heading and the caption: 34 mm, 38 mm on a landscape page whose title shares it);
// a landscape page has narrower margins above and below, so a wide figure keeps its size
const MARGIN_LAND_V = 12;
const usable = (orientation) => ({ w: (PAGE[orientation].w - 2 * MARGIN_MM) * PX_PER_MM, h: (PAGE[orientation].h - 2 * (orientation === "landscape" ? MARGIN_LAND_V : MARGIN_MM) - (orientation === "landscape" ? 38 : 34)) * PX_PER_MM });

const theme = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(fs.readFileSync(path.join(DOCS, "diagram-theme.md"), "utf8"))[1]);
const args = process.argv.slice(2);
// --th: the Thai edition (a reading copy, written to docs/ProjectdocInfo/Thai): every text goes through the dictionary th/dict-*.json
const TH = args.includes("--th");
if (TH) theme.font = "Leelawadee UI, Tahoma, Arial, sans-serif";
// the dictionary of a document: the words every document shares (all dict files), overridden by the file of that document (dict-<name>.json)
const dictFiles = TH ? fs.readdirSync(path.join(HERE, "th")).filter((f) => /^dict-.*\.json$/.test(f)) : [];
const readDict = (file) => JSON.parse(fs.readFileSync(path.join(HERE, "th", file), "utf8"));
let dict = {};
const useDict = (name) => {
  dict = {};
  for (const file of dictFiles) Object.assign(dict, readDict(file));
  const own = `dict-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
  if (dictFiles.includes(own)) Object.assign(dict, readDict(own));
};
const missing = new Set();
const tr = (text) => {
  if (!TH || !text) return text;
  if (dict[text] !== undefined) return dict[text];
  missing.add(text);
  return text;
};
/** A string of a figure spec that is a sentence or a name (not an identifier, a path or a method) is looked up; the others stay. */
const isWords = (text) => /[a-z]{2}/.test(text) && /\s/.test(text.trim());
const SKIP = new Set(["path", "methods", "roles", "tables", "names", "ghosts", "dashed"]);
// these keys of a figure spec always hold a text for the reader (a module name may be one word)
const TEXT_KEYS = new Set(["name", "who", "text", "caption"]);
const trDeep = (value, key = "") => {
  if (typeof value === "string") return TEXT_KEYS.has(key) ? tr(value) : dict[value] !== undefined ? dict[value] : isWords(value) ? tr(value) : value;
  if (Array.isArray(value)) return value.map((item) => trDeep(item, key));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, item]) => [k, SKIP.has(k) ? item : trDeep(item, k)]));
  return value;
};
const ink = theme.connector.stroke;
const headFill = theme.roles.decision.fill;

// ------------------------------------------------------------------ markdown

/** The blocks of a .md: headings, paragraphs, lists, tables, mermaid charts and other code. */
function parseMd(text) {
  const blocks = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length; ) {
    const line = lines[i];
    const fence = /^```(\w*)/.exec(line);
    if (fence) {
      const body = [];
      for (i += 1; i < lines.length && !lines[i].startsWith("```"); i += 1) body.push(lines[i]);
      i += 1;
      blocks.push(fence[1] === "mermaid" ? { type: "chart", code: body.join("\n") } : { type: "code", lang: fence[1], text: body.join("\n") });
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)/.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      i += 1;
      continue;
    }
    if (!line.trim() || /^---+$/.test(line.trim())) {
      i += 1;
      continue;
    }
    if (line.startsWith("|")) {
      const rows = [];
      for (; i < lines.length && lines[i].startsWith("|"); i += 1) rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
      const align = rows[1].map((cell) => (cell.startsWith(":") && cell.endsWith(":") ? "center" : cell.endsWith(":") ? "right" : "left"));
      blocks.push({ type: "table", head: rows[0], rows: rows.slice(2), align });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      for (; i < lines.length && /^\s*[-*]\s+/.test(lines[i]); i += 1) items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
      blocks.push({ type: "list", items });
      continue;
    }
    const para = [];
    for (; i < lines.length && lines[i].trim() && !/^(#|```|\||\s*[-*]\s)/.test(lines[i]); i += 1) para.push(lines[i].trim());
    blocks.push({ type: "para", text: para.join(" ") });
  }
  return blocks;
}

/** Inline markdown as runs: `code`, **bold**, [text](link) -> text. */
function inline(text) {
  const runs = [];
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\([^)]+\)/g;
  let at = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > at) runs.push({ text: text.slice(at, match.index) });
    if (match[1] !== undefined) runs.push({ text: match[1], code: true });
    else if (match[2] !== undefined) runs.push({ text: match[2], bold: true });
    else runs.push({ text: match[3] });
    at = match.index + match[0].length;
  }
  if (at < text.length) runs.push({ text: text.slice(at) });
  return runs.map((run) => ({ ...run, text: run.text.replace(/<br\s*\/?>/g, " ") }));
}

const esc = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const htmlInline = (text) => inline(text).map((run) => (run.code ? `<code>${esc(run.text)}</code>` : run.bold ? `<b>${esc(run.text)}</b>` : esc(run.text))).join("");

/**
 * `<name>.figures.json` next to a .md says how the document draws what the Markdown cannot draw well on paper:
 *   erDiagram: { dashed, extra, figures: [{ caption, tables, names, ghosts, ... }] }  the one erDiagram block becomes these figures
 *   fences: [{ heading, code }]  the text code block under that heading is drawn as this Mermaid chart
 *   charts: [{ heading, replace | before: [{ caption, code }], caption }]  the chart under that heading is replaced, or kept (with this caption) after the figures `before` it
 * The Markdown stays the source of the tables, columns and relationships.
 */
function expandFigures(blocks, config) {
  const out = [];
  let heading = "";
  for (const block of blocks) {
    if (block.type === "heading") heading = block.text;
    const fence = block.type === "code" && (config.fences ?? []).find((item) => item.heading === heading);
    if (fence) {
      for (const figure of fence.figures ?? [fence]) out.push({ type: "chart", code: figure.code ?? block.code, caption: figure.caption ?? heading, er: figure.er, api: figure.api });
    } else if (block.type === "chart" && (config.charts ?? []).some((item) => item.heading === heading)) {
      const entry = config.charts.find((item) => item.heading === heading);
      for (const figure of entry.before ?? entry.replace ?? []) out.push({ type: "chart", code: figure.code ?? block.code, caption: figure.caption ?? heading, er: figure.er, api: figure.api });
      // `mark`: a line put under the first line of the kept chart (a layout, e.g. "%% layout: modules")
      const kept = entry.mark ? { ...block, code: block.code.replace(/^(\s*\w+[^\n]*\n)/, `$1${entry.mark}\n`) } : block;
      if (!entry.replace) out.push({ ...kept, caption: entry.caption ?? heading });
      for (const figure of entry.after ?? []) out.push({ type: "chart", code: figure.code ?? block.code, caption: figure.caption ?? heading, er: figure.er });
    } else if (block.type === "chart" && config.erDiagram && block.code.trimStart().startsWith("erDiagram")) {
      const { figures, ...shared } = config.erDiagram;
      for (const figure of figures) out.push({ type: "chart", code: block.code, caption: figure.caption, er: { ...shared, ...figure } });
    } else out.push(block);
  }
  return out;
}

// ------------------------------------------------------------------ diagrams

/**
 * A Mermaid stateDiagram as the flowchart renderer reads it: a state is a rounded box (its name, or the text given by `state "text" as Id`),
 * [*] is a Start or an End terminal, and a change keeps its label. The document draws its state diagrams this way (right-angle lines,
 * labels beside the lines) instead of Mermaid's curves.
 */
function stateToFlow(code) {
  const names = {};
  for (const m of code.matchAll(/^\s*state "([^"]+)" as (\w+)/gm)) names[m[2]] = m[1];
  const defined = new Set();
  const out = [
    "flowchart TD",
    "    %% layer-gap: 72",
    "    classDef startEnd fill:#1e1e1e,stroke:#1e1e1e,color:#ffffff,stroke-width:2px;",
    "    classDef action fill:#f3e8ff,stroke:#a855f7,color:#1e293b,stroke-width:1.5px;",
    "",
  ];
  let ends = 0;
  const node = (id, role) => {
    if (id === "[*]") {
      const key = role === "from" ? "Start" : `End${ends ? ends : ""}`;
      if (role === "to") ends += 1;
      const nid = role === "from" ? "S0" : `E${ends}`;
      if (!defined.has(nid)) out.push(`    ${nid}(["${key.replace(/\d+$/, "")}"]):::startEnd`), defined.add(nid);
      return nid;
    }
    if (!defined.has(id)) out.push(`    ${id}["${names[id] ?? id}"]:::action`), defined.add(id);
    return id;
  };
  for (const line of code.split("\n")) {
    const m = /^\s*(\[\*\]|\w+)\s*-->\s*(\[\*\]|\w+)(?::\s*(.+))?\s*$/.exec(line);
    if (!m) continue;
    const a = node(m[1], "from");
    const b = node(m[2], "to");
    out.push(m[3] ? `    ${a} -- "${m[3].trim().replace(/"/g, "'")}" --> ${b}` : `    ${a} --> ${b}`);
  }
  return out.join("\n");
}

async function renderCharts(page, blocks, outDir) {
  const charts = blocks.filter((block) => block.type === "chart");
  const report = [];
  let failed = false;
  for (const [index, chart] of charts.entries()) {
    const kind = chart.code.trimStart().split(/\s/)[0];
    let result;
    if (chart.api) result = await page.evaluate(([spec, t]) => window.renderApi(spec, t), [chart.api, theme]);
    else if (chart.er) result = await page.evaluate(([code, t, spec]) => window.renderEr(code, t, spec), [chart.code, theme, chart.er]);
    else if (kind.startsWith("stateDiagram")) result = await page.evaluate(([code, t]) => window.renderFlowchart(code, t), [stateToFlow(chart.code), theme]);
    else if (kind === "flowchart" || kind === "graph") result = await page.evaluate(([code, t]) => window.renderFlowchart(code, t), [chart.code, theme]);
    else result = await page.evaluate(([code, id]) => window.renderMermaid(code, id), [chart.code, `m${index}`]);
    if (TH) for (const text of await page.evaluate(() => [...(window.__miss ?? [])])) missing.add(text);
    Object.assign(chart, result, { index: index + 1 });

    // the size on paper: the largest scale that fits; portrait unless landscape prints the text larger and portrait is too small
    const fit = (orientation) => {
      const room = usable(orientation);
      const scale = Math.min(1, room.w / chart.width, room.h / chart.height);
      return { orientation, scale, fontPt: theme.fontSize * scale * 0.75 };
    };
    const [portrait, landscape] = [fit("portrait"), fit("landscape")];
    // landscape only when it prints the text clearly larger (a wide diagram), or when portrait is too small
    const wantLandscape = landscape.fontPt > portrait.fontPt * 1.15 || (portrait.fontPt < MIN_FONT_PT && landscape.fontPt > portrait.fontPt);
    Object.assign(chart, wantLandscape ? landscape : portrait);
    if (chart.fontPt < MIN_FONT_PT) {
      chart.issues = [...(chart.issues ?? []), `text prints at ${chart.fontPt.toFixed(1)} pt even on landscape: split the diagram`];
      failed = true;
    }
    const name = `fig-${String(index + 1).padStart(2, "0")}`;
    fs.writeFileSync(path.join(outDir, `${name}.svg`), chart.svg);
    await page.setContent(`<html><body style="margin:0;background:#fff">${chart.svg}</body></html>`);
    chart.png = await page.locator("svg").first().screenshot({ type: "png", omitBackground: false });
    fs.writeFileSync(path.join(outDir, `${name}.png`), chart.png);
    await loadRenderers(page);
    report.push({ figure: name, kind, size: `${chart.width}x${chart.height}`, orientation: chart.orientation, fontPt: Number(chart.fontPt.toFixed(1)), crossings: chart.crossings ?? null, issues: chart.issues ?? [] });
  }
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  return { report, failed };
}

async function loadRenderers(page) {
  await page.setContent("<html><body></body></html>");
  await page.addScriptTag({ path: ELK });
  await page.addScriptTag({ path: path.join(HERE, "render.js") });
  await page.addScriptTag({ path: path.join(HERE, "render-er.js") });
  await page.addScriptTag({ path: path.join(HERE, "render-api.js") });
  await page.addScriptTag({ path: MERMAID });
  await page.evaluate((d) => {
    window.__th = d;
    window.__miss = new Set();
  }, TH ? dict : null);
  await page.evaluate((t) => {
    window.mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      fontFamily: t.font,
      themeVariables: { fontFamily: t.font, fontSize: `${t.fontSize}px`, primaryColor: t.roles.action.fill, primaryBorderColor: t.roles.action.stroke, primaryTextColor: t.roles.action.text, lineColor: t.connector.stroke, textColor: t.connector.labelText, noteBkgColor: t.roles.decision.fill, noteBorderColor: t.roles.decision.stroke, actorBkg: t.roles.decision.fill, actorBorder: t.roles.decision.stroke },
      flowchart: { htmlLabels: false },
      themeCSS: ".messageText, .noteText { paint-order: stroke; stroke: #ffffff; stroke-width: 4px; stroke-linejoin: round; }",
      sequence: { useMaxWidth: false, wrap: true, width: 150, messageMargin: 26, noteMargin: 8, boxMargin: 6, actorMargin: 40 },
      er: { useMaxWidth: false },
      state: { useMaxWidth: false },
    });
    window.renderMermaid = async (code, id) => {
      // a state diagram of the document runs top to bottom (a left-to-right chain of 8 states is too wide for a page)
      if (/^\s*stateDiagram/.test(code)) code = code.replace(/^(\s*)direction LR$/m, "$1direction TB");
      const { svg } = await window.mermaid.render(id, code);
      const holder = document.createElement("div");
      holder.innerHTML = svg;
      document.body.append(holder);
      const node = holder.querySelector("svg");
      const box = node.getBBox();
      const pad = 8;
      const width = Math.ceil(box.width + 2 * pad);
      const height = Math.ceil(box.height + 2 * pad);
      node.setAttribute("viewBox", `${box.x - pad} ${box.y - pad} ${width} ${height}`);
      node.setAttribute("width", width);
      node.setAttribute("height", height);
      node.removeAttribute("style");
      const out = node.outerHTML;
      holder.remove();
      return { svg: out, width, height, issues: [] };
    };
  }, theme);
}

// ------------------------------------------------------------------ PDF

/** The Thai edition of the blocks: texts through the dictionary; the text inside flowcharts is looked up by render.js (window.__th). */
function translateBlocks(blocks) {
  const cell = (text) => tr(text);
  return blocks.map((block) => {
    if (block.type === "heading" || block.type === "para") return { ...block, text: tr(block.text) };
    if (block.type === "list") return { ...block, items: block.items.map(tr) };
    if (block.type === "table") return { ...block, head: block.head.map(cell), rows: block.rows.map((row) => row.map(cell)) };
    if (block.type === "code") return { ...block, text: tr(block.text) };
    if (block.type === "chart") {
      const out = { ...block, caption: tr(block.caption) };
      if (out.er) out.er = trDeep(out.er);
      if (out.api) out.api = trDeep(out.api);
      // text in quotes of an ER diagram (a column note, the label of a relationship) and of a Mermaid sequence diagram
      if (/^\s*erDiagram/.test(out.code)) out.code = out.code.replace(/"([^"\n]+)"/g, (all, text) => `"${tr(text)}"`);
      else if (/^\s*sequenceDiagram/.test(out.code)) {
        // the names of the actors (`actor X as Name`), the text of a message (`A->>B: text`) and of a note
        const head = (row, pattern) => row.replace(pattern, (all, start, text) => start + tr(text.trim()));
        out.code = out.code
          .split("\n")
          .map((row) => head(head(head(row, /^(\s*(?:actor|participant)\s+\w+\s+as\s+)(.+)$/), /^(\s*\w+\s*(?:-->>|->>|--x|-x|-->|->)\s*\w+\s*:\s*)(.+)$/), /^(\s*Note\s+(?:over|left of|right of)\s+[\w, ]+:\s*)(.+)$/))
          .join("\n");
      }
      return out;
    }
    return block;
  });
}

function html(title, blocks) {
  const body = [];
  for (const block of blocks) {
    if (block.type === "heading") body.push(`<h${block.level}>${htmlInline(block.text)}</h${block.level}>`);
    else if (block.type === "para") body.push(`<p>${htmlInline(block.text)}</p>`);
    else if (block.type === "list") body.push(`<ul>${block.items.map((item) => `<li>${htmlInline(item)}</li>`).join("")}</ul>`);
    else if (block.type === "code") body.push(`<pre>${esc(block.text)}</pre>`);
    else if (block.type === "table")
      body.push(
        `<table><thead><tr>${block.head.map((cell, i) => `<th style="text-align:${block.align[i]}">${htmlInline(cell)}</th>`).join("")}</tr></thead><tbody>${block.rows
          .map((row) => `<tr>${row.map((cell, i) => `<td style="text-align:${block.align[i]}">${htmlInline(cell)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`,
      );
    else if (block.type === "chart") {
      const w = Math.round(block.width * block.scale);
      const h = Math.round(block.height * block.scale);
      const svg = block.svg.replace(/<svg([^>]*?)\swidth="[^"]*"\sheight="[^"]*"/, `<svg$1 width="${w}" height="${h}"`).replace(/<svg(?![^>]*\swidth=)/, `<svg width="${w}" height="${h}"`);
      body.push(`<figure class="${block.orientation}">${svg}<figcaption>${TH ? "รูปที่" : "Figure"} ${block.index}. ${esc(block.caption)}</figcaption></figure>`);
    }
  }
  // a heading stays with what follows it; a landscape figure takes its heading to the landscape page
  // a heading stays with the figure after it (the title too, when the figure comes right after it), and a short note after a figure stays with it:
  // so a page never holds a title or a sentence alone
  const joined = body
    .join("\n")
    .replace(/((?:<h1>.*?<\/h1>\n)?<h[2-4]>.*?<\/h[2-4]>)\n(<p>.*?<\/p>\n)?(<figure class="(portrait|landscape)">)/g, (all, heading, para = "", open, orientation) => `<div class="keep ${orientation}">${heading}\n${para}${open}`)
    .replace(/(<\/figure>)/g, "$1</div>")
    .replace(/<\/div><\/div>/g, "</div>")
    .replace(/<\/figure><\/div>\n(<p>[^\n]*<\/p>)/g, "</figure>\n$1</div>");
  return `<!doctype html><html lang="${TH ? "th" : "en"}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@page { size: A4 portrait; margin: ${MARGIN_MM}mm; }
@page land { size: A4 landscape; margin: ${MARGIN_LAND_V}mm ${MARGIN_MM}mm; }
.landscape { page: land; }
body { font-family: ${theme.font}; font-size: 10.5pt; color: ${ink}; line-height: 1.45; }
h1 { font-size: 22pt; margin: 0 0 10pt; border-bottom: 2pt solid ${theme.roles.decision.stroke}; padding-bottom: 6pt; }
h2 { font-size: 15pt; margin: 18pt 0 8pt; break-after: avoid; }
h3 { font-size: 12pt; margin: 14pt 0 6pt; break-after: avoid; }
p, ul { margin: 0 0 8pt; }
code, pre { font-family: Consolas, "Courier New", monospace; font-size: 9pt; }
pre { white-space: pre; border: 0.5pt solid ${ink}; padding: 6pt; break-inside: avoid; }
table { border-collapse: collapse; width: 100%; margin: 0 0 10pt; font-size: 9pt; break-inside: auto; }
th, td { border: 0.5pt solid ${ink}; padding: 3pt 5pt; vertical-align: top; }
th { background: ${headFill}; }
tr { break-inside: avoid; }
.keep, figure { break-inside: avoid; }
figure { margin: 6pt 0 12pt; text-align: center; }
figure svg { display: block; margin: 0 auto; }
figcaption { font-size: 9pt; margin-top: 4pt; }
</style></head><body>${joined}</body></html>`;
}

// ------------------------------------------------------------------ DOCX

const TWIP_PER_MM = 56.7;
const runsOf = (text, extra = {}) => inline(text).map((run) => new TextRun({ text: run.text, bold: run.bold || extra.bold, font: run.code ? "Consolas" : undefined, size: run.code ? 18 : extra.size }));

function docxBlocks(blocks) {
  const sections = [];
  let current = null;
  const start = (orientation) => {
    current = { orientation, children: [] };
    sections.push(current);
  };
  start("portrait");
  const border = { style: BorderStyle.SINGLE, size: 4, color: ink.slice(1) };
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    // a heading (the title too) goes with the figure that follows it: into a landscape section when that figure is landscape
    if (block.type === "heading") {
      let want = "portrait";
      for (let j = i + 1; j < blocks.length && j < i + 5; j += 1) {
        if (blocks[j].type === "chart") {
          want = blocks[j].orientation;
          break;
        }
        if (blocks[j].type !== "heading" && blocks[j].type !== "para") break;
      }
      if (want !== current.orientation) start(want);
    }
    if (block.type === "heading") {
      const level = [HeadingLevel.TITLE, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][block.level - 1];
      current.children.push(new Paragraph({ heading: level, keepNext: true, children: runsOf(block.text) }));
    } else if (block.type === "para") current.children.push(new Paragraph({ children: runsOf(block.text), spacing: { after: 120 }, keepNext: blocks[i + 1]?.type === "chart" }));
    else if (block.type === "list") for (const item of block.items) current.children.push(new Paragraph({ bullet: { level: 0 }, children: runsOf(item) }));
    else if (block.type === "code") for (const row of block.text.split("\n")) current.children.push(new Paragraph({ children: [new TextRun({ text: row || " ", font: "Consolas", size: 17 })], spacing: { after: 0 } }));
    else if (block.type === "table") {
      const cell = (text, head, align) =>
        new TableCell({
          borders: { top: border, bottom: border, left: border, right: border },
          shading: head ? { type: ShadingType.CLEAR, fill: headFill.slice(1), color: "auto" } : undefined,
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
          children: [new Paragraph({ alignment: { center: AlignmentType.CENTER, right: AlignmentType.RIGHT }[align] ?? AlignmentType.LEFT, children: runsOf(text, { bold: head, size: 18 }) })],
        });
      current.children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ tableHeader: true, children: block.head.map((text, j) => cell(text, true, block.align[j])) }), ...block.rows.map((row) => new TableRow({ cantSplit: true, children: row.map((text, j) => cell(text, false, block.align[j])) }))],
        }),
      );
      current.children.push(new Paragraph({ children: [] }));
    } else if (block.type === "chart") {
      const w = Math.round(block.width * block.scale);
      const h = Math.round(block.height * block.scale);
      current.children.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, children: [new ImageRun({ type: "svg", data: Buffer.from(block.svg), transformation: { width: w, height: h }, fallback: { type: "png", data: block.png } })] }));
      current.children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: `Figure ${block.index}. ${block.caption}`, size: 18 })] }));
    }
  }
  return sections.filter((section) => section.children.length);
}

async function writeDocx(title, blocks, file) {
  const margin = Math.round(MARGIN_MM * TWIP_PER_MM);
  const doc = new Document({
    creator: "scripts/docs",
    title,
    styles: { default: { document: { run: { font: "Arial", size: 21, color: ink.slice(1) } } } },
    sections: docxBlocks(blocks).map((section) => ({
      properties: {
        page: {
          size: { width: Math.round(210 * TWIP_PER_MM), height: Math.round(297 * TWIP_PER_MM), orientation: section.orientation === "landscape" ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
          margin: { top: margin, bottom: margin, left: margin, right: margin },
        },
      },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${title} · page `, size: 16 }), new TextRun({ children: [PageNumber.CURRENT], size: 16 })] })] }) },
      children: section.children,
    })),
  });
  fs.writeFileSync(file, await Packer.toBuffer(doc));
}

// ------------------------------------------------------------------ main

const checkOnly = args.includes("--check");
const names = args.filter((arg) => !arg.startsWith("--"));
if (!names.length) {
  console.error('usage: node build.mjs "<name of a .md in docs/ProjectdocInfo>" [--check]');
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
let anyFailed = false;
try {
  for (const name of names) {
    // a document is docs/ProjectdocInfo/<name>.md or in its own folder docs/ProjectdocInfo/<folder>/<name>.md; its PDF and DOCX go next to it
    const source = [DOCS, ...fs.readdirSync(DOCS, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => path.join(DOCS, entry.name))].map((dir) => path.join(dir, `${name}.md`)).find((file) => fs.existsSync(file));
    if (!source) throw new Error(`${name}.md not found in docs/ProjectdocInfo`);
    let blocks = parseMd(fs.readFileSync(source, "utf8"));
    const figuresFile = source.replace(/\.md$/, ".figures.json");
    if (fs.existsSync(figuresFile)) blocks = expandFigures(blocks, JSON.parse(fs.readFileSync(figuresFile, "utf8")));
    // a figure is named after the heading above it
    let heading = "";
    for (const block of blocks) {
      if (block.type === "heading") heading = block.text;
      if (block.type === "chart") block.caption ??= heading;
    }
    if (TH) {
      useDict(name);
      blocks = translateBlocks(blocks);
    }
    const title = blocks.find((block) => block.type === "heading" && block.level === 1)?.text ?? name;
    const outDir = path.join(HERE, "out", TH ? `th-${name}` : name);
    fs.mkdirSync(outDir, { recursive: true });
    await loadRenderers(page);
    const { report, failed } = await renderCharts(page, blocks, outDir);
    anyFailed ||= failed;
    for (const item of report) console.log(`${name} ${item.figure} ${item.kind} ${item.size} ${item.orientation} ${item.fontPt}pt crossings=${item.crossings}${item.issues.length ? `\n  - ${item.issues.join("\n  - ")}` : ""}`);
    const doc = html(title, blocks);
    fs.writeFileSync(path.join(outDir, "document.html"), doc);
    if (TH) {
      const left = [...missing];
      fs.writeFileSync(path.join(HERE, "th", `missing-${name}.json`), JSON.stringify(Object.fromEntries(left.map((text) => [text, ""])), null, 2));
      console.log(`${name}: ${left.length} text(s) without a Thai translation`);
      missing.clear();
    }
    if (checkOnly || failed) continue;
    await page.setContent(doc, { waitUntil: "load" });
    const target = TH ? path.join(DOCS, "Thai") : path.dirname(source);
    fs.mkdirSync(target, { recursive: true });
    await page.pdf({
      path: path.join(target, TH ? `${name} (ไทย).pdf` : `${name}.pdf`),
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;text-align:center;font-family:${TH ? "Leelawadee UI, Tahoma" : "Arial"};font-size:8pt;color:${ink}">${esc(title)} · ${TH ? "หน้า" : "page"} <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
    });
    if (TH) {
      console.log(`wrote ${path.relative(ROOT, target)}/${name} (ไทย).pdf`);
      continue;
    }
    await writeDocx(title, blocks, path.join(path.dirname(source), `${name}.docx`));
    console.log(`wrote ${path.relative(ROOT, path.dirname(source))}/${name}.pdf and .docx`);
  }
} finally {
  await browser.close();
}
process.exit(anyFailed ? 1 : 0);
