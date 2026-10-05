import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

// A little longer than the closing animation in index.css (280ms), so the panel has slid out
// before the route (and the sheet with it) is removed.
const EXIT_MS = 300;

/**
 * Leaving a detail sheet: first `leaving` becomes true (give it to <DetailSheet open={!leaving}> so the
 * panel slides out), then the app navigates. Use `exitTo(path)` instead of `navigate(path)` in a sheet.
 */
export function useSheetExit() {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const exitTo = useCallback(
    (path) => {
      setLeaving(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => navigate(path), EXIT_MS);
    },
    [navigate],
  );

  return { leaving, exitTo };
}
