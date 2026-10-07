import { useSyncExternalStore } from "react";

// One switch for every status stepper (Sale, Factory, ...): the eye in the header hides or shows them all. It is
// remembered in this browser; where storage is blocked it still works until the page is reloaded.
const KEY = "kanou.stepper.hidden";
const listeners = new Set();
let hidden = false;
try {
  hidden = window.localStorage.getItem(KEY) === "1";
} catch {
  // storage is not available: keep the value in memory only
}

const subscribe = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};
const snapshot = () => !hidden;

export function setSteppersVisible(visible) {
  hidden = !visible;
  try {
    window.localStorage.setItem(KEY, hidden ? "1" : "0");
  } catch {
    // ignore
  }
  listeners.forEach((callback) => callback());
}

/** [visible, toggle]: whether the status steppers are shown, and a function that flips it. */
export function useStepperVisible() {
  const visible = useSyncExternalStore(subscribe, snapshot, snapshot);
  return [visible, () => setSteppersVisible(!visible)];
}
