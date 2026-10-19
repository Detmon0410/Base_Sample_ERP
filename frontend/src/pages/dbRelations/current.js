import { PARTS } from "./dbRelations";

/**
 * The database as it is now, made from DB Relations.md (PARTS): the .md keeps the base tables (Part 1) and the changes of
 * Version 2.0 (Part 2) apart, the page shows one current list.
 *   - The summary of the current version, as in the .md, without the sentence that sends to Parts 1 and 2.
 *   - Foreign keys: those of Part 1 and the new ones of Part 2, by table in the order of the groups of the summary; a key in both (the
 *     same table and column) would have the row of Part 2 (the newer one).
 *   - Unique keys: those of Part 1 and Part 2; a table in both has the row of Part 2 (it is the newer one).
 *   - Rules on columns: the rows of "Changed columns" that are a rule ("rule: ..."); the columns themselves are in the ER diagram.
 *   - Rules that touch several tables: those of Part 1 and Part 2, but not a row of Part 2 that only says the rule is unchanged; the
 *     rules that make the order (Confirm QT) first, as the work goes.
 *   - The chains of the flows: both sketches.
 * current.test.js checks that every row of the .md is in it, once, or why it is not.
 */
const [summary, base, added] = PARTS;
const section = (part, title) => part.sections.find((item) => item.title === title);

/** The tables in the order of the groups of the summary (Users and files, Master data, Sale, Accounting, Purchase and stock). */
export const TABLE_ORDER = summary.sections[0].rows.flatMap((row) => row[1].split(", "));
const byTable = (rows) => rows.map((row, index) => [row, index]).sort((a, b) => TABLE_ORDER.indexOf(a[0][0]) - TABLE_ORDER.indexOf(b[0][0]) || a[1] - b[1]).map(([row]) => row);

const SENDS_TO_PARTS = /\bParts? [12]\b/;
const UNCHANGED = (row) => row[2] === "Unchanged";
/** A rule that makes the production order (Confirm QT): it comes before the rules of the order. */
const MAKES_ORDER = (row) => row[1].split(", ").includes("ProductionOrder");

const foreignKeys = section(base, "Foreign keys");
const newForeignKeys = section(added, "New foreign keys");
/** The same key in Part 1 and Part 2: the same table and the same column. */
const sameKey = (a, b) => a[0] === b[0] && a[1] === b[1];
const baseUnique = section(base, "Unique keys");
const addedUnique = section(added, "Unique keys");
const changedColumns = section(added, "Changed columns");
const baseRules = section(base, "Lifecycle rules that touch several tables");
const addedRules = section(added, "Lifecycle rules that touch several tables");

/** The title of the list of all keys and rules, and the title of the rules on columns (not in the .md: the page joins its parts). */
export const ALL_KEYS_TITLE = "All keys and rules (as built)";
export const COLUMN_RULES_TITLE = "Rules on columns";

export const CURRENT = [
  {
    title: summary.title,
    intro: summary.intro.filter((sentence) => !SENDS_TO_PARTS.test(sentence)),
    sections: summary.sections,
  },
  {
    title: ALL_KEYS_TITLE,
    // what the intros of the parts say of the system as it is (the rest says how the .md is split)
    intro: [...base.intro, ...added.intro].filter((sentence) => !SENDS_TO_PARTS.test(sentence) && !/\bnew or changed\b|\bchanges\.$/.test(sentence)),
    sections: [
      {
        title: foreignKeys.title,
        head: foreignKeys.head,
        rows: byTable([...foreignKeys.rows.filter((row) => !newForeignKeys.rows.some((newer) => sameKey(row, newer))), ...newForeignKeys.rows]),
      },
      {
        title: baseUnique.title,
        head: baseUnique.head,
        rows: byTable([...baseUnique.rows.filter((row) => !addedUnique.rows.some((newer) => newer[0] === row[0])), ...addedUnique.rows]),
      },
      { title: COLUMN_RULES_TITLE, head: changedColumns.head, rows: changedColumns.rows.filter((row) => row[1].startsWith("rule:")) },
      { title: baseRules.title, head: baseRules.head, rows: [...addedRules.rows.filter(MAKES_ORDER), ...baseRules.rows, ...addedRules.rows.filter((row) => !UNCHANGED(row) && !MAKES_ORDER(row))] },
      ...base.sections.filter((item) => item.chain),
      ...added.sections.filter((item) => item.chain),
    ],
  },
];
