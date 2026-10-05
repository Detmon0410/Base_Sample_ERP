import { useEffect, useState } from "react";

/**
 * Documents of one customer for a searchable select (accepted quotations, customer POs): reloaded when the
 * customer changes. `labelOf(doc)` gives the second text of an option; the first is the document number.
 * Returns options shaped like master data options: { id, code, name }.
 */
export function useCustomerDocuments(service, customerId, params, { numberOf, labelOf }) {
  const [state, setState] = useState({ key: "", options: [] });
  const key = customerId ? `${customerId}:${JSON.stringify(params)}` : "";

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    service
      .list({ ...params, customer: String(customerId), pageSize: 100 })
      .then(({ items }) => {
        if (!cancelled) setState({ key, options: items.map((doc) => ({ id: doc.id, code: numberOf(doc), name: labelOf(doc) })) });
      })
      .catch(() => {
        if (!cancelled) setState({ key, options: [] });
      });
    return () => {
      cancelled = true;
    };
    // params, numberOf and labelOf are constants of the caller; key already holds the params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, key]);

  return state.key === key ? state.options : [];
}
