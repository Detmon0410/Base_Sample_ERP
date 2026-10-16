import { describe, expect, it } from "vitest";

import { CROSS_TABLE_RULES, foreignKeyOf, UNIQUE_DETAILS } from "./dbRelations";
import { ENTITIES, RELATIONSHIPS } from "./erModel";
import { inLanguage, JA } from "./mdJa";

// The page in Japanese: every word of the .md files it shows has its Japanese, and the names, values, codes and paths are kept.

const LEGEND = ["Notation (crow's foot)", "exactly one", "zero or one", "one or many", "zero or many", "primary key", "foreign key", "unique", "note", "note of the column"];
/** The values of a column ("Admin | Worker") are values of the database: they stay as they are. */
const isValues = (note) => note.includes(" | ");

const shown = [
  ...RELATIONSHIPS.map((relationship) => relationship.label),
  ...ENTITIES.flatMap((entity) => entity.columns.map((column) => column[3]).filter((note) => note && !isValues(note))),
  ...RELATIONSHIPS.map((relationship) => foreignKeyOf(relationship)[4]),
  ...UNIQUE_DETAILS,
  ...CROSS_TABLE_RULES.flatMap(([event, , rule]) => [event, rule]),
  ...LEGEND,
];
const codes = (text) => [...text.matchAll(/`([^`]*)`/g)].map((match) => match[1]);

describe("the Japanese of the .md texts", () => {
  it("has a Japanese text for every text of the .md files the page shows, and no other", () => {
    expect(Object.keys(JA).sort()).toEqual([...new Set(shown)].sort());
    for (const [english, japanese] of Object.entries(JA)) expect(japanese.trim(), english).not.toBe("");
  });

  it("keeps the codes of a text as they are (409 IN_USE, POST /orders/:id/start, ...)", () => {
    for (const [english, japanese] of Object.entries(JA)) expect(codes(japanese), english).toEqual(codes(english));
  });

  it("is used only on the Japanese page; English shows the .md as it is, and a name stays a name", () => {
    expect(inLanguage("goes with the order", "ja")).toBe("指示書と一緒に削除");
    expect(inLanguage("goes with the order", "en")).toBe("goes with the order");
    expect(inLanguage("Admin | Worker", "ja")).toBe("Admin | Worker");
    expect(inLanguage("ProductionOrder.started_at, MaterialLot, StockChange", "ja")).toBe("ProductionOrder.started_at, MaterialLot, StockChange");
  });
});
