import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ENTITIES } from "@/pages/erDiagram/erModel";

import { PARTS } from "./dbRelations";

// The DB relations page is ProjectdocInfo/DB Relations.md, word for word: its parts (the summary, Part 1, Part 2), the intro of each
// part (without the sentences that only point to a document), and every table, list and chain. And it names only tables of the ER
// diagram.

const md = fs.readFileSync(path.resolve(import.meta.dirname, "../../../../ProjectdocInfo/DB Relations.md"), "utf8").replace(/\r\n/g, "\n");

const sentences = (paragraph) =>
  paragraph
    .trim()
    .split(/(?<=\.)\s+(?=[A-Z0-9])/)
    .filter((sentence) => sentence && !sentence.includes("]("));
const table = (lines) => {
  const cells = lines.map((line) =>
    line
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((cell) => cell.trim()),
  );
  return { head: cells[0], rows: cells.slice(2) };
};
/** The blocks of a text, in order: ["chain", text] | ["table", {head, rows}] | ["list", items] | ["text", paragraph]. */
function blocks(text) {
  const out = [];
  for (const piece of text.split(/(```text\n[\s\S]*?\n```)/)) {
    if (piece.startsWith("```text")) {
      out.push(["chain", piece.slice(8, -4)]);
      continue;
    }
    for (const paragraph of piece.split(/\n\s*\n/)) {
      const lines = paragraph
        .trim()
        .split("\n")
        .filter((line) => line.trim());
      if (!lines.length || (lines.length === 1 && lines[0] === "---")) continue;
      if (lines[0].startsWith("|")) out.push(["table", table(lines)]);
      else if (/^[-*] /.test(lines[0])) out.push(["list", lines.map((line) => line.slice(2).trim())]); // a list: "- " or "* "
      else out.push(["text", lines.map((line) => line.trim()).join(" ")]);
    }
  }
  return out;
}
function readMd() {
  return md
    .split("\n## ")
    .slice(1)
    .map((chunk) => {
      const [title, ...rest] = chunk.split("\n");
      const [head, ...pieces] = `\n${rest.join("\n")}`.split("\n### ");
      const intro = [];
      const sections = [];
      let pending = "";
      for (const [kind, value] of blocks(head)) {
        if (kind === "text" && value.endsWith(":")) pending = value.slice(0, -1);
        else if (kind === "text") intro.push(...sentences(value));
        else if (kind === "table") {
          sections.push({ title: pending, ...value });
          pending = "";
        } else if (kind === "list") {
          sections.push({ title: pending, items: value });
          pending = "";
        }
      }
      for (const piece of pieces) {
        const [name, ...lines] = piece.split("\n");
        for (const [kind, value] of blocks(lines.join("\n"))) {
          if (kind === "chain") sections.push({ title: name.trim(), chain: value });
          else if (kind === "table") sections.push({ title: name.trim(), ...value });
        }
      }
      return { title: title.trim(), intro, sections };
    });
}

/** QtReference -> QT_REFERENCE, the name of the table in the ER diagram. */
const erName = (name) => name.replace(/(?!^)([A-Z])/g, "_$1").toUpperCase();

describe("the DB relations are DB Relations.md", () => {
  const source = readMd();

  it("has its parts with their sections, in its order", () => {
    expect(PARTS.map((part) => [part.title, part.sections.map((section) => section.title)])).toEqual([
      ["Current version summary (as built)", ["", "Rules to remember"]],
      ["Part 1: The base tables (the Mini ERP before Version 2.0)", ["Foreign keys", "Unique keys", "Lifecycle rules that touch several tables", "Chain of one sale"]],
      ["Part 2: Added or changed in Version 2.0 (as built)", ["New foreign keys", "Changed columns", "Unique keys", "Lifecycle rules that touch several tables", "Chain of the new flows"]],
    ]);
  });

  it("has every table row for row, every list item and every chain, word for word", () => {
    expect(PARTS).toEqual(source);
    const rows = PARTS.flatMap((part) => part.sections.filter((section) => section.rows).map((section) => section.rows.length));
    expect(rows).toEqual([5, 18, 9, 5, 13, 3, 6, 8]);
    expect(PARTS[0].sections[1].items).toHaveLength(5);
  });

  it("keeps the intros without the sentences that point to a document", () => {
    for (const part of PARTS) for (const sentence of part.intro) expect(sentence).not.toMatch(/\]\(|\.md\b|docs\//);
    expect(PARTS[0].intro).toEqual(["23 tables in 5 groups.", "Parts 1 and 2 below give every key and rule; this is the short form."]);
    // the summary counts what its groups list, which is what the ER diagram has
    expect(PARTS[0].sections[0].rows.flatMap((row) => row[1].split(", "))).toHaveLength(ENTITIES.length);
    expect(PARTS[1].intro).toEqual(["Table-by-table list of keys, relations and delete rules.", "The rows of QtReference, Material and User are changed by Part 2 below."]);
    expect(PARTS[2].intro).toHaveLength(4);
  });

  it("names only tables of the ER diagram", () => {
    const names = new Set(ENTITIES.map((entity) => entity.name));
    for (const part of PARTS) {
      for (const section of part.sections) {
        if (!section.rows) continue;
        const tableColumn = section.head.indexOf("Table");
        const listColumn = section.head.indexOf("Tables");
        for (const row of section.rows) {
          if (tableColumn >= 0) expect(names.has(erName(row[tableColumn])), row[tableColumn]).toBe(true);
          if (listColumn >= 0) for (const name of row[listColumn].split(", ")) expect(names.has(erName(name)), name).toBe(true);
        }
      }
    }
  });
});
