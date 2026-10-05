import { useEffect, useState } from "react";

/**
 * Loads the active records of a master data list for a select (units of measure, materials, suppliers…).
 * Returns { options, status } where options are the raw records ({ id, code, name, … }).
 */
export function useOptions(service) {
  const [state, setState] = useState({ options: [], status: "loading" });

  useEffect(() => {
    let cancelled = false;
    service
      .list({ status: "active", pageSize: 100, sort: "code" })
      .then(({ items }) => !cancelled && setState({ options: items, status: "ready" }))
      .catch(() => !cancelled && setState({ options: [], status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [service]);

  return state;
}
