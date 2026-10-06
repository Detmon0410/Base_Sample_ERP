import { useCallback, useEffect, useRef, useState } from "react";

import { getDashboard } from "@/services/dashboard.service";
import { onRefresh } from "@/utils/masterEvents";

// "Real time" without a push channel: ask again every few seconds while the tab is visible.
// When the backend offers SSE / WebSocket, replace this hook's internals; the page does not change.
export const DASHBOARD_POLL_MS = 15 * 1000;

/** One request. Never runs two at once; keeps the last data on screen if it fails. */
function requestDashboard(setState, inFlight) {
  if (inFlight.current) return;
  inFlight.current = true;
  getDashboard()
    .then((data) => setState({ status: "ready", data, error: null }))
    .catch((error) =>
      setState((previous) => ({ status: previous.data ? "ready" : "error", data: previous.data, error })),
    )
    .finally(() => {
      inFlight.current = false;
    });
}

/**
 * status: "loading" (first load, no data yet) | "ready" | "error" (first load failed, no data)
 * Updates itself: loads when the page opens, every 15 s while the tab is visible, and right away
 * when the tab becomes visible again. Background updates are silent (no skeleton, no flicker);
 * if one fails the last data stays on screen and `error` is set until a later update succeeds.
 */
export function useDashboard() {
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const inFlight = useRef(false);

  const load = useCallback(() => requestDashboard(setState, inFlight), []);

  // First load + polling while the tab is visible.
  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (!document.hidden) load();
    }, DASHBOARD_POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // The Refresh button in the header.
  useEffect(() => onRefresh(load), [load]);

  // Catch up immediately when the user comes back to the tab.
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [load]);

  // `retry` is for the "Try again" buttons of a failed block / first load.
  return { ...state, retry: load };
}
