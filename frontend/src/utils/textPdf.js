/**
 * The PDF documents of the ER diagram, the DB relations and the flow chart, A4 or A3 (landscape, or portrait for the flow chart), in
 * the language of the page. Every page has a
 * running header (the system on the left, the document on the right) and a footer (the date on the left, "page / pages" on the
 * right); the first page has the title block. The body is made of numbered sections, headings, paragraphs, bullet lists, tables
 * (tinted header, striped rows; a long table goes on over the next page with its header again), boxed sketches and the framed
 * drawing of erLayout.js.
 * In English the PDF is real lines and text (Helvetica, Courier), so it stays sharp and can be searched. The built-in fonts of a PDF
 * have no Japanese, so in Japanese the same pages are drawn by the browser and put in as pictures (canvasPdf.js); the page numbers
 * are written over them as text. jsPDF is loaded only when it is used. The `code` and **bold** marks of the .md texts are left out.
 */
import { censor } from "./censor";

const PT_PER_MM = 72 / 25.4;
const BRAND = "#0085c8"; // the theme blue of the app
const BRAND_DARK = "#006ba3";
const TINT = "#e6f3fa"; // the header row of a table
const STRIPE = "#f3f9fc"; // every other row
const BOX = "#f3f9fc";
const TEXT = "#1f2328";
const MUTED = "#5b6168";
const RULE = "#d5d8dc";

const BODY = 9.5; // pt
const SMALL = 8;
const LINE_FACTOR = 1.35;
const mm = (pt) => pt / PT_PER_MM;

/** A text of the .md without its marks (`code` and **bold**), and without what is never shown (utils/censor.js). */
export const plain = (text) => censor(text).replace(/\*\*/g, "").replace(/`/g, "");

const fontStyle = (shape) => (shape.bold && shape.italic ? "bolditalic" : shape.bold ? "bold" : shape.italic ? "italic" : "normal");

/**
 * `paper` is "a4" or "a3", `orientation` "landscape" or "portrait". `frame` is { system, document, footer }: the running header and
 * the footer of every page, in the language of the page.
 */
export async function createTextPdf(language, { paper = "a4", orientation = "landscape", frame }) {
  const { jsPDF } = await import("jspdf");
  const japanese = String(language).startsWith("ja");
  let pdf;
  if (japanese) {
    const { createCanvasPdf } = await import("./canvasPdf");
    pdf = createCanvasPdf(jsPDF, { format: paper, orientation, pxPerMm: paper === "a4" ? 16 : 12 });
  } else {
    pdf = new jsPDF({ unit: "mm", format: paper, orientation });
  }
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = paper === "a4" ? 12 : 15;
  const roomWidth = pageWidth - margin * 2;
  const top = margin + 10; // under the running header
  const bottom = pageHeight - margin - 6; // over the footer
  let y = top;
  let pages = 1;
  let sectionNumber = 0;
  let headingNumber = 0;

  const font = (size, style = "normal", color = TEXT, family = "helvetica") => {
    pdf.setFont(family, style);
    pdf.setFontSize(size);
    pdf.setTextColor(color);
  };
  const lineHeight = (size) => mm(size) * LINE_FACTOR;

  /** The running header and the footer of the current page (the page number comes at the end, `save`). */
  const decorate = () => {
    font(SMALL, "bold", BRAND_DARK);
    pdf.text(frame.system, margin, margin + 2, { baseline: "middle" });
    font(SMALL, "normal", MUTED);
    pdf.text(frame.document, pageWidth - margin, margin + 2, { baseline: "middle", align: "right" });
    pdf.setDrawColor(BRAND);
    pdf.setLineWidth(0.5);
    pdf.line(margin, margin + 5, pageWidth - margin, margin + 5);
    pdf.setDrawColor(RULE);
    pdf.setLineWidth(0.2);
    pdf.line(margin, pageHeight - margin - 2, pageWidth - margin, pageHeight - margin - 2);
    font(SMALL, "normal", MUTED);
    pdf.text(frame.footer, margin, pageHeight - margin + 2, { baseline: "middle" });
  };
  decorate();

  const doc = {
    pdf,
    paper,
    pageWidth,
    pageHeight,
    margin,
    roomWidth,
    get y() {
      return y;
    },
    set y(value) {
      y = value;
    },
    setProperties: (properties) => pdf.setProperties(properties),
    newPage() {
      pdf.addPage(paper, orientation);
      pages += 1;
      y = top;
      decorate();
    },
    /** Starts a new page when `height` mm do not fit any more on this one. */
    room(height) {
      if (y + height > bottom) doc.newPage();
    },
    space(height) {
      y += height;
    },
    /** The room (mm) left on this page. */
    get rest() {
      return bottom - y;
    },
    /** The title block of the first page: a purple mark, the title and, when there is one, the line under it. */
    titleBlock(title, subtitle) {
      pdf.setFillColor(BRAND);
      pdf.rect(margin, y, 2.2, subtitle ? 13 : 9, "F");
      font(20, "bold");
      pdf.text(title, margin + 6, y + 4.5, { baseline: "middle" });
      if (subtitle) {
        font(BODY, "normal", MUTED);
        pdf.text(subtitle, margin + 6, y + 10.8, { baseline: "middle" });
      }
      y += subtitle ? 21 : 17;
    },
    /**
     * A section (1, 2, ...): purple, with a rule under it, kept on the page with a good start of what follows. `numbered: false` when
     * the title has its own number ("Part 1: ..."); its headings are numbered under it all the same (1.1, 1.2, ...).
     */
    section(text, { numbered = true } = {}) {
      doc.room(60);
      sectionNumber += 1;
      headingNumber = 0;
      font(14, "bold", BRAND_DARK);
      pdf.text(numbered ? `${sectionNumber}. ${plain(text)}` : plain(text), margin, y, { baseline: "middle" });
      pdf.setDrawColor(BRAND);
      pdf.setLineWidth(0.35);
      pdf.line(margin, y + 3.6, margin + roomWidth, y + 3.6);
      y += 10;
    },
    /**
     * A heading: numbered under its section (1.1, 1.2, ...) when there is one, unless `numbered: false`. Kept on the page with the
     * start of what follows.
     */
    heading(text, { numbered = true } = {}) {
      doc.room(26);
      headingNumber += 1;
      const number = numbered && sectionNumber ? `${sectionNumber}.${headingNumber} ` : "";
      font(11, "bold");
      pdf.text(`${number}${plain(text)}`, margin, y, { baseline: "middle" });
      y += 6.5;
    },
    paragraph(text, color = TEXT) {
      font(BODY, "normal", color);
      const lines = pdf.splitTextToSize(plain(text), roomWidth);
      doc.room(lines.length * lineHeight(BODY));
      font(BODY, "normal", color);
      pdf.text(lines, margin, y, { baseline: "middle", lineHeightFactor: LINE_FACTOR });
      y += lines.length * lineHeight(BODY) + 2.5;
    },
    /** A list with a purple bullet before each item; an item wraps under its own text. */
    bullets(items) {
      for (const item of items) {
        font(BODY);
        const lines = pdf.splitTextToSize(plain(item), roomWidth - 6);
        doc.room(lines.length * lineHeight(BODY) + 1.5);
        pdf.setFillColor(BRAND);
        pdf.circle(margin + 1.6, y, 0.75, "F");
        font(BODY);
        pdf.text(lines, margin + 5, y, { baseline: "middle", lineHeightFactor: LINE_FACTOR });
        y += lines.length * lineHeight(BODY) + 1.8;
      }
      y += 2;
    },
    /**
     * A table: a tinted header row, striped rows, thin rules. Without `widths` the columns share the room by the length of their
     * texts. The columns in `mono` hold names (Courier). A row never breaks over two pages; a new page starts with the header again.
     */
    table(heads, rows, { widths, mono = [] } = {}) {
      const size = 9;
      const pad = 1.6;
      const step = lineHeight(size);
      if (!widths) {
        // Courier is wider than Helvetica: a column of names needs about a third more room for the same letters
        const weights = heads.map((head, index) => Math.min(60, Math.max(10, plain(head).length, ...rows.map((row) => plain(row[index]).length))) * (mono.includes(index) ? 1.35 : 1));
        const sum = weights.reduce((total, weight) => total + weight, 0);
        widths = weights.map((weight) => (roomWidth * weight) / sum);
      } else {
        const sum = widths.reduce((total, width) => total + width, 0);
        widths = widths.map((width) => (roomWidth * width) / sum);
      }
      const cellFont = (index, header) => font(size, header ? "bold" : "normal", header ? BRAND_DARK : TEXT, mono.includes(index) && !header ? "courier" : "helvetica");
      const draw = (values, header, stripe) => {
        const cells = values.map((value, index) => {
          cellFont(index, header);
          return pdf.splitTextToSize(plain(value), widths[index] - pad * 2);
        });
        const lines = Math.max(...cells.map((cell) => cell.length));
        const height = lines * step + pad * 2;
        const before = pages;
        doc.room(height);
        if (pages !== before && !header) draw(heads, true, false);
        if (header || stripe) {
          pdf.setFillColor(header ? TINT : STRIPE);
          pdf.rect(margin, y, roomWidth, height, "F");
        }
        let x = margin;
        cells.forEach((cell, index) => {
          cellFont(index, header);
          pdf.text(cell, x + pad, y + pad + step / 2, { baseline: "middle", lineHeightFactor: LINE_FACTOR });
          x += widths[index];
        });
        pdf.setDrawColor(header ? BRAND : RULE);
        pdf.setLineWidth(header ? 0.4 : 0.15);
        pdf.line(margin, y + height, margin + roomWidth, y + height);
        y += height;
      };
      draw(heads, true, false);
      rows.forEach((values, index) => draw(values, false, index % 2 === 1));
      y += 6;
    },
    /**
     * Blocks, one a group: a tinted bar with the name, then two labelled lines: the tables (Courier) and the relations, one a line
     * with a bullet. `head` gives the labels ([_, "Tables", "Main relations"]); `groups` is [{ group, tables, relations: [..] }].
     * A block never breaks over two pages.
     */
    groups(head, groups) {
      const label = 34;
      const step = lineHeight(BODY);
      for (const { group, tables, relations } of groups) {
        font(BODY, "normal", TEXT, "courier");
        const tableLines = pdf.splitTextToSize(plain(tables), roomWidth - label - 4);
        font(BODY);
        const relationLines = relations.map((relation) => pdf.splitTextToSize(plain(relation), roomWidth - label - 8));
        const height = 8 + 3 + tableLines.length * step + 2.5 + relationLines.reduce((sum, lines) => sum + lines.length * step + 1.2, 0) + 4;
        doc.room(height);
        pdf.setFillColor(TINT);
        pdf.rect(margin, y, roomWidth, 8, "F");
        pdf.setFillColor(BRAND);
        pdf.rect(margin, y, 1.4, 8, "F");
        font(10.5, "bold", BRAND_DARK);
        pdf.text(plain(group), margin + 5, y + 4, { baseline: "middle" });
        y += 8 + 3;
        font(SMALL, "bold", MUTED);
        pdf.text(plain(head[1]).toUpperCase(), margin + 5, y + step / 2, { baseline: "middle" });
        font(BODY, "normal", TEXT, "courier");
        pdf.text(tableLines, margin + label, y + step / 2, { baseline: "middle", lineHeightFactor: LINE_FACTOR });
        y += tableLines.length * step + 2.5;
        font(SMALL, "bold", MUTED);
        pdf.text(plain(head[2]).toUpperCase(), margin + 5, y + step / 2, { baseline: "middle" });
        relationLines.forEach((lines) => {
          pdf.setFillColor(BRAND);
          pdf.circle(margin + label + 1.2, y + step / 2, 0.7, "F");
          font(BODY);
          pdf.text(lines, margin + label + 4.5, y + step / 2, { baseline: "middle", lineHeightFactor: LINE_FACTOR });
          y += lines.length * step + 1.2;
        });
        y += 1;
        pdf.setDrawColor(RULE);
        pdf.setLineWidth(0.2);
        pdf.line(margin, y, margin + roomWidth, y);
        y += 4;
      }
      y += 3;
    },
    /** A sketch in a monospaced font, line by line as written, in a light box. */
    pre(text) {
      const size = 8.5;
      const lines = censor(text).split("\n");
      const height = lines.length * lineHeight(size) + 6;
      doc.room(height);
      pdf.setFillColor(BOX);
      pdf.setDrawColor(RULE);
      pdf.setLineWidth(0.2);
      pdf.rect(margin, y, roomWidth, height, "FD");
      font(size, "normal", TEXT, "courier");
      pdf.text(lines, margin + 4, y + 3 + lineHeight(size) / 2, { baseline: "middle", lineHeightFactor: LINE_FACTOR });
      y += height + 6;
    },
    /**
     * A picture (a canvas `scale` times the size of the drawing in CSS px, 96 per inch), centred, never larger than drawn and never
     * wider than the page. It goes on a new page when it does not fit the rest of this one; a picture taller than a whole page is
     * made smaller to fit one.
     */
    image(picture, scale, maxHeight = Infinity) {
      let { width, height } = doc.imageSize(picture, scale);
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      if (y + height > bottom) doc.newPage();
      const x = margin + (roomWidth - width) / 2;
      if (pdf.addCanvas) pdf.addCanvas(picture, x, y, width, height);
      else pdf.addImage(picture.toDataURL("image/jpeg", 0.95), "JPEG", x, y, width, height);
      y += height + 4;
    },
    /** The size (mm) `image` gives a picture: as drawn, at most the width of the page and the height of a whole page. */
    imageSize(picture, scale) {
      let width = Math.min((picture.width / scale) * (25.4 / 96), roomWidth);
      let height = (width * picture.height) / picture.width;
      if (height > bottom - top) {
        height = bottom - top;
        width = (height * picture.width) / picture.height;
      }
      return { width, height };
    },
    /** The shapes of erLayout.js in a thin frame, as large as the rest of the page allows. */
    drawing(diagram) {
      const pad = 4;
      const scale = Math.min((roomWidth - pad * 2) / diagram.width, (bottom - y - pad * 2) / diagram.height);
      const frameHeight = diagram.height * scale + pad * 2;
      pdf.setDrawColor(RULE);
      pdf.setLineWidth(0.25);
      pdf.rect(margin, y, roomWidth, frameHeight, "S");
      const left = margin + (roomWidth - diagram.width * scale) / 2;
      const origin = y + pad;
      const X = (x) => left + x * scale;
      const Y = (value) => origin + value * scale;
      for (const shape of diagram.shapes) {
        if (shape.kind === "rect") {
          if (shape.fill) pdf.setFillColor(shape.fill);
          if (shape.stroke) {
            pdf.setDrawColor(shape.stroke);
            pdf.setLineWidth((shape.width ?? 1) * scale);
          }
          pdf.rect(X(shape.x), Y(shape.y), shape.w * scale, shape.h * scale, shape.fill && shape.stroke ? "FD" : shape.fill ? "F" : "S");
        } else if (shape.kind === "line") {
          pdf.setDrawColor(shape.stroke);
          pdf.setLineWidth((shape.width ?? 1) * scale);
          pdf.setLineDashPattern(shape.dash ? shape.dash.map((value) => value * scale) : [], 0);
          for (let i = 1; i < shape.points.length; i += 1) {
            const [a, b] = [shape.points[i - 1], shape.points[i]];
            pdf.line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]));
          }
          pdf.setLineDashPattern([], 0);
        } else if (shape.kind === "circle") {
          pdf.setFillColor(shape.fill);
          pdf.setDrawColor(shape.stroke);
          pdf.setLineWidth((shape.width ?? 1) * scale);
          pdf.circle(X(shape.cx), Y(shape.cy), shape.r * scale, "FD");
        } else if (shape.kind === "text") {
          font(shape.size * scale * PT_PER_MM, fontStyle(shape), shape.color);
          const align = shape.anchor === "middle" ? "center" : shape.anchor === "end" ? "right" : "left";
          pdf.text(shape.text, X(shape.x), Y(shape.y), { align, baseline: "middle" });
        }
      }
      y += frameHeight + 4;
    },
    /** Writes "page / pages" in the footer of every page, then saves the file. */
    save(fileName) {
      const stamp = (target, page, total) => {
        target.setFont("helvetica", "normal");
        target.setFontSize(SMALL);
        target.setTextColor(MUTED);
        target.text(`${page} / ${total}`, pageWidth - margin, pageHeight - margin + 2, { baseline: "middle", align: "right" });
      };
      if (pdf.stampPages) {
        pdf.stampPages(stamp);
      } else {
        const total = pdf.internal.getNumberOfPages();
        for (let page = 1; page <= total; page += 1) {
          pdf.setPage(page);
          stamp(pdf, page, total);
        }
      }
      pdf.save(fileName);
    },
  };
  return doc;
}
