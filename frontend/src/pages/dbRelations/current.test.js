import { describe, expect, it } from "vitest";

import { ENTITIES } from "@/pages/erDiagram/erModel";

import { ALL_KEYS_TITLE, COLUMN_RULES_TITLE, CURRENT, TABLE_ORDER } from "./current";
import { PARTS } from "./dbRelations";

// The DB relations as they are now: every row of DB Relations.md is in the one current list, once, or is left out for a reason
// (it is older than a row of Part 2, it tells a change of columns, or it says a rule is unchanged). No word of the page sends to
// "Part 1" or "Part 2".

const [summary, base, added] = PARTS;
const sectionOf = (part, title) => part.sections.find((item) => item.title === title);
const [, all] = CURRENT;
const current = (title) => sectionOf(all, title);
const key = (row) => row.join(" | ");

describe("the current DB relations", () => {
  it("is the summary, then all the keys and rules", () => {
    expect(CURRENT.map((part) => part.title)).toEqual([summary.title, ALL_KEYS_TITLE]);
    expect(all.sections.map((section) => section.title)).toEqual(["Foreign keys", "Unique keys", COLUMN_RULES_TITLE, "Lifecycle rules that touch several tables", "Chain of one sale", "Chain of the new flows"]);
    expect(CURRENT[0].sections).toEqual(summary.sections);
  });

  it("never sends to Part 1 or Part 2", () => {
    expect(JSON.stringify(CURRENT)).not.toMatch(/\bParts? [12]\b|new or changed/);
    expect(CURRENT[0].intro).toEqual(["23 tables in 5 groups."]);
    expect(all.intro).toEqual(["Table-by-table list of keys, relations and delete rules.", "The order status is `Draft`, `In Progress`, `Completed` (computed; `Draft` replaces `New`).", "An order is made only by Confirm QT."]);
  });

  it("has every foreign key of Part 1 and of Part 2 once, the row of Part 2 where a key is in both, by table in the order of the groups", () => {
    const rows = current("Foreign keys").rows;
    const newer = sectionOf(added, "New or changed foreign keys").rows;
    const older = sectionOf(base, "Foreign keys").rows.filter((row) => !newer.some((other) => other[0] === row[0] && other[1] === row[1]));
    expect(rows.map(key).sort()).toEqual([...older, ...newer].map(key).sort());
    expect(rows).toHaveLength(31);
    // Version 2.0: a QT makes one order (Confirm QT), so an order has one QT and a QT at most one order
    expect(rows.filter((row) => row[0] === "ProductionOrder" && row[1] === "qt_id")).toEqual([["ProductionOrder", "qt_id", "QtReference.id", "one to one", "QT used by an order -> `409 IN_USE`"]]);
    expect(new Set(rows.map((row) => `${row[0]}.${row[1]}`)).size).toBe(rows.length);
    const order = rows.map((row) => TABLE_ORDER.indexOf(row[0]));
    expect(order.every((value) => value >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("has every unique key, the row of Part 2 where a table is in both", () => {
    const rows = current("Unique keys").rows;
    const newer = sectionOf(added, "Unique keys").rows;
    const older = sectionOf(base, "Unique keys").rows;
    expect(rows.map(key).sort()).toEqual([...older.filter((row) => !newer.some((other) => other[0] === row[0])), ...newer].map(key).sort());
    expect(rows.find((row) => row[0] === "QtReference")).toEqual(["QtReference", "qt_number, production_order_id"]);
    expect(rows.find((row) => row[0] === "QtLine")).toEqual(["QtLine", "(qt_id, product_id)"]);
    expect(new Set(rows.map((row) => row[0])).size).toBe(rows.length);
  });

  it("keeps of the changed columns only the rules (the columns are in the ER diagram)", () => {
    expect(current(COLUMN_RULES_TITLE).rows).toEqual([["User", "rule: `role = Worker` needs `department` in (`Sales`, `Factory`)"]]);
  });

  it("has every rule that touches several tables, Confirm QT first, without the row that says a rule is unchanged", () => {
    const rows = current("Lifecycle rules that touch several tables").rows;
    const every = [...sectionOf(base, "Lifecycle rules that touch several tables").rows, ...sectionOf(added, "Lifecycle rules that touch several tables").rows];
    expect(rows.map(key).sort()).toEqual(every.filter((row) => row[2] !== "Unchanged").map(key).sort());
    expect(rows.map((row) => row[0])).toEqual(["Confirm QT", "Start production (`POST /orders/:id/start`)", "Progress entry", "Issue invoice", "Pay invoice", "Manual stock change", "Create PO", "Edit PO", "Change PO status", "Receive PO", "Pay PO", "Upload file"]);
  });

  it("has both chains of the flows, and names only tables of the ER diagram", () => {
    expect(current("Chain of one sale").chain).toBe(sectionOf(base, "Chain of one sale").chain);
    expect(current("Chain of the new flows").chain).toBe(sectionOf(added, "Chain of the new flows").chain);
    const names = new Set(ENTITIES.map((entity) => entity.name));
    const erName = (name) => name.replace(/(?!^)([A-Z])/g, "_$1").toUpperCase();
    for (const name of TABLE_ORDER) expect(names.has(erName(name)), name).toBe(true);
  });
});
