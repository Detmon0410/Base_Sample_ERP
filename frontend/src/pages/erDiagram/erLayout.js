import { ENTITIES, hasNoKey, RELATIONSHIPS } from "./erModel";
import { inLanguage } from "@/i18n/mdJa";

/**
 * Turns the model of erModel.js into a list of plain shapes (rect, line, circle, text) in one coordinate space. The page draws the
 * shapes as SVG and the PDF draws the same shapes with jsPDF, so the two are always the same drawing.
 *
 * Text `y` is the middle of the line of text (SVG dominant-baseline "central", jsPDF baseline "middle"). The words of the .md (labels,
 * notes of the columns, the key of the notation) follow the language of the page (mdJa.js); the names stay as they are.
 * A line with no database key (to ATTACHMENT) is dashed. Where two lines cross, the vertical one has a gap and the horizontal one
 * goes through it (a bridge), so the reader sees that they do not meet.
 */
export const BOX_WIDTH = 260;
export const HEADER = 28;
export const ROW = 20;
/** A note of the .md goes under its column in small italics, on as many lines of NOTE_LINE as it needs (wrapped in English). */
const NOTE_LINE = 12;
const NOTE_FONT = 9;
const NOTE_WIDTH = BOX_WIDTH - 58;
const PAD = 4;
export const WIDTH = 2090;
export const HEIGHT = 1290;
const DASH = [6, 4];

export const COLORS = {
  header: "#6a69a0", // the main purple of the app
  headerText: "#ffffff",
  border: "#4f4e80",
  rowLine: "#e3e4e8",
  text: "#1f2328",
  muted: "#5b6168",
  key: "#4b4a7d",
  line: "#3f4652",
  labelBg: "#ffffff",
  paper: "#ffffff",
};

const FONT = 11;
const LABEL_FONT = 10;
/** An estimate of the width of a text (Helvetica; a Japanese character is about as wide as it is high): the white box behind a label. */
const textWidth = (text, size) => [...text].reduce((width, char) => width + size * (char.codePointAt(0) > 0x2e80 ? 1 : 0.56), 0);

/** A text broken into lines no wider than `width`, at the spaces (Japanese also between characters). */
export function wrap(text, size, width) {
  const tokens = text.match(/[⺀-￿]|[^\s⺀-￿]+|\s+/g) ?? [];
  const lines = [];
  let line = "";
  for (const token of tokens) {
    const next = line + token;
    if (line.trim() && /\S/.test(token) && textWidth(next.trimEnd(), size) > width) {
      lines.push(line.trimEnd());
      line = token;
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}
/** The lines of the note of a column; the height of a row comes from the English note, so the drawing is the same in both languages. */
export const noteLines = (note) => (note ? wrap(note, NOTE_FONT, NOTE_WIDTH) : []);
const rowHeight = (column) => ROW + noteLines(column[3]).length * NOTE_LINE;
/** The top of every row of a table, and the bottom of the last one. */
const rowTops = (entity) => {
  const tops = [entity.y + HEADER];
  for (const column of entity.columns) tops.push(tops.at(-1) + rowHeight(column));
  return tops;
};
export const entityHeight = (entity) => rowTops(entity).at(-1) + PAD - entity.y;
export const entityBox = (entity) => ({ x: entity.x, y: entity.y, w: BOX_WIDTH, h: entityHeight(entity) });
/** The middle of the first line of a column (its name), where a line meets the table. */
const rowCenter = (entity, columnName) => {
  const index = entity.columns.findIndex(([name]) => name === columnName);
  if (index < 0) throw new Error(`${entity.name} has no column ${columnName}`);
  return rowTops(entity)[index] + ROW / 2;
};

const byName = new Map(ENTITIES.map((entity) => [entity.name, entity]));
export const entityOf = (name) => {
  const entity = byName.get(name);
  if (!entity) throw new Error(`No table ${name}`);
  return entity;
};

const OUT = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };

/**
 * Where a line meets a table: on the left or right side at the row of `column` (or at `y`), on the top or bottom side at the middle
 * (or at `x`). `out` is the direction from the table into the line.
 */
function anchor(entity, side, column, { x, y } = {}) {
  const box = entityBox(entity);
  const out = OUT[side];
  if (side === "left" || side === "right") return { point: [side === "left" ? box.x : box.x + box.w, y ?? rowCenter(entity, column)], out };
  return { point: [x ?? box.x + box.w / 2, side === "top" ? box.y : box.y + box.h], out };
}

/** The corners of the line of one relationship, from the parent to the child. */
export function routeOf(relationship) {
  const parent = entityOf(relationship.parent);
  const child = entityOf(relationship.child);
  const { route } = relationship;
  const pk = parent.columns.find(([, , keys = ""]) => keys.split(",").includes("PK"))[0];
  const start = anchor(parent, route.from, pk, { x: route.fromX, y: route.fromY });
  const end = anchor(child, route.to, relationship.fk, { x: route.toX, y: route.toY });
  let middle = [];
  if (route.via) middle = route.via;
  else if (route.lane !== undefined) middle = [[route.lane, start.point[1]], [route.lane, end.point[1]]];
  // the part next to a table leaves it straight: add the corner that lines `via` up with an end that sits on a row
  const corner = (side, point, next) => {
    if (point[0] === next[0] || point[1] === next[1]) return [];
    return side === "left" || side === "right" ? [[next[0], point[1]]] : [[point[0], next[1]]];
  };
  if (middle.length) {
    middle = [...corner(route.from, start.point, middle[0]), ...middle];
    middle = [...middle, ...corner(route.to, end.point, middle.at(-1)).reverse()];
  }
  return { start, end, points: [start.point, ...middle, end.point] };
}

/**
 * The crow's foot at one end of a line: the most (a bar for one, three legs for many) next to the table, then the least (a bar for
 * one, a circle for zero).
 */
function endMarks(point, out, end) {
  const [px, py] = point;
  const [dx, dy] = out;
  const [nx, ny] = [-dy, dx]; // across the line
  const at = (distance, across = 0) => [px + dx * distance + nx * across, py + dy * distance + ny * across];
  const shapes = [];
  const bar = (distance) => shapes.push({ kind: "line", points: [at(distance, -7), at(distance, 7)], stroke: COLORS.line, width: 1.3 });
  const many = end === "oneMany" || end === "zeroMany";
  if (many) {
    shapes.push({ kind: "line", points: [at(0, -8), at(12), at(0, 8)], stroke: COLORS.line, width: 1.3 });
  } else {
    bar(8);
  }
  if (end === "one" || end === "oneMany") bar(many ? 17 : 14);
  else {
    const [cx, cy] = at(many ? 21 : 19);
    shapes.push({ kind: "circle", cx, cy, r: 4, fill: COLORS.paper, stroke: COLORS.line, width: 1.3 });
  }
  return shapes;
}

/** The label of a line: at `at` when the model gives it, else in the middle of the longest part of the line; on a white box. */
function labelOf(points, text, at) {
  let best = at ? { x: at[0], y: at[1] } : null;
  for (let i = 1; i < points.length && !at; i += 1) {
    const [a, b] = [points[i - 1], points[i]];
    const length = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    if (!best || length > best.length) best = { length, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 };
  }
  const w = textWidth(text, LABEL_FONT) + 6;
  return [
    { kind: "rect", x: best.x - w / 2, y: best.y - 7, w, h: 14, fill: COLORS.labelBg, label: true },
    { kind: "text", x: best.x, y: best.y, text, size: LABEL_FONT, color: COLORS.muted, anchor: "middle", italic: true },
  ];
}

function entityShapes(entity, tr) {
  const tops = rowTops(entity);
  const box = entityBox(entity);
  const shapes = [
    { kind: "rect", x: box.x, y: box.y, w: box.w, h: box.h, fill: COLORS.paper, stroke: COLORS.border, width: 1.2 },
    { kind: "rect", x: box.x, y: box.y, w: box.w, h: HEADER, fill: COLORS.header },
    { kind: "text", x: box.x + box.w / 2, y: box.y + HEADER / 2, text: entity.name, size: 12, bold: true, color: COLORS.headerText, anchor: "middle" },
  ];
  entity.columns.forEach(([name, type, keys = "", note], index) => {
    const top = tops[index];
    const middle = top + ROW / 2;
    if (index > 0) shapes.push({ kind: "line", points: [[box.x, top], [box.x + box.w, top]], stroke: COLORS.rowLine, width: 0.8 });
    if (keys) shapes.push({ kind: "text", x: box.x + 8, y: middle, text: keys, size: 9, bold: true, color: COLORS.key });
    shapes.push({ kind: "text", x: box.x + 50, y: middle, text: name, size: FONT, bold: keys.includes("PK"), color: COLORS.text });
    shapes.push({ kind: "text", x: box.x + box.w - 8, y: middle, text: type, size: 10, color: COLORS.muted, anchor: "end" });
    // the note in the language of the page, on the lines the English note takes (a Japanese note is shorter)
    wrap(tr(note ?? ""), NOTE_FONT, NOTE_WIDTH).forEach((line, index) => shapes.push({ kind: "text", x: box.x + 50, y: top + ROW + 3 + index * NOTE_LINE, text: line, size: NOTE_FONT, italic: true, color: COLORS.muted }));
  });
  // the border again, over the header and the rows
  shapes.push({ kind: "rect", x: box.x, y: box.y, w: box.w, h: box.h, stroke: COLORS.border, width: 1.2 });
  return shapes;
}

/** The key of the notation, in the empty space under CUSTOMER. */
function legendShapes(x, y, tr) {
  const shapes = [
    { kind: "rect", x, y, w: BOX_WIDTH, h: 200, fill: COLORS.paper, stroke: COLORS.rowLine, width: 1 },
    { kind: "text", x: x + 10, y: y + 15, text: tr("Notation (crow's foot)"), size: 11, bold: true, color: COLORS.text },
  ];
  const ends = [
    ["one", "exactly one"],
    ["zeroOne", "zero or one"],
    ["oneMany", "one or many"],
    ["zeroMany", "zero or many"],
  ];
  ends.forEach(([end, text], index) => {
    const lineY = y + 38 + index * 22;
    const tip = [x + 70, lineY];
    shapes.push({ kind: "line", points: [[x + 14, lineY], tip], stroke: COLORS.line, width: 1.3 });
    shapes.push(...endMarks(tip, [-1, 0], end));
    shapes.push({ kind: "rect", x: x + 70, y: lineY - 5, w: 6, h: 10, fill: COLORS.header });
    shapes.push({ kind: "text", x: x + 88, y: lineY, text: tr(text), size: 10, color: COLORS.text });
  });
  const dashedY = y + 38 + 4 * 22;
  shapes.push({ kind: "line", points: [[x + 14, dashedY], [x + 76, dashedY]], stroke: COLORS.line, width: 1.3, dash: DASH });
  shapes.push({ kind: "text", x: x + 88, y: dashedY, text: tr("no database key"), size: 10, color: COLORS.text });
  const keys = [
    ["PK", "primary key"],
    ["FK", "foreign key"],
    ["UK", "unique"],
    ["note", "note of the column", true],
  ];
  keys.forEach(([key, text, italic], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const keyX = x + 14 + column * 100;
    const keyY = y + 156 + row * 20;
    shapes.push(italic ? { kind: "text", x: keyX, y: keyY, text: tr(key), size: 9, italic: true, color: COLORS.muted } : { kind: "text", x: keyX, y: keyY, text: key, size: 9, bold: true, color: COLORS.key });
    shapes.push({ kind: "text", x: keyX + 26, y: keyY, text: tr(text), size: 10, color: COLORS.text });
  });
  return shapes;
}

/** Every point where a horizontal part of one line crosses a vertical part of another, inside both: [{ x, y, horizontal }]. */
export function crossings(routes) {
  const parts = routes.flatMap((route, line) => route.points.slice(1).map((point, index) => ({ line, a: route.points[index], b: point, dash: route.dash })));
  const inside = (value, a, b) => value > Math.min(a, b) && value < Math.max(a, b);
  const found = [];
  for (const h of parts) {
    if (h.a[1] !== h.b[1]) continue;
    for (const v of parts) {
      if (v.line === h.line || v.a[0] !== v.b[0]) continue;
      if (inside(v.a[0], h.a[0], h.b[0]) && inside(h.a[1], v.a[1], v.b[1])) found.push({ x: v.a[0], y: h.a[1], horizontal: h });
    }
  }
  return found;
}

/** A bridge: a gap in the vertical line, the horizontal line drawn again through it. */
function bridge({ x, y, horizontal }) {
  return [
    { kind: "rect", x: x - 3, y: y - 6, w: 6, h: 12, fill: COLORS.paper, bridge: true },
    { kind: "line", points: [[x - 7, y], [x + 7, y]], stroke: COLORS.line, width: 1.3, ...(horizontal.dash ? { dash: horizontal.dash } : {}) },
  ];
}

/** The whole drawing in `language` ("en" or "ja"): { width, height, shapes }. Lines first, then the tables on them, then the labels on top. */
export function buildDiagram(language = "en") {
  const tr = (text) => inLanguage(text, language);
  const lines = [];
  const labels = [];
  const routes = [];
  for (const relationship of RELATIONSHIPS) {
    const { start, end, points } = routeOf(relationship);
    const dash = hasNoKey(relationship) ? DASH : undefined;
    routes.push({ points, dash });
    lines.push({ kind: "line", points, stroke: COLORS.line, width: 1.3, ...(dash ? { dash } : {}) });
    lines.push(...endMarks(start.point, start.out, relationship.parentEnd), ...endMarks(end.point, end.out, relationship.childEnd));
    labels.push(...labelOf(points, tr(relationship.label), relationship.labelAt));
  }
  lines.push(...crossings(routes).flatMap(bridge));
  return {
    width: WIDTH,
    height: HEIGHT,
    shapes: [...lines, ...ENTITIES.flatMap((entity) => entityShapes(entity, tr)), ...labels, ...legendShapes(40, 220, tr)],
  };
}
