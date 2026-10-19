/**
 * Draws the mermaid code of a flow chart as SVG, in the colours of the app, and turns an SVG into a canvas for the PDF. mermaid is
 * loaded only when the first chart is drawn. The labels are SVG text (not HTML), so the browser can draw the SVG onto a canvas.
 */
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
      flowchart: { htmlLabels: false, curve: "basis", padding: 14, nodeSpacing: 40, rankSpacing: 46 },
      state: { padding: 10 },
      themeVariables: {
        fontFamily: FONT,
        fontSize: "14px",
        primaryColor: "#ecebf4",
        primaryBorderColor: "#6a69a0",
        primaryTextColor: "#1f2328",
        secondaryColor: "#f5f5f8",
        tertiaryColor: "#ffffff",
        lineColor: "#4f4e80",
        textColor: "#1f2328",
        edgeLabelBackground: "#ffffff",
        clusterBkg: "#f7f7fa",
      },
    });
    return mermaid;
  });
  return loading;
}

/**
 * The area of an SVG set to its drawing: with SVG text labels mermaid computes the viewBox from a wrong place (the drawing goes past
 * its right side), so the drawing is measured in the page, out of sight, and the viewBox and the width are set from it.
 */
function fitToDrawing(svg) {
  const holder = document.createElement("div");
  holder.style.cssText = "position:absolute;left:-10000px;top:0;visibility:hidden;";
  holder.innerHTML = svg;
  document.body.append(holder);
  try {
    const node = holder.querySelector("svg");
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
  const { svg } = await mermaid.render(`flow-chart-${count}`, code);
  return fitToDrawing(svg);
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
