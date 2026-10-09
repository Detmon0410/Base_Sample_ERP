import { useCallback, useEffect, useState } from "react";

/**
 * Loads something when the page opens and again when `deps` change or `reload()` is called.
 * `loading` is true until the answer for the current deps has arrived; a failed call gives `error` (an ApiError).
 */
export function useLoad(load, deps) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ key: null, data: null, error: null });
  const key = `${JSON.stringify(deps)}#${tick}`;

  useEffect(() => {
    let current = true;
    load().then(
      (data) => current && setState({ key, data, error: null }),
      (error) => current && setState({ key, data: null, error }),
    );
    return () => {
      current = false;
    };
    // `load` is a new function on every render; the deps say when to load again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  const loading = state.key !== key;
  return { data: loading ? null : state.data, error: loading ? null : state.error, loading, reload };
}
