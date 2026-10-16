import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ENTITIES } from "@/pages/erDiagram/erModel";

import { PARTS } from "./dbRelations";

// The DB relations page is ProjectdocInfo/DB Relations.md, word for word: its parts, the intro of each part (without the sentences
// that only point to a document), and every table and chain. And it names only tables of the ER diagram.

const md = fs.readFileSync(path.resolve(import.meta.dirname, "../../../../ProjectdocInfo/DB Relations.md"), "utf8").replace(/\r\n/g, "\n");

/** The .md read the same way: ## a part, ### a section (a table or a ```text chain). */
function readMd() {
  return md
    .split("\n## ")
    .slice(1)
    .map((chunk) => {
      const [title, ...rest] = chunk.split("\n");
      const body = rest.join("\n").split("\n---")[0];
      const [introBlock, ...blocks] = `\n${body}`.split("\n### ");
      const intro = introBlock
        .trim()
        .split(/(?<=\.)\s+(?=[A-Z])/)
        .filter((sentence) => !sentence.includes("]("));
      const sections = blocks.map((block) => {
        const [name, ...lines] = block.split("\n");
        const content = lines.join("\n");
        const chain = /```text\n([\s\S]*?)\n```/.exec(content);
        if (chain) return { title: name.trim(), chain: chain[1] };
        const cells = lines
          .filter((line) => line.startsWith("|"))
          .map((line) =>
            line
              .trim()
              .replace(/^\||\|$/g, "")
              .split("|")
              .map((cell) => cell.trim()),
          );
        return { title: name.trim(), head: cells[0], rows: cells.slice(2) };
      });
      return { title: title.trim(), intro, sections };
    });
}

/** QtReference -> QT_REFERENCE, the name of the table in the ER diagram. */
const erName = (table) => table.replace(/(?!^)([A-Z])/g, "_$1").toUpperCase();

describe("the DB relations are DB Relations.md", () => {
  const source = readMd();

  it("has its two parts with their sections, in its order", () => {
    expect(PARTS.map((part) => [part.title, part.sections.map((section) => section.title)])).toEqual([
      ["Part 1: The base tables (the Mini ERP before Version 2.0)", ["Foreign keys", "Unique keys", "Lifecycle rules that touch several tables", "Chain of one sale"]],
      ["Part 2: Added or changed in Version 2.0 (as built)", ["New foreign keys", "Changed columns", "Unique keys", "Lifecycle rules that touch several tables", "Chain of the new flows"]],
    ]);
  });

  it("has every table row for row and word for word, and every chain character for character", () => {
    expect(PARTS).toEqual(source);
    const rows = PARTS.flatMap((part) => part.sections.filter((section) => section.rows).map((section) => section.rows.length));
    expect(rows).toEqual([18, 9, 5, 13, 3, 5, 8]);
  });

  it("keeps the intros without the sentences that point to a document", () => {
    for (const part of PARTS) for (const sentence of part.intro) expect(sentence).not.toMatch(/\]\(|\.md\b|docs\//);
    expect(PARTS[0].intro).toEqual(["Table-by-table list of keys, relations and delete rules.", "The rows of QtReference, Material and User are changed by Part 2 below."]);
    expect(PARTS[1].intro).toHaveLength(4);
  });

  it("names only tables of the ER diagram", () => {
    const names = new Set(ENTITIES.map((entity) => entity.name));
    for (const part of PARTS) {
      for (const section of part.sections) {
        if (!section.rows) continue;
        const tableColumn = section.head.indexOf("Table");
        if (tableColumn < 0) continue; // the rules name the tables they write among other words
        for (const row of section.rows) expect(names.has(erName(row[tableColumn])), row[tableColumn]).toBe(true);
      }
    }
  });
});
