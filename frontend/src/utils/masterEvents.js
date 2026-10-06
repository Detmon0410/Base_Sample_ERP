// Master data lists stay open behind the detail sheet. After a record is saved, deactivated or deleted
// the sheet announces it here and every open list reloads itself.
const EVENT = "kanou:master-changed";

export const notifyMasterChanged = () => window.dispatchEvent(new Event(EVENT));

/** Subscribes to changes; returns the unsubscribe function. */
export function onMasterChanged(callback) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

// The Refresh button in the header asks every open list and the dashboard to load again, so the user
// can see new data without reloading the whole page (which would also drop the page state).
export const requestRefresh = notifyMasterChanged;
export const onRefresh = onMasterChanged;
