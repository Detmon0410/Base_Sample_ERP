import { useCallback, useEffect, useState } from "react";

/**
 * Loads something when the page opens and again when `deps` change or `reload()` is called.
 * `loading` is true until the answer for the current deps has arrived; after `reload()` the old data stays on the screen until
 * the new data arrives (`loading` stays false). A failed call gives `error` (an ApiError).
 */
export function useLoad(load, deps) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ deps: null, data: null, error: null });
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    let current = true;
    load().then(
      (data) => current && setState({ deps: depsKey, data, error: null }),
      (error) => current && setState({ deps: depsKey, data: null, error }),
    );
    return () => {
      current = false;
    };
    // `load` is a new function on every render; the deps and the reload counter say when to load again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, tick]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  const loading = state.deps !== depsKey;
  return { data: loading ? null : state.data, error: loading ? null : state.error, loading, reload };
}
