import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CROSS_TABLE_RULES, erName, FOREIGN_KEYS, foreignKeyOf, plain, UNIQUE_DETAILS, UNIQUE_KEYS } from "./dbRelations";
import { ENTITIES, RELATIONSHIPS } from "./erModel";

// The relations shown under the ER diagram come from ProjectdocInfo/DB Relations.md, word for word, and they agree with the diagram
// (ProjectdocInfo/ER Diagram.md): the same foreign keys, the same parents, the same ends.

const md = fs.readFileSync(path.resolve(import.meta.dirname, "../../../../ProjectdocInfo/DB Relations.md"), "utf8").replace(/\r\n/g, "\n");
const section = (title) => md.split(`## ${title}\n`)[1].split("\n## ")[0];
const rows = (title) =>
  section(title)
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .slice(2)
    .map((line) =>
      line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim()),
    );

describe("the relations are DB Relations.md", () => {
  it("has its foreign keys, unique keys and rules across tables, row for row and word for word", () => {
    expect(FOREIGN_KEYS).toEqual(rows("Foreign keys"));
    expect(UNIQUE_KEYS).toEqual(rows("Unique keys"));
    expect(CROSS_TABLE_RULES).toEqual(rows("Lifecycle rules that touch several tables"));
    expect(FOREIGN_KEYS).toHaveLength(18);
    expect(UNIQUE_KEYS).toHaveLength(9);
    expect(CROSS_TABLE_RULES).toHaveLength(5);
  });

  it("shows the unique keys that say more than the UK of the drawing, in the words of the .md", () => {
    expect(UNIQUE_DETAILS).toEqual(["User.email (lower-cased)", "ProductionOrder.order_number (`ORD-yyyy-0001`, given by the server)"]);
  });

  it("writes the cells without the code marks in the PDF", () => {
    expect(plain("customer in use -> `409 IN_USE`")).toBe("customer in use -> 409 IN_USE");
  });
});

describe("DB Relations.md agrees with ER Diagram.md", () => {
  it("names only the tables of the diagram", () => {
    const names = new Set(ENTITIES.map((entity) => entity.name));
    for (const [table, , references] of FOREIGN_KEYS) {
      expect(names.has(erName(table)), table).toBe(true);
      expect(names.has(erName(references.split(".")[0])), references).toBe(true);
    }
    for (const [table] of UNIQUE_KEYS) expect(names.has(erName(table)), table).toBe(true);
  });

  it("has one foreign key for every relationship of the diagram, to the same parent", () => {
    for (const relationship of RELATIONSHIPS) {
      const row = foreignKeyOf(relationship);
      expect(row, `${relationship.child}.${relationship.fk}`).toBeDefined();
      expect(erName(row[2].split(".")[0]), `${relationship.child}.${relationship.fk}`).toBe(relationship.parent);
    }
    expect(new Set(RELATIONSHIPS.map(foreignKeyOf)).size).toBe(FOREIGN_KEYS.length);
  });

  it("says the same ends: one to one is zero-or-one on the child, many to one is many, optional is zero-or-one on the parent", () => {
    for (const relationship of RELATIONSHIPS) {
      const cardinality = foreignKeyOf(relationship)[3];
      const name = `${relationship.child}.${relationship.fk}: ${cardinality}`;
      expect(cardinality.startsWith("one to one") ? ["one", "zeroOne"] : ["oneMany", "zeroMany"], name).toContain(relationship.childEnd);
      expect(cardinality.endsWith(", optional") ? "zeroOne" : "one", name).toBe(relationship.parentEnd);
    }
  });

  it("marks as unique (UK) in the diagram the single-column unique keys", () => {
    for (const [table, unique] of UNIQUE_KEYS) {
      const entity = ENTITIES.find((item) => item.name === erName(table));
      if (unique.startsWith("(")) continue; // a key of two columns, (material_id, lot_number): written as a note in the diagram
      // "order_number (`ORD-yyyy-0001`, given by the server)" is order_number; "invoice_number, order_id" are two keys of one column
      for (const name of unique.replace(/\s*\(.*\)/, "").split(",").map((value) => value.trim())) {
        const column = entity.columns.find(([column]) => column === name);
        expect(column?.[2] ?? "", `${table}.${name}`).toMatch(/UK/);
      }
    }
  });
});
