// Which rows of a table are NEW for the signed-in user (docs/specs/f13-workflow-test.md): a document that arrived, or changed, since
// the user last looked at it. A red dot marks it in the table; opening the row makes the dot go away.
//
//   since   when this user was first seen in this browser: whatever changed before that is old, not new
//   seen    per list and row: the time the user last opened it
// A row is new when the time of its last change (its latest history entry, else updatedAt / createdAt) is later than the time the
// user saw it (or than `since` when the user never opened it). What a person does to a row while its sheet is open does not make
// it new for that person: the sheet marks the row as seen when it opens, after every save or action, and when it closes.
// Kept per user in the browser (localStorage).

import { useCallback, useContext, useEffect, useState } from "react";

import { AuthContext } from "@/lib/auth-context";

const EVENT = "kanou:row-seen";
const keyOf = (userId) => `kanou.rowseen.v1.${userId}`;

function load(userId) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(keyOf(userId)) ?? "null");
    if (saved?.since) return saved;
  } catch {
    /* start again */
  }
  const fresh = { since: new Date().toISOString(), lists: {} };
  save(userId, fresh);
  return fresh;
}
function save(userId, data) {
  try {
    window.localStorage.setItem(keyOf(userId), JSON.stringify(data));
  } catch {
    /* the dots just will not be remembered */
  }
}

/** When the row last changed: its latest history entry, else updatedAt, else createdAt, else null. */
export function rowTime(row) {
  return row?.history?.[0]?.at ?? row?.updatedAt ?? row?.createdAt ?? row?.at ?? null;
}

/** "/purchase/orders/12?x=1" -> { list: "/purchase/orders", id: "12" } */
export function splitRowPath(path) {
  const clean = String(path ?? "").split("?")[0].replace(/\/$/, "");
  const cut = clean.lastIndexOf("/");
  return { list: clean.slice(0, cut), id: decodeURIComponent(clean.slice(cut + 1)) };
}

/** Notes the moment a user first appears in this browser (everything before it is old for them). Called when they are signed in. */
export function ensureSince(userId) {
  if (userId != null) load(userId);
}

export function markRowSeen(userId, list, id) {
  if (userId == null || !list || !id) return;
  const data = load(userId);
  data.lists[list] = { ...data.lists[list], [id]: new Date().toISOString() };
  save(userId, data);
  window.dispatchEvent(new Event(EVENT));
}

export function isNewRow(userId, list, id, row) {
  const time = rowTime(row);
  if (userId == null || !time) return false;
  const data = load(userId);
  return time > (data.lists[list]?.[id] ?? data.since);
}

/** { isNew(row, path), mark(path) } for the rows of a table; `path` is where the row opens (the rowTo of the table). */
export function useRowSeen() {
  const userId = useContext(AuthContext)?.user?.id ?? null; // without a signed-in user (a test, the login page) nothing is new
  const [, bump] = useState(0);
  useEffect(() => {
    const on = () => bump((value) => value + 1);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const isNew = useCallback(
    (row, path) => {
      const { list, id } = splitRowPath(path);
      return isNewRow(userId, list, id, row);
    },
    [userId],
  );
  const mark = useCallback(
    (path) => {
      const { list, id } = splitRowPath(path);
      markRowSeen(userId, list, id);
    },
    [userId],
  );
  return { isNew, mark };
}
