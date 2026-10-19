/**
 * What the pages made from the .md files (ER Diagram, DB Relations, Flow Chart, User Flow, APIs Diagram) never show: the details
 * that would help someone get into the system. Each is replaced by HIDDEN, which the page draws as a dark bar and a chart or a PDF
 * writes as dots:
 *   - login names and passwords ("admin@gmail.com / admin");
 *   - the names of the databases and how to reach them (kanou_mini_erp, DATABASE_URL);
 *   - the addresses and ports of the servers (http://localhost:3000/api, :5173);
 *   - the API: its paths ("/orders/:id/start", "/api") with or without their method ("POST /invoices", "POST start"), and the
 *     header that carries the token;
 *   - the files and folders of the server (backend/src, routes/*.routes.js, uploads/, error.middleware) and the commands to run
 *     (pnpm ...).
 * The names of the tables and columns, the status values and the error codes stay: they are what the documents are about.
 */
export const HIDDEN = "•••••";

const RULES = [
  // a command to run, in a `code` mark: the whole mark
  [/`[^`]*\b(?:pnpm|npm|npx|node|cd)\b[^`]*`/g, `\`${HIDDEN}\``],
  // an address of a server
  [/\bhttps?:\/\/[^\s`"')\]]+/g, HIDDEN],
  // a login name, with its password when one follows ("`admin@gmail.com` / `admin`")
  [/`?[\w.+-]+@[\w-]+(?:\.[\w-]+)+`?(?:\s*\/\s*`?[\w-]+`?)?/g, HIDDEN],
  // the databases and how to reach them
  [/\bkanou_mini_erp\w*/g, HIDDEN],
  [/\bDATABASE_URL\b/g, HIDDEN],
  // the header that carries the token
  [/Authorization: Bearer <token>/g, HIDDEN],
  // a call of the API: a method and its path or its name ("POST /invoices", "POST start")
  [/\b(?:GET|POST|PUT|PATCH|DELETE)\s+(?:\/[\w\-/:.?&=*]*|[a-z][\w-]*)/g, HIDDEN],
  // a path of the API ("/orders/:id/start", "/api", "/attachments?ownerType&ownerId"), not the "/" between two words
  [/(?<![\w.<])\/[A-Za-z:][\w\-/:.?&=*]*/g, HIDDEN],
  // a file or folder of the server ("backend/src", "routes/*.routes.js", "uploads/"), not the "br/" of "<br/>"
  [/(?<![<\w.*-])[\w.*-]+\/(?:[\w.*-]+\/?)*/g, HIDDEN],
  // a module of the server
  [/\b[\w-]+\.middleware\b/g, HIDDEN],
  // a port ("React :5173")
  [/(?<=\s):\d{2,5}\b/g, HIDDEN],
];

/** The text with every detail of the list above replaced by HIDDEN. */
export function censor(text) {
  let out = String(text);
  for (const [pattern, replacement] of RULES) out = out.replace(pattern, replacement);
  return out;
}
