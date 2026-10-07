import { roleInDepartment } from "@/utils/permissions";

/** Statuses in the order a document goes through them (docs/specs/f7-factory.md). */
export const WORK_ORDER_STATUSES = ["draft", "scheduled", "in_process", "finished", "cancelled"];
export const TRANSFER_STATUSES = ["draft", "transferred"];

export const factoryRole = (user) => roleInDepartment(user, "Factory");
export const canWork = (user) => Boolean(factoryRole(user));
export const isFactoryManager = (user) => ["Manager", "Admin"].includes(factoryRole(user));

const changes = (doc) => doc.history?.filter((entry) => entry.status).length ?? 0;

/**
 * The status buttons of a Work Order in its current status for this user (same idea as config/sale.js).
 *   key         action name sent to the server (texts: factory:actions.<key>.*)
 *   primary     shown as the main (light blue) button
 *   noteLabel   "optional" | "required" | none: a note box in the confirmation
 *   danger      red button
 * Anything not listed is not offered, so the user never sees a button that fails.
 */
export function workOrderActions(wo, user) {
  const manager = isFactoryManager(user);
  const list = [];
  const stepsLeft = wo.steps?.some((step) => step.status !== "done");
  if (wo.status === "draft" && manager) list.push({ key: "schedule", primary: true, noteLabel: "optional" });
  if (wo.status === "scheduled") {
    list.push({ key: "start", primary: true, noteLabel: "optional" });
    if (manager) list.push({ key: "back-to-draft", noteLabel: "optional" });
  }
  // Q4: a Manager may finish early with a reason; a running step blocks it until it is done
  if (wo.status === "in_process" && manager && !wo.steps?.some((step) => step.status === "in_progress")) {
    list.push({ key: "finish", primary: true, noteLabel: stepsLeft ? "required" : "optional" });
  }
  if (["draft", "scheduled"].includes(wo.status)) list.push({ key: "cancel", noteLabel: "optional", danger: true });
  if (wo.status === "in_process" && manager) list.push({ key: "cancel", noteLabel: "required", danger: true });
  if (manager && changes(wo) > 1) list.push({ key: "revert", noteLabel: "required" });
  return list;
}

export function transferActions(transfer, user) {
  const manager = isFactoryManager(user);
  const list = [];
  if (transfer.status === "draft" && manager) list.push({ key: "transfer", primary: true, noteLabel: "optional" });
  if (transfer.status === "transferred" && manager) list.push({ key: "revert", noteLabel: "required" });
  return list;
}

/** What a user may do with one step of a Work Order (the buttons of the tracking table and the shop-floor cards). */
export function stepAbilities(wo, step, user) {
  const manager = isFactoryManager(user);
  const open = ["scheduled", "in_process"].includes(wo.status);
  const next = wo.steps.find((item) => item.stepNo === step.stepNo + 1);
  return {
    // a Worker starts a step when the one before is done; a Manager may start it early (with a reason)
    start: canWork(user) && open && step.status === "pending" && (step.canStart || manager),
    startEarly: step.status === "pending" && !step.canStart,
    done: canWork(user) && wo.status === "in_process" && step.status === "in_progress",
    reopen: manager && wo.status === "in_process" && step.status === "done" && (!next || next.status === "pending"),
  };
}
