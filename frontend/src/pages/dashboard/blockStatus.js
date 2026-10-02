/** Maps loading flag, per-block error and list length to a BlockCard status. */
export function blockStatus({ loading, hasError, items }) {
  if (loading) return "loading";
  if (hasError) return "error";
  if (!items || items.length === 0) return "empty";
  return "ready";
}
