import { conflict } from "./errors.js";

// groups: [{ kind, count, items: [names] }]. Throws 409 IN_USE when any group is not empty.
export function refuseIfInUse(groups, message = "Record is in use") {
  const used = groups.filter((g) => g.count > 0).map((g) => ({ kind: g.kind, count: g.count, items: g.items.slice(0, 5) }));
  if (used.length) throw conflict("IN_USE", message, used);
}
