import { describe, expect, it } from "vitest";

import { PARTS } from "@/pages/dbRelations/dbRelations";
import { ENTITIES, NOTES, RELATIONSHIPS } from "@/pages/erDiagram/erModel";

import { inLanguage, JA } from "./mdJa";

// The ER diagram and DB relations pages in Japanese: every word of the .md files they show has its Japanese, and the names, values,
// codes and paths are kept.

const LEGEND = ["Notation (crow's foot)", "exactly one", "zero or one", "one or many", "zero or many", "no database key", "primary key", "foreign key", "unique", "note", "note of the column"];
/** The values of a column ("Admin | Worker") are values of the database: they stay as they are. */
const isValues = (note) => note.includes(" | ");
/** The columns of DB Relations.md whose cells are words; the other columns hold names (Table, Column, ...). */
const WORD_COLUMNS = ["Cardinality", "Delete rule", "Change", "Event", "Rule"];
/** The cells of the name columns that also have words. */
const WORDS_AMONG_NAMES = ["PurchaseOrder, QtReference or ProductionOrder", "email (lower-cased)", "order_number (`ORD-yyyy-0001`, given by the server)", "as before"];

const er = [
  ...RELATIONSHIPS.map((relationship) => relationship.label),
  ...ENTITIES.flatMap((entity) => entity.columns.map((column) => column[3]).filter((note) => note && !isValues(note))),
  ...NOTES,
  ...LEGEND,
];
const db = PARTS.flatMap((part) => [
  part.title,
  ...part.intro,
  ...part.sections.flatMap((section) => [
    section.title,
    ...(section.head ?? []),
    ...(section.rows ?? []).flatMap((row) => row.filter((cell, index) => WORD_COLUMNS.includes(section.head[index]) || WORDS_AMONG_NAMES.includes(cell))),
  ]),
]);
/** The codes of a text, in any order (Japanese puts the words in another order). */
const codes = (text) => [...text.matchAll(/`([^`]*)`/g)].map((match) => match[1]).sort();

describe("the Japanese of the .md texts", () => {
  it("has a Japanese text for every text of the .md files the two pages show, and no other", () => {
    expect(Object.keys(JA).sort()).toEqual([...new Set([...er, ...db])].sort());
    for (const [english, japanese] of Object.entries(JA)) expect(japanese.trim(), english).not.toBe("");
  });

  it("keeps the codes of a text as they are (409 IN_USE, POST /orders/:id/start, ...)", () => {
    for (const [english, japanese] of Object.entries(JA)) expect(codes(japanese), english).toEqual(codes(english));
  });

  it("is used only on a Japanese page; English shows the .md as it is, and a name stays a name", () => {
    expect(inLanguage("goes with the order", "ja")).toBe("指示書と一緒に削除");
    expect(inLanguage("goes with the order", "en")).toBe("goes with the order");
    expect(inLanguage("Admin | Worker", "ja")).toBe("Admin | Worker");
    expect(inLanguage("ProductionOrder.started_at, MaterialLot, StockChange", "ja")).toBe("ProductionOrder.started_at, MaterialLot, StockChange");
  });
});
