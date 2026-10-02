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

      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-80">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 my-auto size-5 text-muted-foreground"
          />
          <Input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={searchLabel}
            aria-label={searchLabel}
            className="h-10 pl-10"
          />
        </div>

        <Select value={query.status} onValueChange={(status) => setQuery({ status })}>
          <SelectTrigger className="w-44" aria-label={t("common.statusFilter")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.statusFilter")}: {t("common.all")}</SelectItem>
            <SelectItem value="active">{t("common.active")}</SelectItem>
            <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
          </SelectContent>
        </Select>

        {newTo ? (
          <Button asChild className="ml-auto">
            <Link to={newTo}>
              <PlusIcon /> {newLabel}
            </Link>
          </Button>
        ) : null}
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
    </>
  );
}
