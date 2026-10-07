import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/DataTable";
import { ListToolbar } from "@/components/common/ListToolbar";
import { ListEmpty } from "@/components/common/ListEmpty";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusStepper } from "@/components/documents/StatusStepper";
import { PANEL_CLASS } from "@/components/common/SheetSection";
import { Pagination } from "@/components/common/Pagination";
import { ViewSwitch } from "@/components/common/ViewSwitch";
import { PAGE_SIZE } from "@/config/masterData";
import { useListQuery } from "@/hooks/useListQuery";
import { useOptions } from "@/hooks/useOptions";
import { useResourceList } from "@/hooks/useResourceList";
import { customerService } from "@/services/customer.service";

const SEARCH_DELAY_MS = 300;
const NO_FILTERS = [];

/** The views of a board: its own and, unless `noTable`, the table. */
const viewsOf = (board) => (board.noTable ? board.views : [...board.views, "table"]);

function readView(board) {
  try {
    const saved = window.localStorage.getItem(board.viewKey);
    return viewsOf(board).includes(saved) ? saved : board.views[0];
  } catch {
    return board.views[0];
  }
}

/**
 * List of a document (Sale: quotations, customer POs, sale orders, delivery notes; Factory: work orders, transfers):
 * search and a Filters menu above, paging below, New on the right. The filters live in the URL.
 *
 *   statuses       status keys for the status filter, or null when the document has no status (customer PO)
 *   stepper        show the status stepper above the list: every status with its count, a step filters the list
 *   newTo          route of the New button, or null when the user may not create
 *   defaultSort    sort when the URL has none (default "-date")
 *   customerFilter false when the document has no customer (transfers, work orders)
 *   extraFilters   more filters of the Filters menu: [{ key, label, kind, options }] (their keys go in extraKeys)
 *   extraKeys      query keys of those filters, kept in the URL and sent to the service
 *   dateLabel      name of the date range filter (default "Date")
 *   board          { viewKey, views, render(list, context, view) }: the list can also be shown as a board (a switch
 *                  appears, the choice is remembered). `views` are the board views, e.g. ["kanban", "cards"]; the
 *                  table is always offered. A "kanban" view loads up to 100 rows and has no paging.
 *   beforePanel    something shown between the stepper and the list; a function gets the view ("kanban", "cards", "table")
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
  stepper = false,
  stepperUnit = "orders",
  defaultSort = "-date",
  customerFilter = true,
  extraFilters = NO_FILTERS,
  extraKeys = NO_FILTERS,
  dateLabel,
  board,
  beforePanel,
  statusNamespace = "sale",
}) {
  const { t } = useTranslation(["sale", "master", "common"]);
  const queryKeys = useMemo(() => [...(customerFilter ? ["customer"] : []), ...extraKeys, "from", "to"], [customerFilter, extraKeys]);
  const { query, setQuery } = useListQuery({ defaultSort, extra: queryKeys });
  const [view, setView] = useState(() => (board ? readView(board) : "table"));
  const kanban = board && (board.fullViews ?? ["kanban"]).includes(view);
  const fill = useRef(null);
  // the kanban uses the whole window: from its top edge to the bottom of the screen, and the columns scroll inside
  useLayoutEffect(() => {
    const node = fill.current;
    if (!kanban || !node) return undefined;
    const size = () => {
      node.style.height = `${Math.max(window.innerHeight - node.getBoundingClientRect().top, 320)}px`;
    };
    size();
    window.addEventListener("resize", size);
    return () => {
      window.removeEventListener("resize", size);
      node.style.height = "";
    };
  }, [kanban]);
  const changeView = (next) => {
    setView(next);
    try {
      window.localStorage.setItem(board.viewKey, next);
    } catch {
      /* the choice just will not be remembered */
    }
  };

  const list = useResourceList(service, kanban ? { ...query, size: 100, page: 1 } : query);
  const { options: customers } = useOptions(customerService, { enabled: customerFilter });
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

  const filters = useMemo(
    () => [
      ...(statuses ? [{ key: "status", label: t("sale:filters.status"), kind: "options", emptyValue: "all", options: statuses.map((status) => ({ value: status, label: t(`${statusNamespace}:status.${status}`) })) }] : []),
      ...(customerFilter ? [{ key: "customer", label: t("sale:filters.customer"), kind: "search", options: customers.map((customer) => ({ value: String(customer.id), label: `${customer.code} · ${customer.name}` })) }] : []),
      ...extraFilters,
      { key: "date", label: dateLabel ?? t("sale:filters.date"), kind: "dateRange", fromKey: "from", toKey: "to" },
    ],
    [statuses, customers, customerFilter, extraFilters, dateLabel, statusNamespace, t],
  );
  const filtered = query.q !== "" || query.status !== "all" || queryKeys.some((key) => query[key] !== "");
  const clear = () => {
    setText("");
    setQuery({ q: "", status: "all", ...Object.fromEntries(queryKeys.map((key) => [key, ""])) });
  };

  const emptyContent = (
    <ListEmpty
      filtered={filtered}
      text={filtered ? noResultText : emptyText}
      onClear={clear}
      clearLabel={t("sale:filters.clear")}
      newTo={newTo}
      newLabel={newLabel}
    />
  );

  return (
    <>
      <PageHeader title={title} />

      {stepper ? <StatusStepper unit={stepperUnit} statuses={statuses} counts={list.meta?.statusCounts} value={query.status} onSelect={(status) => setQuery({ status })} /> : null}

      {typeof beforePanel === "function" ? beforePanel(view) : beforePanel}

      <div ref={fill} className={kanban ? "-mx-5 -mb-5 flex flex-col" : `${PANEL_CLASS} p-5`}>
        <div className={kanban ? "px-3" : undefined}>
        <ListToolbar
          searchValue={text}
          onSearchChange={setText}
          searchLabel={searchLabel}
          filters={filters}
          values={query}
          onChange={setQuery}
          newTo={newTo}
          newLabel={newLabel}
          extra={board ? <ViewSwitch views={viewsOf(board)} value={view} onChange={changeView} labels={{ kanban: t("common:views.kanban"), timeline: t("common:views.timeline"), cards: t("common:views.cards"), table: t("common:views.table"), group: t("common:views.label") }} /> : null}
        />
        </div>

        {board && view !== "table" ? (
          board.render(list, { emptyContent }, view)
        ) : (
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
            total={list.meta?.total}
            sums={list.meta?.sums}
          />
        )}

        {list.meta && !kanban ? <Pagination page={list.meta.page} pageSize={list.meta.pageSize ?? PAGE_SIZE} total={list.meta.total} onChange={(page) => setQuery({ page })} onPageSizeChange={(size) => setQuery({ size })} /> : null}
      </div>
    </>
  );
}
