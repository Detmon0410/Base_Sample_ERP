import { useCallback, useEffect, useRef, useState } from "react";

import { getDashboard } from "@/services/dashboard.service";

const REFETCH_AFTER_MS = 5 * 60 * 1000;

/**
 * status: "loading" (first load) | "ready" | "refreshing" (data stays visible) | "error" (no data)
 * Loads on open, on Refresh, and when the browser tab comes back after 5 minutes (no polling).
 */
export function useDashboard() {
  const [state, setState] = useState({ status: "loading", data: null, error: null });
  const hiddenAt = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await getDashboard();
      setState({ status: "ready", data, error: null });
    } catch (error) {
      setState((previous) => ({ status: previous.data ? "ready" : "error", data: previous.data, error }));
    }
  }, []);

  const refresh = useCallback(() => {
    setState((previous) => ({ ...previous, status: previous.data ? "refreshing" : "loading" }));
    return fetchData();
  }, [fetchData]);

  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then((data) => !cancelled && setState({ status: "ready", data, error: null }))
      .catch((error) => !cancelled && setState({ status: "error", data: null, error }));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now();
      } else if (hiddenAt.current && Date.now() - hiddenAt.current > REFETCH_AFTER_MS) {
        hiddenAt.current = null;
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refresh]);

  return { ...state, refresh };
}
