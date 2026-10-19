import { describe, expect, it } from "vitest";

import { INTRO as APIS_INTRO, SECTIONS as APIS, TITLE as APIS_TITLE } from "@/pages/apisDiagram/apisDiagram";
import { SECTIONS as CONTEXT, TITLE as CONTEXT_TITLE } from "@/pages/contextDiagram/contextDiagram";
import { PARTS, TITLE as DB_TITLE } from "@/pages/dbRelations/dbRelations";
import { ENTITIES, NOTES, RELATIONSHIPS, TITLE as ER_TITLE, VERSION_ADDED } from "@/pages/erDiagram/erModel";
import { SECTIONS as FLOW, TITLE as FLOW_TITLE } from "@/pages/flowChart/flowChart";
import { labelsOf } from "@/pages/mermaidDoc/flowLabels";
import { SECTIONS as USER_FLOW, TITLE as USER_FLOW_TITLE } from "@/pages/userFlow/userFlow";

import { censor, HIDDEN } from "@/utils/censor";

import { inLanguage, JA } from "./mdJa";

// The six pages made from the .md files (ER Diagram, DB Relations, Flow Chart, User Flow, APIs Diagram, Context Diagram) in Japanese: every word of the .md they
// show has its Japanese, and the names, values, codes and paths are kept.

const LEGEND = ["Notation (crow's foot)", "exactly one", "zero or one", "one or many", "zero or many", "no database key", "primary key", "foreign key", "unique", "note", "note of the column"];
/** The values of a column ("Admin | Worker") are values of the database: they stay as they are. */
const isValues = (note) => note.includes(" | ");
/** The columns of DB Relations.md whose cells are words; the other columns hold names (Table, Column, ...). */
const WORD_COLUMNS = ["Cardinality", "Delete rule", "Change", "Event", "Rule", "Group", "Main relations"];
/** The cells of the name columns that also have words. */
const WORDS_AMONG_NAMES = ["PurchaseOrder, QtReference or ProductionOrder", "email (lower-cased)", "order_number (`ORD-yyyy-0001`, given by the server)", "as before"];
/** The names in a chart that are not words: a table, a tool, a class, the fields of an answer. */
const NAMES = ["MaterialLot", "Prisma", "ApiError", "JSON + Bearer JWT", "{ qt, order, alreadyConfirmed, warnings }", "Mini ERP 2.0", "MySQL", "JSON + Bearer token"];
/**
 * A text of APIs Diagram.md with no word in it: a number (403), codes (`IN_USE`), a file, or a call of the API that is hidden
 * (POST /auth/login). It stays as it is.
 */
const hasWords = (text) => /[a-z]{2}/.test(censor(text).replace(/`[^`]*`|<br\/>/g, ""));

const er = [
  ER_TITLE,
  ...RELATIONSHIPS.map((relationship) => relationship.label),
  ...ENTITIES.flatMap((entity) => entity.columns.map((column) => column[3]).filter((note) => note && !isValues(note))),
  VERSION_ADDED.title,
  ...VERSION_ADDED.head,
  ...VERSION_ADDED.rows.flat(),
  "Notes",
  ...NOTES,
  ...LEGEND,
];
const db = [
  DB_TITLE,
  ...PARTS.flatMap((part) => [
    part.title,
    ...part.intro,
    ...part.sections.flatMap((section) => [
      ...(section.title ? [section.title] : []),
      ...(section.items ?? []),
      ...(section.head ?? []),
      ...(section.rows ?? []).flatMap((row) => row.filter((cell, index) => WORD_COLUMNS.includes(section.head[index]) || WORDS_AMONG_NAMES.includes(cell))),
    ]),
  ]),
];
const charts = (title, sections, intro = []) =>
  [
    title,
    ...intro.map((block) => block.text),
    ...sections.flatMap((section) => [
      section.title,
      ...section.blocks.flatMap((block) => (block.chart ? labelsOf(block.chart) : block.heading ? [block.heading] : block.items ? block.items : block.table ? [...block.table.head, ...block.table.rows.flat()] : [block.text])),
    ]),
  ].filter((word) => !NAMES.includes(word));
/** The codes of a text, in any order (Japanese puts the words in another order). */
const codes = (text) => [...text.matchAll(/`([^`]*)`/g)].map((match) => match[1]).sort();

describe("the Japanese of the .md texts", () => {
  it("has a Japanese text for every text of the .md files the six pages show, and no other", () => {
    expect(Object.keys(JA).sort()).toEqual([...new Set([...er, ...db, ...charts(FLOW_TITLE, FLOW), ...charts(USER_FLOW_TITLE, USER_FLOW), ...charts(APIS_TITLE, APIS, APIS_INTRO).filter(hasWords), ...charts(CONTEXT_TITLE, CONTEXT)])].sort());
    for (const [english, japanese] of Object.entries(JA)) expect(japanese.trim(), english).not.toBe("");
  });

  it("keeps the codes of a text as they are (409 IN_USE, POST /orders/:id/start, ...)", () => {
    for (const [english, japanese] of Object.entries(JA)) expect(codes(japanese), english).toEqual(codes(english));
  });

  it("hides in Japanese what it hides in English (the paths, the databases, the logins, ...)", () => {
    const hidden = (text) => censor(text).split(HIDDEN).length - 1;
    for (const [english, japanese] of Object.entries(JA)) expect(hidden(japanese), english).toBe(hidden(english));
  });

  it("is used only on a Japanese page; English shows the .md as it is, and a name stays a name", () => {
    expect(inLanguage("goes with the order", "ja")).toBe("指示書と一緒に削除");
    expect(inLanguage("goes with the order", "en")).toBe("goes with the order");
    expect(inLanguage("Admin | Worker", "ja")).toBe("Admin | Worker");
    expect(inLanguage("ProductionOrder.started_at, MaterialLot, StockChange", "ja")).toBe("ProductionOrder.started_at, MaterialLot, StockChange");
  });
});
