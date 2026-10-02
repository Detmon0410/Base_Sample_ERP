import { useCallback, useState } from "react";

const STORAGE_KEY = "kanou.sidebar";

function readInitial() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "collapsed";
  } catch {
    return true;
  }
}

/** Open / closed state of the sidebar, remembered in this browser (default: open). */
export function useSidebarState() {
  const [open, setOpenState] = useState(readInitial);

  const setOpen = useCallback((value) => {
    setOpenState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "expanded" : "collapsed");
    } catch {
      /* ignore: the choice just will not survive a reload */
    }
  }, []);

  return [open, setOpen];
}
