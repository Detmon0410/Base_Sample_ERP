import { PlusIcon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";

import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { StockStatusBadge } from "@/components/stock/StockStatusBadge";
import { Button } from "@/components/ui/button";
import { MATERIAL_STOCK_STATUSES } from "@/config/stock";
import { canWork } from "@/config/purchase";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { stockStatusService } from "@/services/purchase.service";
import { formatCurrency, formatNumber } from "@/utils/format";

const SCOPES = ["attention", "all"];

/** P1 Stock status board: what is low, what is on order, who to buy from, and a button that starts the purchase order of one material. */
export function StockStatusPage() {
  const { t, i18n } = useTranslation(["purchase", "nav", "stock"]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const scope = params.get("scope") === "all" ? "all" : "attention";

  const changeScope = (next) =>
    setParams(
      (previous) => {
        const query = new URLSearchParams(previous);
        query.delete("page");
        if (next === "attention") query.delete("scope");
        else query.set("scope", next);
        return query;
      },
      { replace: true },
    );

  // the board always asks for the chosen scope; "all" also shows the materials that are fine
  const service = useMemo(() => ({ key: `/purchase/stock-status/${scope}`, list: (query) => stockStatusService.list({ ...query, scope }) }), [scope]);

  const startPo = useCallback(
    (rows, supplierId) => {
      navigate("/purchase/orders/new", {
        state: {
          supplierId,
          lines: rows.map((row) => ({ materialId: row.id, qty: row.suggestedQty > 0 ? row.suggestedQty : null, unitPrice: row.suppliers.find((supplier) => supplier.supplierId === supplierId)?.price ?? null })),
        },
      });
    },
    [navigate],
  );

  const columns = useMemo(() => {
    const language = i18n.language;
    const mayBuy = canWork(user);
    return [
      { key: "code", header: t("purchase:board.columns.code"), sortable: true },
      { key: "name", header: t("purchase:board.columns.name"), sortable: true },
      { key: "onHand", header: t("purchase:board.columns.onHand"), sortable: true, align: "right", render: (row) => `${formatNumber(row.onHand, language)} ${row.uom}` },
      { key: "available", secondary: true, header: t("purchase:board.columns.available"), sortable: true, align: "right", render: (row) => `${formatNumber(row.available, language)} ${row.uom}` },
      {
        key: "onOrder", secondary: true,
        header: t("purchase:board.columns.onOrder"),
        sortable: true,
        align: "right",
        render: (row) => (row.onOrder > 0 ? <span className="font-semibold text-primary">{`${formatNumber(row.onOrder, language)} ${row.uom}`}</span> : "—"),
      },
      { key: "reorderPoint", secondary: true, header: t("purchase:board.columns.reorderPoint"), sortable: true, align: "right", render: (row) => (row.reorderPoint == null ? "—" : `${formatNumber(row.reorderPoint, language)} ${row.uom}`) },
      { key: "status", header: t("purchase:board.columns.status"), sortable: true, render: (row) => <StockStatusBadge status={row.status} /> },
      {
        key: "suggested", secondary: true,
        header: t("purchase:board.columns.supplier"),
        render: (row) =>
          row.suggested ? (
            <span className="block">
              <span className="font-semibold text-slate-900">{`${row.suggested.code} · ${row.suggested.name}`}</span>
              <span className="block text-sm">{t("purchase:board.priceLead", { price: formatCurrency(row.suggested.price, language), days: row.suggested.leadTimeDays })}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{t("purchase:board.noSupplier")}</span>
          ),
      },
      ...(mayBuy
        ? [
            {
              key: "create",
              header: <span className="sr-only">{t("purchase:board.create")}</span>,
              render: (row) => (
                <Button type="button" size="sm" className="h-9" disabled={!row.suggested} title={row.suggested ? undefined : t("purchase:board.noSupplierHint")} onClick={() => startPo([row], row.suggested.supplierId)}>
                  <PlusIcon aria-hidden="true" /> {t("purchase:board.create")}
                </Button>
              ),
            },
          ]
        : []),
    ];
  }, [t, i18n.language, user, startPo]);

  const tabs = (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-3">
      <div role="group" aria-label={t("purchase:board.scope")} className="flex w-fit overflow-hidden rounded-lg border border-input bg-card">
        {SCOPES.map((key, index) => (
          <button
            key={key}
            type="button"
            aria-pressed={scope === key}
            onClick={() => changeScope(key)}
            className={cn("h-11 px-5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset", scope === key ? "bg-secondary font-semibold text-primary" : "text-muted-foreground hover:bg-muted", index > 0 && "border-l border-input")}
          >
            {t(`purchase:board.scopes.${key}`)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <DocumentListPage
      title={t("nav:items.stockStatus")}
      service={service}
      statuses={MATERIAL_STOCK_STATUSES}
      statusNamespace="stock"
      defaultSort="status"
      customerFilter={false}
      dateFilter={false}
      columns={columns}
      newTo={null}
      emptyText={t("purchase:board.empty")}
      noResultText={t("purchase:board.noResult")}
      searchLabel={t("purchase:board.search")}
      beforePanel={tabs}
    />
  );
}
