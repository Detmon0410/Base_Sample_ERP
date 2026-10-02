import { useCallback } from "react";
import { useSearchParams } from "react-router";

/**
 * Search text, status filter, sort and page of a list live in the URL (?q=&status=&sort=&page=),
 * so Back / forward and a reload keep them. Defaults are left out of the URL.
 */
export function useListQuery({ defaultSort = "code" } = {}) {
  const [params, setParams] = useSearchParams();

  const query = {
    q: params.get("q") ?? "",
    status: params.get("status") ?? "all",
    sort: params.get("sort") ?? defaultSort,
    page: Math.max(1, Number(params.get("page")) || 1),
  };

  const setQuery = useCallback(
    (changes) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          const resetsPage = ["q", "status", "sort"].some((key) => key in changes);
          for (const [key, value] of Object.entries(changes)) {
            const isDefault =
              value === "" || value == null || (key === "status" && value === "all") ||
              (key === "sort" && value === defaultSort) || (key === "page" && Number(value) === 1);
            if (isDefault) next.delete(key);
            else next.set(key, String(value));
          }
          if (resetsPage && !("page" in changes)) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setParams, defaultSort],
  );

  return { query, setQuery };
}
