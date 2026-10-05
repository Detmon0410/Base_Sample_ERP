import { useCallback, useState } from "react";

const STORAGE_KEY = "kanou.sidebarWidth";
export const SIDEBAR_DEFAULT_WIDTH = 232; // px
export const SIDEBAR_MIN_WIDTH = 208;
export const SIDEBAR_MAX_WIDTH = 360;

const clamp = (value) => Math.min(Math.max(value, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);

function readInitial() {
  try {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY));
    return saved ? clamp(saved) : SIDEBAR_DEFAULT_WIDTH;
  } catch {
    return SIDEBAR_DEFAULT_WIDTH;
  }
}

/** Width of the expanded sidebar in px, changed by dragging its right edge and remembered in this browser. */
export function useSidebarWidth() {
  const [width, setWidth] = useState(readInitial);

  const commit = useCallback((value) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Math.round(value)));
    } catch {
      /* ignore: the width just will not survive a reload */
    }
  }, []);

  return { width, setWidth, commit };
}
