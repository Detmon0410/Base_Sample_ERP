// Master data lists stay open behind the detail sheet. After a record is saved, deactivated or deleted
// the sheet announces it here and every open list reloads itself.
const EVENT = "kanou:master-changed";

export const notifyMasterChanged = () => window.dispatchEvent(new Event(EVENT));

/** Subscribes to changes; returns the unsubscribe function. */
export function onMasterChanged(callback) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
