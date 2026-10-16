import { plain } from "./dbRelations";

/**
 * Saves the ER diagram page as a PDF file (A3 landscape), in the language of the page: page 1 is the drawing, page 2 the
 * relationships (with their delete rules), the unique keys with a detail, the notes and the rules across tables.
 * In English it is made of real lines and text (Helvetica), so it stays sharp at any zoom and its text can be searched. The built-in
 * fonts of a PDF have no Japanese, so in Japanese the same pages are drawn by the browser and put in as pictures (canvasPdf.js).
 * jsPDF is loaded only when this is called.
 */
const PT_PER_MM = 72 / 25.4;
/** The ends of a relationship in the table of the PDF: 1, 0..1, 1..N, 0..N. */
export const CARDINALITY = { one: "1", zeroOne: "0..1", oneMany: "1..N", zeroMany: "0..N" };
const TEXT = "#1f2328";
const MUTED = "#5b6168";

const fontStyle = (shape) => (shape.bold && shape.italic ? "bolditalic" : shape.bold ? "bold" : shape.italic ? "italic" : "normal");

/** Draws the shapes of erLayout.js at `left`, `top` (mm), `scale` mm for one unit of the drawing. */
function drawShapes(pdf, shapes, left, top, scale) {
  const X = (x) => left + x * scale;
  const Y = (y) => top + y * scale;
  for (const shape of shapes) {
    if (shape.kind === "rect") {
      if (shape.fill) pdf.setFillColor(shape.fill);
      if (shape.stroke) {
        pdf.setDrawColor(shape.stroke);
        pdf.setLineWidth((shape.width ?? 1) * scale);
      }
      const style = shape.fill && shape.stroke ? "FD" : shape.fill ? "F" : "S";
      pdf.rect(X(shape.x), Y(shape.y), shape.w * scale, shape.h * scale, style);
    } else if (shape.kind === "line") {
      pdf.setDrawColor(shape.stroke);
      pdf.setLineWidth((shape.width ?? 1) * scale);
      for (let i = 1; i < shape.points.length; i += 1) {
        const [a, b] = [shape.points[i - 1], shape.points[i]];
        pdf.line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]));
      }
    } else if (shape.kind === "circle") {
      pdf.setFillColor(shape.fill);
      pdf.setDrawColor(shape.stroke);
      pdf.setLineWidth((shape.width ?? 1) * scale);
      pdf.circle(X(shape.cx), Y(shape.cy), shape.r * scale, "FD");
    } else if (shape.kind === "text") {
      pdf.setFont("helvetica", fontStyle(shape));
      pdf.setFontSize(shape.size * scale * PT_PER_MM);
      pdf.setTextColor(shape.color);
      const align = shape.anchor === "middle" ? "center" : shape.anchor === "end" ? "right" : "left";
      pdf.text(shape.text, X(shape.x), Y(shape.y), { align, baseline: "middle" });
    }
  }
}

/**
 * Everything comes in the language of the PDF, ready to write:
 *   `diagram`          buildDiagram(language) of erLayout.js
 *   `texts`            { title, subtitle, relationshipsTitle, columns: [6 headers], uniqueDetails, notesTitle, notes: [..],
 *                        rulesTitle, rulesColumns: [3] }
 *   `relationshipRows` [parent, child, foreign key, "1 : 0..N", meaning, delete rule] for each relationship
 *   `uniqueDetails`    ["User.email (lower-cased)", ...]
 *   `ruleRows`         [event, tables written, rule] for each rule across tables
 * The `code` marks of the cells are left out.
 */
export async function downloadErDiagramPdf({ language, diagram, texts, relationshipRows, uniqueDetails, ruleRows, fileName }) {
  const { jsPDF } = await import("jspdf");
  let pdf;
  if (String(language).startsWith("ja")) {
    const { createCanvasPdf } = await import("./canvasPdf");
    pdf = createCanvasPdf(jsPDF, { format: "a3", orientation: "landscape" });
  } else {
    pdf = new jsPDF({ unit: "mm", format: "a3", orientation: "landscape" });
  }
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const roomWidth = pageWidth - margin * 2;
  pdf.setProperties({ title: texts.title, subject: texts.subtitle });

  const header = (title) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(TEXT);
    pdf.text(title, margin, margin + 4, { baseline: "middle" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(MUTED);
    pdf.text(texts.subtitle, margin, margin + 11, { baseline: "middle" });
  };
  let y = 0;
  const title = (text) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(TEXT);
    pdf.text(text, margin, y, { baseline: "middle" });
    y += 7;
  };
  /** A table: the widths (mm) add up to the room of the page; a long cell wraps onto more lines, 4.6 mm apart. */
  const table = (heads, rows, widths) => {
    const line = 4.6;
    const draw = (values, bold) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(TEXT);
      const cells = values.map((value, index) => pdf.splitTextToSize(plain(value), widths[index] - 4));
      const lines = Math.max(...cells.map((cell) => cell.length));
      let x = margin;
      cells.forEach((cell, index) => {
        pdf.text(cell, x + 2, y, { baseline: "middle", lineHeightFactor: line / (10 / PT_PER_MM) });
        x += widths[index];
      });
      const bottom = y + (lines - 1) * line + 3.4;
      pdf.setDrawColor(bold ? MUTED : "#e3e4e8");
      pdf.setLineWidth(bold ? 0.3 : 0.2);
      pdf.line(margin, bottom, margin + roomWidth, bottom);
      y = bottom + 4.2;
    };
    draw(heads, true);
    rows.forEach((values) => draw(values, false));
    y += 6;
  };

  // page 1: the drawing, as large as the page allows
  header(texts.title);
  const top = margin + 18;
  const scale = Math.min(roomWidth / diagram.width, (pageHeight - top - margin) / diagram.height);
  drawShapes(pdf, diagram.shapes, (pageWidth - diagram.width * scale) / 2, top, scale);

  // page 2: the relationships with their delete rules, the unique keys with a detail, the notes, the rules across tables
  pdf.addPage("a3", "landscape");
  header(texts.relationshipsTitle);
  y = margin + 24;
  table(texts.columns, relationshipRows, [62, 62, 45, 32, 40, roomWidth - 241]);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(TEXT);
  const details = pdf.splitTextToSize(`${texts.uniqueDetails} ${uniqueDetails.map(plain).join("; ")}`, roomWidth);
  pdf.text(details, margin, y - 4, { baseline: "middle" });
  y += details.length * 4.6 + 6;
  title(texts.notesTitle);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  for (const note of texts.notes) {
    const lines = pdf.splitTextToSize(`- ${note}`, roomWidth);
    pdf.text(lines, margin, y, { baseline: "middle" });
    y += lines.length * 4.6 + 1.6;
  }
  y += 6;
  title(texts.rulesTitle);
  table(texts.rulesColumns, ruleRows, [80, 110, roomWidth - 190]);

  pdf.save(fileName);
}
