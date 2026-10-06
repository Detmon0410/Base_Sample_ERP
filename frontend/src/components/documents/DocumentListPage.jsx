import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { DataTable } from "@/components/common/DataTable";
import { ListToolbar } from "@/components/common/ListToolbar";
import { ListEmpty } from "@/components/common/ListEmpty";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusStepper } from "@/components/documents/StatusStepper";
import { PANEL_CLASS } from "@/components/common/SheetSection";
import { Pagination } from "@/components/common/Pagination";
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
 *   stepper    show the status stepper above the list (sale orders): every status with its count, a step filters the list
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
  stepper = false,
  stepperUnit = "orders",
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

  const filters = useMemo(
    () => [
      ...(statuses ? [{ key: "status", label: t("sale:filters.status"), kind: "options", emptyValue: "all", options: statuses.map((status) => ({ value: status, label: t(`sale:status.${status}`) })) }] : []),
      { key: "customer", label: t("sale:filters.customer"), kind: "search", options: customers.map((customer) => ({ value: String(customer.id), label: `${customer.code} · ${customer.name}` })) },
      { key: "date", label: t("sale:filters.date"), kind: "dateRange", fromKey: "from", toKey: "to" },
    ],
    [statuses, customers, t],
  );
  const filtered = query.q !== "" || query.status !== "all" || query.customer !== "" || query.from !== "" || query.to !== "";
  const clear = () => {
    setText("");
    setQuery({ q: "", status: "all", customer: "", from: "", to: "" });
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

      <div className={`${PANEL_CLASS} p-5`}>
      <ListToolbar
        searchValue={text}
        onSearchChange={setText}
        searchLabel={searchLabel}
        filters={filters}
        values={query}
        onChange={setQuery}
        newTo={newTo}
        newLabel={newLabel}
      />

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

      {list.meta ? <Pagination page={list.meta.page} pageSize={list.meta.pageSize ?? PAGE_SIZE} total={list.meta.total} onChange={(page) => setQuery({ page })} onPageSizeChange={(size) => setQuery({ size })} /> : null}
      </div>
    </>
  );
}
