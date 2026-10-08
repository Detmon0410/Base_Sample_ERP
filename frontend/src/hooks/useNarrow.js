import { useEffect, useState } from "react";

/** Below this width (px) the screen is a tablet in portrait or narrower: the menu is a rail that opens over the page (docs/specs/f15-tablet.md). */
export const NARROW_BELOW = 992;
/** Below this width (px) the screen is a phone: lists are cards, the header has one "more" menu (docs/specs/f16-mobile.md). */
export const PHONE_BELOW = 768;

/** true while the window is narrower than `width` px. Without matchMedia (a test) it is false. */
function useBelow(width) {
  const query = `(max-width: ${width - 1}px)`;
  const [below, setBelow] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const list = window.matchMedia(query);
    const on = () => setBelow(list.matches);
    on();
    list.addEventListener("change", on);
    window.addEventListener("resize", on); // some browsers and emulators do not announce the change of the query
    return () => {
      list.removeEventListener("change", on);
      window.removeEventListener("resize", on);
    };
  }, [query]);
  return below;
}

/** true while the window is narrower than 992 px. */
export const useNarrow = () => useBelow(NARROW_BELOW);

/** true while the window is narrower than 768 px (a phone). */
export const usePhone = () => useBelow(PHONE_BELOW);
