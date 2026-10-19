/**
 * The "Main relations" of a group of the summary, one relation a line: the .md writes them in one cell, as sentences. A sentence
 * ends with ". " before a capital (not the dot of a name such as Attachment.uploaded_by) or with "。" in Japanese; the end mark is
 * left out of the line.
 */
export const splitRelations = (text) =>
  String(text)
    .split(/(?<=\.)\s+(?=[A-Z])|(?<=。)/)
    .map((sentence) => sentence.trim().replace(/[.。]$/, ""))
    .filter(Boolean);

/** The names of the tables of a group, one by one ("User, Attachment"; "User、Attachment" in Japanese). */
export const splitTables = (text) =>
  String(text)
    .split(/,\s*|、/)
    .map((name) => name.trim())
    .filter(Boolean);

/** The summary table of the .md: its columns are the group, its tables and its main relations. */
export const isGroupTable = (head) => head.join("|") === "Group|Tables|Main relations";
