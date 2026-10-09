import { useSyncExternalStore } from "react";

// Where the menu is: "top" (a row in the bar at the top, the default) or "side" (a list on the left). The user switches with one
// button in the bar and the choice is kept in this browser.

const KEY = "kanou.layout";
const EVENT = "kanou:layout-changed";

export function getLayoutMode() {
  try {
    return window.localStorage.getItem(KEY) === "side" ? "side" : "top";
  } catch {
    return "top"; // storage can be blocked: the default still works
  }
}

export function setLayoutMode(mode) {
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    /* ignore: the choice just will not survive a reload */
  }
  window.dispatchEvent(new Event(EVENT));
}

const subscribe = (callback) => {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback); // another tab
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};

/** [mode, toggle]: the current place of the menu and a function that moves it to the other place. */
export function useLayoutMode() {
  const mode = useSyncExternalStore(subscribe, getLayoutMode, () => "top");
  return [mode, () => setLayoutMode(mode === "top" ? "side" : "top")];
}
