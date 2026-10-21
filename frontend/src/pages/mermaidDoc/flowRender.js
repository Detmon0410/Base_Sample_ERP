/**
 * Draws the mermaid code of a flow chart as SVG, in the colours of the app, and turns an SVG into a canvas for the PDF. mermaid is
 * loaded only when the first chart is drawn. The labels are SVG text (not HTML), so the browser can draw the SVG onto a canvas.
 */
import { drawable, lineLabelsOf } from "./flowLabels";

const FONT = '"Helvetica Neue", Arial, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", "Yu Gothic", Meiryo, "Noto Sans JP", sans-serif';

let loading = null;
function mermaidApi() {
  loading ??= import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      fontFamily: FONT,
      htmlLabels: false,
      // wrappingWidth: a box breaks its text only where the .md breaks it (<br/>), not again in the middle of a line
      flowchart: { htmlLabels: false, curve: "stepAfter", padding: 14, nodeSpacing: 44, rankSpacing: 64, wrappingWidth: 400 },
      themeCSS:
        ".edgeLabel rect.background, .edgeLabel rect { fill: #ffffff !important; opacity: 1 !important; fill-opacity: 0.95 !important; stroke: none; } " +
        ".node.startEnd rect, .node.startEnd path { fill: #1e1e1e !important; stroke: #1e1e1e !important; } " +
        ".node.startEnd text { fill: #ffffff !important; font-weight: 600 !important; } " +
        ".node.action rect, .node.action path { fill: #f3e8ff !important; stroke: #a855f7 !important; } " +
        ".node.action text { fill: #1e293b !important; } " +
        ".node.decision polygon, .node.decision path { fill: #e0f2fe !important; stroke: #0284c7 !important; } " +
        ".node.decision text { fill: #1e293b !important; } " +
        ".node.error rect, .node.error path { fill: #fee2e2 !important; stroke: #ef4444 !important; } " +
        ".node.error text { fill: #991b1b !important; }",
      state: { padding: 10 },
      themeVariables: {
        fontFamily: FONT,
        fontSize: "14px",
        primaryColor: "#e6f3fa",
        primaryBorderColor: "#0085c8",
        primaryTextColor: "#1f2328",
        secondaryColor: "#f3f9fc",
        tertiaryColor: "#ffffff",
        lineColor: "#006ba3",
        textColor: "#1f2328",
        edgeLabelBackground: "#ffffff",
        clusterBkg: "#f3f9fc",
      },
    });
    return mermaid;
  });
  return loading;
}

/**
 * The label of each line back in the lines of the .md: mermaid breaks the label of a line again at 200 px whatever the settings
 * ("progress, evidence, stock" / "changes,"). Each label is found by its text (`lines`: the labels of the lines of the chart, each
 * as its lines) and written again row for row; its white box is set to the new size, the text kept in the middle.
 */
function unwrapLineLabels(node, lines) {
  const squash = (text) => text.replace(/\s+/g, "");
  for (const text of node.querySelectorAll(".edgeLabel text")) {
    const rows = [...text.children].filter((child) => child.classList.contains("text-outer-tspan"));
    if (rows.length < 2) continue;
    const wanted = lines.find((label) => squash(label.join("")) === squash(rows.map((row) => row.textContent).join("")));
    if (!wanted || wanted.length === rows.length) continue;
    const before = text.getBBox();
    rows.forEach((row, index) => (index < wanted.length ? (row.textContent = wanted[index]) : row.remove()));
    const after = text.getBBox();
    const shift = (before.y + before.height / 2) - (after.y + after.height / 2);
    text.setAttribute("transform", `translate(0, ${shift})`);
    const box = text.parentNode.querySelector("rect.background");
    if (box) {
      box.setAttribute("x", String(after.x - 2));
      box.setAttribute("y", String(after.y + shift - 1));
      box.setAttribute("width", String(after.width + 4));
      box.setAttribute("height", String(after.height + 2));
    }
  }
}

/**
 * The area of an SVG set to its drawing: with SVG text labels mermaid computes the viewBox from a wrong place (the drawing goes past
 * its right side), so the drawing is measured in the page, out of sight, and the viewBox and the width are set from it.
 */
function fitToDrawing(svg, lines = []) {
  const holder = document.createElement("div");
  holder.style.cssText = "position:absolute;left:-10000px;top:0;visibility:hidden;";
  holder.innerHTML = svg;
  document.body.append(holder);
  try {
    const node = holder.querySelector("svg");
    unwrapLineLabels(node, lines);
    const box = node.getBBox(); // all of the drawing (a sequence or ER chart is not in one first group)
    const pad = 8;
    const width = box.width + pad * 2;
    const height = box.height + pad * 2;
    node.setAttribute("viewBox", `${box.x - pad} ${box.y - pad} ${width} ${height}`);
    node.setAttribute("style", `max-width: ${width}px;`);
    return node.outerHTML;
  } finally {
    holder.remove();
  }
}

let count = 0;
/** The SVG (a string) of one chart, its area set to the drawing. */
export async function renderChart(code) {
  const mermaid = await mermaidApi();
  count += 1;
  const { svg } = await mermaid.render(`flow-chart-${count}`, drawable(code));
  return fitToDrawing(svg, lineLabelsOf(code));
}

/** The SVG of a chart drawn on a white canvas `scale` times its size (for the PDF). */
export async function svgToCanvas(svg, scale = 3) {
  const node = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
  const [, , width, height] = (node.getAttribute("viewBox") ?? "0 0 800 600").split(/\s+/).map(Number);
  node.setAttribute("width", String(width));
  node.setAttribute("height", String(height));
  node.removeAttribute("style"); // mermaid sets a max-width for the page
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(node)], { type: "image/svg+xml" }));
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}
