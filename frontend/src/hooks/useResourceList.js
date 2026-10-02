import { useCallback, useEffect, useState } from "react";

import { PAGE_SIZE } from "@/config/masterData";

/**
 * Loads one page of a master data list whenever `query` changes.
 * status: "loading" (first load, nothing to show) | "ready" | "error"
 * fetching: a newer page is loading on top of the old one (the table dims instead of flashing).
 */
export function useResourceList(service, query) {
  const [state, setState] = useState({ key: null, status: "loading", items: [], meta: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const { q, status, sort, page } = query;
  const key = JSON.stringify([q, status, sort, page, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    service
      .list({ q, status, sort, page, pageSize: PAGE_SIZE })
      .then(({ items, meta }) => {
        if (!cancelled) setState({ key, status: "ready", items, meta, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState((previous) => ({ ...previous, key, status: "error", error }));
      });
    return () => {
      cancelled = true;
    };
  }, [service, q, status, sort, page, key]);

  const retry = useCallback(() => setReloadKey((current) => current + 1), []);

  return {
    status: state.status === "error" && state.key !== key ? "loading" : state.status,
    items: state.items,
    meta: state.meta,
    error: state.error,
    fetching: state.key !== key,
    retry,
  };
}
