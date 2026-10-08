import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation, useSearchParams } from "react-router";

import { RemountOnId } from "@/components/common/RemountOnId";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { StockStatusBadge } from "@/components/stock/StockStatusBadge";
import { MATERIAL_STOCK_STATUSES, PRODUCT_STOCK_STATUSES } from "@/config/stock";
import { useOptions } from "@/hooks/useOptions";
import { cn } from "@/lib/utils";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { balanceService } from "@/services/stock.service";
import { formatNumber } from "@/utils/format";

import { StockItemSheet } from "./StockItemSheet";

const KINDS = ["material", "product"];
const WAREHOUSE_KEY = ["warehouse"];

/** The Materials | Products switch above the list. */
function KindTabs({ kind, onChange }) {
  const { t } = useTranslation("stock");
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2">
    <div role="group" aria-label={t("overview.tabs.label")} className="flex w-fit overflow-hidden rounded-lg border border-input bg-card">
      {KINDS.map((key, index) => (
        <button
          key={key}
          type="button"
          aria-pressed={kind === key}
          onClick={() => onChange(key)}
          className={cn(
            "h-11 px-6 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            kind === key ? "bg-secondary font-semibold text-primary" : "text-muted-foreground hover:bg-muted",
            index > 0 && "border-l border-input",
          )}
        >
          {t(`overview.tabs.${key}`)}
        </button>
      ))}
    </div>
    <p className="max-w-3xl text-sm text-muted-foreground">{t("overview.reservedHint")}</p>
    </div>
  );
}

function OverviewList() {
  const { t, i18n } = useTranslation(["stock", "nav"]);
  const { search } = useLocation();
  const [params, setParams] = useSearchParams();
  const kind = params.get("kind") === "product" ? "product" : "material";
  const { options: warehouses } = useOptions(simpleMasterServices.warehouses);

  // the tab is in the address (?kind=product); changing it drops the status filter, which differs between the two
  const changeKind = (next) =>
    setParams(
      (previous) => {
        const query = new URLSearchParams(previous);
        query.delete("status");
        query.delete("page");
        query.delete("warehouse");
        if (next === "material") query.delete("kind");
        else query.set("kind", next);
        return query;
      },
      { replace: true },
    );

  // the list asks the balances of the chosen kind
  const service = useMemo(() => ({ key: `/stock/balances/${kind}`, list: (query) => balanceService.list({ ...query, kind }) }), [kind]);

  const columns = useMemo(() => {
    const language = i18n.language;
    const status = { key: "status", header: t("stock:overview.columns.status"), sortable: true, render: (row) => <StockStatusBadge status={row.status} /> };
    const base = [
      { key: "code", header: t("stock:overview.columns.code"), sortable: true },
      { key: "name", header: t("stock:overview.columns.name"), sortable: true },
      { key: "warehouseName", secondary: true, header: t("stock:overview.columns.warehouse"), sortable: true },
      { key: "onHand", header: t("stock:overview.columns.onHand"), sortable: true, align: "right", render: (row) => `${formatNumber(row.onHand, language)} ${row.uom}` },
      ...(kind === "material"
        ? [{ key: "onOrder", secondary: true, header: t("stock:overview.columns.onOrder"), sortable: true, align: "right", render: (row) => (row.onOrder > 0 ? <span className="font-semibold text-primary">{`${formatNumber(row.onOrder, language)} ${row.uom}`}</span> : "—") }]
        : []),
      { key: "reserved", secondary: true, header: t("stock:overview.columns.reserved"), sortable: true, align: "right", render: (row) => (row.reserved > 0 ? `${formatNumber(row.reserved, language)} ${row.uom}` : "—") },
      { key: "available", header: t("stock:overview.columns.available"), sortable: true, align: "right", render: (row) => <span className="font-semibold text-slate-900">{`${formatNumber(row.available, language)} ${row.uom}`}</span> },
    ];
    return kind === "material"
      ? [...base, { key: "reorderPoint", secondary: true, header: t("stock:overview.columns.reorderPoint"), sortable: true, align: "right", render: (row) => (row.reorderPoint == null ? "—" : `${formatNumber(row.reorderPoint, language)} ${row.uom}`) }, status]
      : [...base, status];
  }, [kind, t, i18n.language]);

  const extraFilters = useMemo(
    () => [
      {
        key: "warehouse",
        label: t("stock:overview.filters.warehouse"),
        kind: "options",
        options: warehouses.filter((warehouse) => warehouse.type === (kind === "material" ? "RAW_MATERIAL" : "FINISHED_GOODS")).map((warehouse) => ({ value: String(warehouse.id), label: `${warehouse.code} · ${warehouse.name}` })),
      },
    ],
    [warehouses, kind, t],
  );

  return (
    <DocumentListPage
      title={t("nav:items.stockOverview")}
      service={service}
      statuses={kind === "material" ? MATERIAL_STOCK_STATUSES : PRODUCT_STOCK_STATUSES}
      statusNamespace="stock"
      defaultSort="code"
      customerFilter={false}
      dateFilter={false}
      extraFilters={extraFilters}
      extraKeys={WAREHOUSE_KEY}
      columns={columns}
      rowTo={(row) => `/stock/${row.itemType}s/${row.itemId}${search}`}
      newTo={null}
      emptyText={t(kind === "material" ? "stock:overview.emptyMaterial" : "stock:overview.emptyProduct")}
      noResultText={t("stock:overview.noResult")}
      searchLabel={t("stock:overview.search")}
      beforePanel={<KindTabs kind={kind} onChange={changeKind} />}
    />
  );
}

/** T1 Stock overview. The list is always shown; /materials/:id and /products/:id open the item sheet on top of it. */
export function StockOverviewPage() {
  return (
    <>
      <OverviewList />
      <Routes>
        <Route path="materials/:id" element={<RemountOnId><StockItemSheet kind="material" /></RemountOnId>} />
        <Route path="products/:id" element={<RemountOnId><StockItemSheet kind="product" /></RemountOnId>} />
      </Routes>
    </>
  );
}
