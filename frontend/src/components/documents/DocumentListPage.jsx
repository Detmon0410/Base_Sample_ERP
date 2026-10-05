import { PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { DataTable } from "@/components/common/DataTable";
import { EntitySelect } from "@/components/common/EntitySelect";
import { PageHeader } from "@/components/common/PageHeader";
import { PANEL_CLASS } from "@/components/common/SheetSection";
import { Pagination } from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZE } from "@/config/masterData";
import { useListQuery } from "@/hooks/useListQuery";
import { useOptions } from "@/hooks/useOptions";
import { useResourceList } from "@/hooks/useResourceList";
import { customerService } from "@/services/customer.service";

const SEARCH_DELAY_MS = 300;
const EXTRA = ["customer", "from", "to"];

/**
 * List of a Sale document (quotations, customer POs, sale orders, delivery notes): search, status, customer and
 * date range above the table, paging below, New on the right. The filters live in the URL.
 *
 *   statuses   status keys for the status filter, or null when the document has no status (customer PO)
 *   newTo      route of the New button, or null when the user may not create
 */
export function DocumentListPage({
  title,
  service,
  statuses,
  columns,
  rowTo,
  newTo,
  newLabel,
  emptyText,
  noResultText,
  searchLabel,
}) {
  const { t } = useTranslation(["sale", "master"]);
  const { query, setQuery } = useListQuery({ defaultSort: "-date", extra: EXTRA });
  const list = useResourceList(service, query);
  const { options: customers } = useOptions(customerService);

  // Local text so typing is instant; the URL (and the request) follows 300 ms after the last key.
  const [text, setText] = useState(query.q);
  const [lastUrlText, setLastUrlText] = useState(query.q);
  if (query.q !== lastUrlText) {
    setLastUrlText(query.q);
    setText(query.q);
  }
  useEffect(() => {
    if (text === query.q) return undefined;
    const timer = setTimeout(() => setQuery({ q: text.trim() }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, query.q, setQuery]);

  const filtered = query.q !== "" || query.status !== "all" || query.customer !== "" || query.from !== "" || query.to !== "";
  const clear = () => {
    setText("");
    setQuery({ q: "", status: "all", customer: "", from: "", to: "" });
  };

  const emptyContent = filtered ? (
    <div className="flex flex-col items-center gap-3">
      <p>{noResultText}</p>
      <Button type="button" variant="outline" onClick={clear}>
        {t("sale:filters.clear")}
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
      <div className="mb-4 flex flex-wrap items-end gap-3" role="search" aria-label={t("sale:filters.label")}>
        <div className="relative w-72">
          <SearchIcon aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 my-auto size-5 text-muted-foreground" />
          <Input type="search" value={text} onChange={(event) => setText(event.target.value)} placeholder={searchLabel} aria-label={searchLabel} className="h-10 pl-10" />
        </div>

        {statuses ? (
          <Select value={query.status} onValueChange={(status) => setQuery({ status })}>
            <SelectTrigger className="w-52" aria-label={t("sale:filters.status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("sale:filters.status")}: {t("sale:filters.all")}
              </SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`sale:status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <div className="w-64">
          <EntitySelect
            id="filter-customer"
            options={customers}
            value={query.customer ? Number(query.customer) : ""}
            onChange={(id) => setQuery({ customer: String(id) })}
            placeholder={t("sale:filters.anyCustomer")}
            aria-label={t("sale:filters.customer")}
          />
        </div>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t("sale:filters.from")}
          <Input type="date" value={query.from} max={query.to || undefined} onChange={(event) => setQuery({ from: event.target.value })} className="h-10 w-44" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t("sale:filters.to")}
          <Input type="date" value={query.to} min={query.from || undefined} onChange={(event) => setQuery({ to: event.target.value })} className="h-10 w-44" />
        </label>

        {filtered ? (
          <Button type="button" variant="outline" onClick={clear}>
            <XIcon aria-hidden="true" /> {t("sale:filters.clear")}
          </Button>
        ) : null}

        {newTo ? (
          <Button asChild className="ml-auto">
            <Link to={newTo}>
              <PlusIcon /> {newLabel}
            </Link>
          </Button>
        ) : null}
      </div>

      <DataTable
        ariaLabel={title}
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

      {list.meta ? <Pagination page={list.meta.page} pageSize={list.meta.pageSize ?? PAGE_SIZE} total={list.meta.total} onChange={(page) => setQuery({ page })} /> : null}
      </div>
    </>
  );
}
