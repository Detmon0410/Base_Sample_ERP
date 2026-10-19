/**
 * The words inside the mermaid code of the flow charts: the text of a box ([text], ([text]), [(text)], {text}), the label of an
 * arrow (-- text -->) and the label of a change of state (A --> B: text). The names of the states (Draft, Sent, ...) and a box
 * named only by its id (Normal, Low, Out) are values of the system and are not words here. `translateCode` puts the words in the
 * language of the page and leaves the rest of the code as it is, so the chart keeps its shape.
 */
const FLOW = /\(\[(.+?)\]\)|\[\((.+?)\)\]|\[(?![(*])([^\]]+)\]|\{([^}]+)\}|-- (.+?) -->/g;
const STATE = /^(\s*\S+ --> \S+): (.+)$/gm;
/** The open and close marks of each kind of FLOW match, in the order of its groups. */
const MARKS = [
  ["([", "])"],
  ["[(", ")]"],
  ["[", "]"],
  ["{", "}"],
  ["-- ", " -->"],
];

const isState = (code) => code.trimStart().startsWith("stateDiagram");

/** The words of a chart, in the order they are written. */
export function labelsOf(code) {
  if (isState(code)) return [...code.matchAll(STATE)].map((match) => match[2]);
  return [...code.matchAll(FLOW)].map((match) => match.slice(1).find((group) => group !== undefined));
}

/**
 * A word as a chart shows it: " -> " as an arrow "→" (mermaid escapes ">" in an SVG label, and the box would show "-&gt;").
 */
export const forChart = (word) => word.replaceAll(" -> ", " → ");

/** The chart with each word given by `tr` (the same text when there is no other language). */
export function translateCode(code, tr) {
  if (isState(code)) return code.replace(STATE, (_match, head, label) => `${head}: ${tr(label)}`);
  return code.replace(FLOW, (...match) => {
    const groups = match.slice(1, 6);
    const index = groups.findIndex((group) => group !== undefined);
    const [open, close] = MARKS[index];
    return `${open}${tr(groups[index])}${close}`;
  });
}
