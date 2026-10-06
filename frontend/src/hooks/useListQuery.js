import { useCallback } from "react";
import { useSearchParams } from "react-router";

import { PAGE_SIZE, PAGE_SIZES } from "@/config/masterData";

/**
 * Search text, status filter, sort and page of a list live in the URL (?q=&status=&sort=&page=),
 * so Back / forward and a reload keep them. Defaults are left out of the URL.
 */
export function useListQuery({ defaultSort = "code", extra = [] } = {}) {
  const [params, setParams] = useSearchParams();

  const query = {
    q: params.get("q") ?? "",
    status: params.get("status") ?? "all",
    sort: params.get("sort") ?? defaultSort,
    page: Math.max(1, Number(params.get("page")) || 1),
    size: PAGE_SIZES.includes(Number(params.get("size"))) ? Number(params.get("size")) : PAGE_SIZE,
    // Extra filters of a list (documents: customer, from, to), "" when not set.
    ...Object.fromEntries(extra.map((key) => [key, params.get(key) ?? ""])),
  };

  const setQuery = useCallback(
    (changes) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          const resetsPage = ["q", "status", "sort", "size", ...extra].some((key) => key in changes);
          for (const [key, value] of Object.entries(changes)) {
            const isDefault =
              value === "" || value == null || (key === "status" && value === "all") ||
              (key === "sort" && value === defaultSort) || (key === "page" && Number(value) === 1) ||
              (key === "size" && Number(value) === PAGE_SIZE);
            if (isDefault) next.delete(key);
            else next.set(key, String(value));
          }
          if (resetsPage && !("page" in changes)) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams, defaultSort, extra.join(",")],
  );

  return { query, setQuery };
}
