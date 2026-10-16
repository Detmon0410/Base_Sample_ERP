/**
 * The A3 landscape PDF of the ER diagram and of the DB relations, in the language of the page: a header, headings, paragraphs,
 * tables (a long one goes on over the next page), monospaced sketches and the drawing of erLayout.js. In English it is made of real
 * lines and text (Helvetica), so it stays sharp and its text can be searched; the built-in fonts of a PDF have no Japanese, so in
 * Japanese the same pages are drawn by the browser and put in as pictures (canvasPdf.js). jsPDF is loaded only when it is used.
 * The `code` and **bold** marks of the .md texts are left out.
 */
const PT_PER_MM = 72 / 25.4;
const TEXT = "#1f2328";
const MUTED = "#5b6168";
const LINE = 4.6; // mm between two lines of a table or a paragraph (10 pt)

/** A text of the .md without its marks: `code` and **bold**. */
export const plain = (text) => String(text).replace(/\*\*/g, "").replace(/`/g, "");

const fontStyle = (shape) => (shape.bold && shape.italic ? "bolditalic" : shape.bold ? "bold" : shape.italic ? "italic" : "normal");

export async function createTextPdf(language) {
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
  const bottom = pageHeight - margin;
  let y = margin;
  let pages = 1;

  const font = (size, style = "normal", color = TEXT, family = "helvetica") => {
    pdf.setFont(family, style);
    pdf.setFontSize(size);
    pdf.setTextColor(color);
  };
  const doc = {
    pdf,
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
      pdf.addPage("a3", "landscape");
      pages += 1;
      y = margin + 4;
    },
    /** Starts a new page when `height` mm do not fit any more on this one. */
    room(height) {
      if (y + height > bottom) doc.newPage();
    },
    /** The title of a page and the line under it. */
    header(title, subtitle) {
      if (pages > 1 || y > margin) doc.newPage();
      font(18, "bold");
      pdf.text(title, margin, margin + 4, { baseline: "middle" });
      font(10, "normal", MUTED);
      pdf.text(subtitle, margin, margin + 11, { baseline: "middle" });
      y = margin + 24;
    },
    /** A heading, kept on the page with the start of what follows it. */
    heading(text, size = 13) {
      doc.room(30);
      font(size, "bold");
      pdf.text(plain(text), margin, y, { baseline: "middle" });
      y += size >= 14 ? 9 : 7;
    },
    paragraph(text, prefix = "") {
      font(10);
      const lines = pdf.splitTextToSize(prefix + plain(text), roomWidth);
      doc.room(lines.length * LINE);
      pdf.text(lines, margin, y, { baseline: "middle", lineHeightFactor: LINE / (10 / PT_PER_MM) });
      y += lines.length * LINE + 1.6;
    },
    /**
     * A table. Without `widths` the columns share the room by the length of their texts. A row never breaks over two pages, and the
     * header row is written again at the top of a new page.
     */
    table(heads, rows, widths) {
      if (!widths) {
        const weights = heads.map((head, index) => Math.min(70, Math.max(12, plain(head).length, ...rows.map((row) => plain(row[index]).length))));
        const sum = weights.reduce((total, weight) => total + weight, 0);
        widths = weights.map((weight) => (roomWidth * weight) / sum);
      }
      const draw = (values, bold) => {
        font(10, bold ? "bold" : "normal");
        const cells = values.map((value, index) => pdf.splitTextToSize(plain(value), widths[index] - 4));
        const lines = Math.max(...cells.map((cell) => cell.length));
        const height = (lines - 1) * LINE + 7.6;
        const before = pages;
        doc.room(height);
        if (pages !== before && !bold) draw(heads, true);
        font(10, bold ? "bold" : "normal");
        let x = margin;
        cells.forEach((cell, index) => {
          pdf.text(cell, x + 2, y, { baseline: "middle", lineHeightFactor: LINE / (10 / PT_PER_MM) });
          x += widths[index];
        });
        const under = y + (lines - 1) * LINE + 3.4;
        pdf.setDrawColor(bold ? MUTED : "#e3e4e8");
        pdf.setLineWidth(bold ? 0.3 : 0.2);
        pdf.line(margin, under, margin + roomWidth, under);
        y = under + 4.2;
      };
      draw(heads, true);
      rows.forEach((values) => draw(values, false));
      y += 6;
    },
    /** A sketch in a monospaced font, line by line as written. */
    pre(text) {
      const lines = text.split("\n");
      doc.room(lines.length * LINE);
      font(10, "normal", TEXT, "courier");
      pdf.text(lines, margin, y, { baseline: "middle", lineHeightFactor: LINE / (10 / PT_PER_MM) });
      y += lines.length * LINE + 6;
    },
    /** The shapes of erLayout.js, as large as the rest of the page allows. */
    drawing(diagram) {
      const scale = Math.min(roomWidth / diagram.width, (bottom - y) / diagram.height);
      const left = (pageWidth - diagram.width * scale) / 2;
      const top = y;
      const X = (x) => left + x * scale;
      const Y = (value) => top + value * scale;
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
      y = top + diagram.height * scale;
    },
    save: (fileName) => pdf.save(fileName),
  };
  return doc;
}
