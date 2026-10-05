import { PlusIcon, SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { DataTable } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_CONTROL, FilterField } from "@/components/common/FilterField";
import { PANEL_CLASS } from "@/components/common/SheetSection";
import { PAGE_SIZE } from "@/config/masterData";

const SEARCH_DELAY_MS = 300;

/**
 * Shared list screen for master data (F3 spec 2.1): search + status filter + New on top,
 * sortable table, pagination. State lives in the URL (see useListQuery); data comes from
 * useResourceList. The page title is only for screen readers (the breadcrumb shows it).
 */
export function ListPage({
  title,
  query,
  setQuery,
  list,
  columns,
  rowTo,
  newTo,
  newLabel,
  emptyText,
  noResultText,
  searchLabel,
  ariaLabel,
}) {
  const { t } = useTranslation("master");

  // Local text so typing is instant; the URL (and the request) follows 300 ms after the last key.
  const [text, setText] = useState(query.q);
  const [lastUrlText, setLastUrlText] = useState(query.q);
  if (query.q !== lastUrlText) {
    // Back / forward changed the URL: show it in the box.
    setLastUrlText(query.q);
    setText(query.q);
  }
  useEffect(() => {
    if (text === query.q) return undefined;
    const timer = setTimeout(() => setQuery({ q: text.trim() }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, query.q, setQuery]);

  const filtered = query.q !== "" || query.status !== "all";
  const clearFilters = () => {
    setText("");
    setQuery({ q: "", status: "all" });
  };

  const emptyContent = filtered ? (
    <div className="flex flex-col items-center gap-3">
      <p>{noResultText}</p>
      <Button type="button" variant="outline" onClick={clearFilters}>
        {t("common.clearFilters")}
      </Button>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-3">
      <p>{emptyText}</p>
      {newTo ? (
        <Button asChild>
          <Link to={newTo}>
            <PlusIcon /> {newLabel}
          </Link>
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      <PageHeader title={title} />

      <div className={`${PANEL_CLASS} p-5`}>
      {/* Row 1: search on the left, New on the right, both 36px high. Row 2: the filters, which wrap among themselves. */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="relative h-9 min-w-0 max-w-md flex-1">
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
            <Input type="search" value={text} onChange={(event) => setText(event.target.value)} placeholder={searchLabel} aria-label={searchLabel} className="h-9 pl-9" />
          </div>
        {newTo ? (
          <Button asChild className="h-9 shrink-0">
            <Link to={newTo}>
              <PlusIcon /> {newLabel}
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
          <FilterField label={t("common.statusFilter")} className="w-52">
            <Select value={query.status} onValueChange={(status) => setQuery({ status })}>
              <SelectTrigger className={`${FILTER_CONTROL} w-full`} aria-label={t("common.statusFilter")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start" className="min-w-44">
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="active">{t("common.active")}</SelectItem>
                <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
      </div>

      <DataTable
        ariaLabel={ariaLabel}
        columns={columns}
        rows={list.items}
        sort={query.sort}
        onSortChange={(sort) => setQuery({ sort })}
        rowTo={rowTo}
        status={list.status}
        fetching={list.fetching}
        onRetry={list.retry}
        emptyContent={emptyContent}
      />

      {list.meta ? (
        <Pagination
          page={list.meta.page}
          pageSize={list.meta.pageSize ?? PAGE_SIZE}
          total={list.meta.total}
          onChange={(page) => setQuery({ page })}
        />
      ) : null}
      </div>
    </>
  );
}
