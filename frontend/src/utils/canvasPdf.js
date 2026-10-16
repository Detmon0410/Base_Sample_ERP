/**
 * A PDF whose pages are drawn by the browser: the Japanese PDF of the ER diagram and of the DB relations. The built-in fonts of a
 * PDF have no Japanese, so the text is drawn on a canvas with the fonts of the browser (as the invoices do, utils/pdf.js), and each
 * page goes into the PDF as a picture. It answers the few jsPDF calls textPdf.js makes (in mm and pt, as jsPDF), so the English and
 * the Japanese PDF share one layout. The price: the text of the Japanese PDF cannot be selected or searched.
 */
const MM_PER_PT = 25.4 / 72;
const MONO = '"Courier New", Courier, monospace';
const FONT = '"Helvetica Neue", Arial, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", Meiryo, "Noto Sans JP", sans-serif';
const LINE_HEIGHT = 1.15; // as jsPDF
/** A character that may start a new line by itself (Japanese has no spaces between words). */
const isWide = (char) => char.codePointAt(0) > 0x2e80;

/** `JsPDF` is the class of jsPDF; `pxPerMm` the sharpness of the pictures (10 px/mm is about 250 dpi). */
export function createCanvasPdf(JsPDF, { format = "a3", orientation = "landscape", pxPerMm = 10 } = {}) {
  const pdf = new JsPDF({ unit: "mm", format, orientation });
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  const state = { fontSize: 16, family: "helvetica", style: "normal", text: "#000000", draw: "#000000", fill: "#000000", lineWidth: 0.2, dash: [] };
  let canvas = null;
  let context = null;
  let pages = 0;

  const newPage = () => {
    canvas = document.createElement("canvas");
    canvas.width = Math.round(width * pxPerMm);
    canvas.height = Math.round(height * pxPerMm);
    context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(pxPerMm, pxPerMm); // draw in mm, as jsPDF
    context.lineCap = "butt";
    context.lineJoin = "round";
  };
  const flush = () => {
    if (pages > 0) pdf.addPage(format, orientation);
    pdf.addImage(canvas, "PNG", 0, 0, width, height, undefined, "FAST");
    pages += 1;
  };
  const font = () => {
    const italic = state.style.includes("italic") ? "italic " : "";
    const bold = state.style.includes("bold") ? "bold " : "";
    return `${italic}${bold}${state.fontSize * MM_PER_PT}px ${state.family === "courier" ? MONO : FONT}`;
  };
  const stroke = () => {
    context.strokeStyle = state.draw;
    context.lineWidth = state.lineWidth;
    context.setLineDash(state.dash);
    context.stroke();
  };
  newPage();

  const doc = {
    internal: { pageSize: { getWidth: () => width, getHeight: () => height } },
    setProperties: (properties) => pdf.setProperties(properties),
    setFont: (family, style = "normal") => void Object.assign(state, { family, style }),
    setFontSize: (size) => void (state.fontSize = size),
    setTextColor: (color) => void (state.text = color),
    setDrawColor: (color) => void (state.draw = color),
    setFillColor: (color) => void (state.fill = color),
    setLineWidth: (lineWidth) => void (state.lineWidth = lineWidth),
    /** A dashed line, as jsPDF: [dash, gap] in mm; [] is a full line. */
    setLineDashPattern: (pattern) => void (state.dash = pattern),

    rect(x, y, w, h, style = "S") {
      context.beginPath();
      context.rect(x, y, w, h);
      if (style.includes("F")) {
        context.fillStyle = state.fill;
        context.fill();
      }
      if (style.includes("D") || style === "S") stroke();
    },
    line(x1, y1, x2, y2) {
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      stroke();
    },
    circle(x, y, r, style = "S") {
      context.beginPath();
      context.arc(x, y, r, 0, Math.PI * 2);
      if (style.includes("F")) {
        context.fillStyle = state.fill;
        context.fill();
      }
      if (style.includes("D") || style === "S") stroke();
    },
    /** One text or a list of lines; `align` left, center or right; `baseline` "middle" or the alphabetic line. */
    text(value, x, y, { align = "left", baseline, lineHeightFactor = LINE_HEIGHT } = {}) {
      context.font = font();
      context.fillStyle = state.text;
      context.textAlign = align === "center" ? "center" : align === "right" ? "right" : "left";
      context.textBaseline = baseline === "middle" ? "middle" : "alphabetic";
      const step = state.fontSize * MM_PER_PT * lineHeightFactor;
      (Array.isArray(value) ? value : [value]).forEach((line, index) => context.fillText(line, x, y + index * step));
    },
    /** Breaks a text into lines no wider than `maxWidth` mm: at a space, or between two Japanese characters. */
    splitTextToSize(value, maxWidth) {
      context.font = font();
      const tokens = String(value).match(/[⺀-￿]|[^\s⺀-￿]+\s*|\s+/g) ?? [""];
      const lines = [];
      let line = "";
      for (const token of tokens) {
        const next = line + token;
        if (line && context.measureText(next.trimEnd()).width > maxWidth && (isWide(token) || /^\S/.test(token))) {
          lines.push(line.trimEnd());
          line = token.trimStart();
        } else {
          line = next;
        }
      }
      lines.push(line.trimEnd());
      return lines;
    },
    addPage() {
      flush();
      newPage();
    },
    save(fileName) {
      flush();
      pdf.save(fileName);
    },
  };
  return doc;
}
