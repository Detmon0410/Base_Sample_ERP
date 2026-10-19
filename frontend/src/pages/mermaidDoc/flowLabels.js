/**
 * The words inside the mermaid code of the charts, by kind of chart:
 *   - a flow chart: the text of a box ([text], ["text"], [["text"]], ([text]), [(text)], {text}), the title of a group
 *     (subgraph A["text"]) and the label of an arrow (-- text -->, -- "text" -->, -->|text|, -. text .->, -. "text" .- or .->);
 *   - a state chart: the label of a change of state (A --> B: text) and the name given to a state (state "text" as A);
 *   - a sequence chart: the message of an arrow (A->>B: text), a note (Note over A: text) and the name given to an actor or a
 *     participant (actor A as text);
 *   - an ER chart: the label of a relationship (A ||--o{ B : text, or "text").
 * An ER label without quotes may be only letters and digits: a translated one is put in quotes.
 * The ids, the names of the states (Draft, Sent, ...) and a box named only by its id (Normal, Low, Out) are values of the system and
 * are not words here. `translateCode` puts the words in the language of the page and leaves the rest of the code as it is, so the
 * chart keeps its shape.
 */
const PATTERNS = {
  flowchart: [/\[\["([^"]+)"\]\]|\(\[(.+?)\]\)|\[\((.+?)\)\]|\["([^"]+)"\]|\[(?![(*"[])([^\]]+)\]|\{([^}]+)\}|-- "([^"]+)" -->|-- (.+?) -->|-\. "([^"]+)" \.->?|-\. (.+?) \.->|-->\|([^|]+)\|/g],
  stateDiagram: [/^\s*\S+ --> \S+: (.+)$/gm, /^\s*state "([^"]+)" as /gm],
  sequenceDiagram: [/^\s*[^\s:]+?--?>>[^\s:]+?: (.+)$/gm, /^\s*Note (?:over|left of|right of) [^:]+: (.+)$/gm, /^\s*(?:actor|participant) \S+ as (.+)$/gm],
  erDiagram: [/^\s*\S+ \S+ \S+ : (?:"([^"]+)"|(\S+))$/gm],
};

/** The first group of the flow chart pattern that is the label of a line (-- "text" --> and the ones after it). */
const FIRST_LINE_GROUP = 7;

const kindOf = (code) => Object.keys(PATTERNS).find((kind) => code.trimStart().startsWith(kind)) ?? "flowchart";

/** Each word of a chart with where it is: [{ start, end, word, bare, line }], in the order they are written. */
function wordsOf(code) {
  const found = [];
  const kind = kindOf(code);
  for (const pattern of PATTERNS[kind]) {
    for (const match of code.matchAll(new RegExp(pattern.source, `${pattern.flags}d`))) {
      const group = match.indices.findIndex((indices, index) => index > 0 && indices);
      const [start, end] = match.indices[group];
      found.push({ start, end, word: match[group], bare: kind === "erDiagram" && group === 2, line: kind === "flowchart" && group >= FIRST_LINE_GROUP });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}

/** The words of a chart, in the order they are written. */
export const labelsOf = (code) => wordsOf(code).map((item) => item.word);

/**
 * A word as a chart shows it: " -> " as an arrow "→" (mermaid escapes ">" in an SVG label, and the box would show "-&gt;").
 */
export const forChart = (word) => word.replaceAll(" -> ", " → ");

/** The chart with each word given by `tr` (the same text when there is no other language). */
export function translateCode(code, tr) {
  let out = "";
  let at = 0;
  for (const { start, end, word, bare } of wordsOf(code)) {
    const shown = tr(word);
    out += code.slice(at, start) + (bare && !/^\w+$/.test(shown) ? `"${shown}"` : shown);
    at = end;
  }
  return out + code.slice(at);
}

/** The labels of the lines of a flow chart, each as its lines (split at <br/>). */
export const lineLabelsOf = (code) => wordsOf(code).filter((item) => item.line).map((item) => item.word.split("<br/>"));
