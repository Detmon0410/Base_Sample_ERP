import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildDiagram, crossings, entityBox, entityOf, HEIGHT, noteLines, routeOf, WIDTH, wrap } from "./erLayout";
import { ENTITIES, hasNoKey, NOTES, RELATIONSHIPS } from "./erModel";
import { inLanguage } from "@/i18n/mdJa";

// The ER diagram of the app is ProjectdocInfo/ER Diagram.md: the same tables, columns, notes, relationships and labels. And it must
// be readable, in English and in Japanese: no line through a table, no two lines crossing, no label on a table or on another label,
// everything on the paper.

const md = fs.readFileSync(path.resolve(import.meta.dirname, "../../../../ProjectdocInfo/ER Diagram.md"), "utf8");
const LEFT = { "||": "one", "o|": "zeroOne" };
const RIGHT = { "||": "one", "o|": "zeroOne", "|{": "oneMany", "o{": "zeroMany" };

/** The mermaid erDiagram of the .md, read: { entities: [{ name, columns: [[name, type, keys, note]] }], relationships, notes }. */
function readMd() {
  const entities = [];
  const relationships = [];
  let current = null;
  for (const line of md.split(/\r?\n/)) {
    const open = /^ {4}(\w+) \{$/.exec(line);
    const column = /^ {8}(\w+) (\w+)(?: ([A-Z]{2}(?:,[A-Z]{2})*))?(?: "([^"]*)")?$/.exec(line);
    const relation = /^ {4}(\w+) (\|\||o\|)--(\|\||o\||\|\{|o\{) (\w+) : "([^"]+)"$/.exec(line);
    if (open) entities.push((current = { name: open[1], columns: [] }));
    else if (/^ {4}\}$/.test(line)) current = null;
    else if (current && column) current.columns.push([column[2], column[1], column[3] ?? "", column[4] ?? ""]);
    else if (relation) relationships.push({ parent: relation[1], parentEnd: LEFT[relation[2]], childEnd: RIGHT[relation[3]], child: relation[4], label: relation[5] });
  }
  const notes = md
    .split("## Notes")[1]
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
  return { entities, relationships, notes };
}

const keysOf = (column) => (column[2] ?? "").split(",").filter(Boolean);
const segments = (points) => points.slice(1).map((point, i) => [points[i], point]);
const inside = ([x, y], box) => x > box.x && x < box.x + box.w && y > box.y && y < box.y + box.h;

describe("the ER model is ER Diagram.md", () => {
  const source = readMd();

  it("reads the .md (23 tables, 32 relationships, 7 notes)", () => {
    expect(source.entities).toHaveLength(23);
    expect(source.relationships).toHaveLength(32);
    expect(source.notes).toHaveLength(7);
  });

  it("has the tables of the .md, in its order, with the same columns, types, keys and notes", () => {
    const model = ENTITIES.map((entity) => ({ name: entity.name, columns: entity.columns.map(([name, type, keys = "", note = ""]) => [name, type, keys, note]) }));
    expect(model).toEqual(source.entities);
  });

  it("has the relationships of the .md, in its order, with the same ends and labels", () => {
    const model = RELATIONSHIPS.map(({ parent, child, parentEnd, childEnd, label }) => ({ parent, parentEnd, childEnd, child, label }));
    expect(model).toEqual(source.relationships);
  });

  it("writes the notes of the .md, word for word", () => {
    expect(NOTES).toEqual(source.notes);
  });

  it("draws each relationship to a column of the child: a foreign key, or owner_id of ATTACHMENT for its owner (no database key, dashed)", () => {
    for (const relationship of RELATIONSHIPS) {
      const column = entityOf(relationship.child).columns.find(([name]) => name === relationship.fk);
      expect(column, `${relationship.child}.${relationship.fk}`).toBeDefined();
      if (hasNoKey(relationship)) expect(relationship.fk).toBe("owner_id");
      expect(hasNoKey(relationship), `${relationship.child}.${relationship.fk}`).toBe(!keysOf(column).includes("FK"));
    }
    expect(RELATIONSHIPS.filter(hasNoKey).map((relationship) => relationship.child)).toEqual(["ATTACHMENT", "ATTACHMENT", "ATTACHMENT"]);
  });

  it("fits every Japanese note on the lines of the English note", () => {
    for (const entity of ENTITIES) {
      for (const [name, , , note] of entity.columns) {
        if (note) expect(wrap(inLanguage(note, "ja"), 9, 202).length, `${entity.name}.${name}`).toBeLessThanOrEqual(noteLines(note).length);
      }
    }
  });
});

describe("the drawing", () => {
  it("keeps every table on the paper and apart from the others", () => {
    const boxes = ENTITIES.map(entityBox);
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(20);
      expect(box.y).toBeGreaterThanOrEqual(20);
      expect(box.x + box.w).toBeLessThanOrEqual(WIDTH - 20);
      expect(box.y + box.h).toBeLessThanOrEqual(HEIGHT - 20);
    }
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const [a, b] = [boxes[i], boxes[j]];
        const apart = a.x + a.w + 40 <= b.x || b.x + b.w + 40 <= a.x || a.y + a.h + 40 <= b.y || b.y + b.h + 40 <= a.y;
        expect(apart, `${ENTITIES[i].name} and ${ENTITIES[j].name}`).toBe(true);
      }
    }
  });

  it("draws every line with straight parts only, leaving each table straight for the crow's foot", () => {
    const length = ([a, b]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
    for (const relationship of RELATIONSHIPS) {
      const name = `${relationship.parent} -> ${relationship.child}`;
      const parts = segments(routeOf(relationship).points);
      for (const [a, b] of parts) expect(a[0] === b[0] || a[1] === b[1], name).toBe(true);
      expect(length(parts[0]), name).toBeGreaterThanOrEqual(25);
      expect(length(parts.at(-1)), name).toBeGreaterThanOrEqual(25);
    }
  });

  it("never draws a line through a table", () => {
    const boxes = ENTITIES.map((entity) => [entity.name, entityBox(entity)]);
    for (const relationship of RELATIONSHIPS) {
      for (const [a, b] of segments(routeOf(relationship).points)) {
        const steps = Math.max(1, Math.ceil((Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])) / 2));
        for (const [name, box] of boxes) {
          for (let s = 0; s <= steps; s += 1) {
            const point = [a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps];
            expect(inside(point, box), `${relationship.parent} -> ${relationship.child} goes through ${name}`).toBe(false);
          }
        }
      }
    }
  });

  it("has no two lines that run on each other, and a bridge at each of the few crossings", () => {
    const all = RELATIONSHIPS.map((relationship) => ({ name: `${relationship.parent} -> ${relationship.child}`, parts: segments(routeOf(relationship).points) }));
    const overlapRange = (a1, a2, b1, b2) => Math.max(Math.min(a1, a2), Math.min(b1, b2)) < Math.min(Math.max(a1, a2), Math.max(b1, b2));
    const runOn = ([a1, a2], [b1, b2]) => {
      if (a1[0] === a2[0] && b1[0] === b2[0]) return a1[0] === b1[0] && overlapRange(a1[1], a2[1], b1[1], b2[1]);
      if (a1[1] === a2[1] && b1[1] === b2[1]) return a1[1] === b1[1] && overlapRange(a1[0], a2[0], b1[0], b2[0]);
      return false;
    };
    const problems = [];
    for (let i = 0; i < all.length; i += 1) {
      for (let j = i + 1; j < all.length; j += 1) {
        if (all[i].parts.some((a) => all[j].parts.some((b) => runOn(a, b)))) problems.push(`${all[i].name} runs on ${all[j].name}`);
      }
    }
    expect(problems).toEqual([]);
    // where two lines must cross, the drawing has a bridge there (a gap in the vertical line); the crossings stay few
    const found = crossings(RELATIONSHIPS.map((relationship) => ({ points: routeOf(relationship).points })));
    expect(found.length).toBeLessThanOrEqual(4);
    const bridges = buildDiagram().shapes.filter((shape) => shape.bridge);
    expect(bridges.map((shape) => [shape.x + 3, shape.y + 6]).sort()).toEqual(found.map(({ x, y }) => [x, y]).sort());
  });

  it.each(["en", "ja"])("puts every label on its own: off the tables, off the other labels and off the other lines (%s)", (language) => {
    const labels = buildDiagram(language).shapes.filter((shape) => shape.label);
    expect(labels).toHaveLength(RELATIONSHIPS.length);
    const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const problems = [];
    labels.forEach((label, i) => {
      const name = RELATIONSHIPS[i].label;
      labels.slice(i + 1).forEach((other, j) => overlap(label, other) && problems.push(`${name} x ${RELATIONSHIPS[i + 1 + j].label}`));
      ENTITIES.forEach((entity) => overlap(label, entityBox(entity)) && problems.push(`${name} on ${entity.name}`));
      // the white box of a label must not hide a part of another line
      RELATIONSHIPS.forEach((other, j) => {
        if (j === i) return;
        for (const [a, b] of segments(routeOf(other).points)) {
          const part = { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]) || 0.01, h: Math.abs(a[1] - b[1]) || 0.01 };
          if (overlap(label, part)) problems.push(`${name} hides ${other.parent} -> ${other.child}`);
        }
      });
    });
    expect(problems).toEqual([]);
  });

  it.each(["en", "ja"])("builds the same drawing every time, inside the paper (%s)", (language) => {
    const diagram = buildDiagram(language);
    expect(diagram).toEqual(buildDiagram(language));
    for (const shape of diagram.shapes) {
      const points = shape.points ?? [[shape.x ?? shape.cx, shape.y ?? shape.cy]];
      for (const [x, y] of points) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(WIDTH);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(HEIGHT);
      }
    }
  });
});
