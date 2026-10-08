// The workflow test keeps what the tester makes (docs/specs/f13-workflow-test.md). The mock stores live in the page, so instead
// of copying every store the browser keeps a LOG of every change a person made (each successful POST / PUT / PATCH / DELETE
// with who made it and when). When the page opens, the log is played again on empty stores, with the clock set to the time of
// each entry, so the numbers, the history and the times come out exactly as they were. A change made in another tab (another
// user in the same browser) is played here too, so the tabs see the same data.
//
// Only active with VITE_MOCK_SEED=empty (never in the demo or in the tests).

import { EMPTY_SEED } from "./seedMode.js";

export const PERSIST = EMPTY_SEED && import.meta.env.MODE !== "test";
const KEY = "kanou.testlog.v1";
const TOKEN = /mock-token-(\d+)/;

function read() {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function write(log) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    /* storage full or blocked: this session just will not survive a reload */
  }
}

/** Runs `fn` with `new Date()` and `Date.now()` standing still at `iso`. */
function withClock(iso, fn) {
  const RealDate = Date;
  const fixed = new RealDate(iso).getTime();
  class FixedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(fixed);
      else super(...args);
    }
    static now() {
      return fixed;
    }
  }
  globalThis.Date = FixedDate;
  try {
    return fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

let applied = 0; // how many entries of the log this page has played or made itself

/** The user who made the call, from its token ("mock-token-<id>"). */
export const userIdOf = (authorization) => {
  const match = TOKEN.exec(String(authorization ?? ""));
  return match ? Number(match[1]) : null;
};

/** Plays the entries that this page has not seen yet. `run(entry)` calls the handler of the route. */
export function replayNew(run) {
  const log = read();
  const fresh = log.slice(applied);
  applied = log.length;
  for (const entry of fresh) {
    try {
      withClock(entry.at, () => run(entry));
    } catch (error) {
      // a call that no longer works (it should not happen): skip it, the rest still plays
      console.warn("Test log: an entry could not be played again", entry.method, entry.path, error?.message);
    }
  }
  return fresh.length;
}

/** Adds a change this page has just made. */
export function record(entry) {
  const log = read();
  log.push(entry);
  write(log);
  applied = log.length;
}

/** Calls `onChange` when another tab added entries to the log. */
export function onForeignChange(onChange) {
  const handler = (event) => {
    if (event.key === KEY) onChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

/** Forgets everything the tester made: the next load starts empty again. */
export function resetTestData() {
  try {
    window.localStorage.removeItem(KEY);
    for (const key of Object.keys(window.localStorage)) if (key.startsWith("kanou.rowseen") || key.startsWith("kanou.seen")) window.localStorage.removeItem(key);
    window.sessionStorage.clear();
  } catch {
    /* ignore */
  }
  window.location.reload();
}
