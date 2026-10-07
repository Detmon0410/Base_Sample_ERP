import { TriangleAlertIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation } from "react-router";

import { RemountOnId } from "@/components/common/RemountOnId";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { canWork, PO_STATUSES } from "@/config/purchase";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { materialService } from "@/services/material.service";
import { purchaseOrderService } from "@/services/purchase.service";
import { supplierService } from "@/services/supplier.service";
import { formatCurrency, formatDate, formatNumber } from "@/utils/format";

import { PurchaseOrderSheet } from "./PurchaseOrderSheet";

const PATH = "/purchase/orders";
const EXTRA_KEYS = ["supplier", "material", "deliveryFrom", "deliveryTo"];

function PurchaseOrdersListPage() {
  const { t, i18n } = useTranslation(["purchase", "nav"]);
  const { user } = useAuth();
  const { search } = useLocation();
  const { options: suppliers } = useOptions(supplierService);
  const { options: materials } = useOptions(materialService);

  const columns = useMemo(() => {
    const language = i18n.language;
    return [
      { key: "number", header: t("purchase:orders.columns.number"), sortable: true },
      { key: "date", header: t("purchase:orders.columns.date"), sortable: true, render: (row) => formatDate(row.date, language) },
      { key: "supplierCode", header: t("purchase:orders.columns.supplier"), sortable: true, render: (row) => `${row.supplierCode} · ${row.supplierName}` },
      {
        key: "expectedDate",
        header: t("purchase:orders.columns.expectedDate"),
        sortable: true,
        render: (row) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            {row.expectedDate ? formatDate(row.expectedDate, language) : "—"}
            {row.progress.late ? <TriangleAlertIcon className="size-4 text-warning" aria-label={t("purchase:orders.late", { count: row.progress.lateDays })} /> : null}
          </span>
        ),
      },
      { key: "lineCount", header: t("purchase:orders.columns.lines"), align: "right" },
      {
        key: "progress",
        header: t("purchase:orders.columns.received"),
        render: (row) =>
          row.status === "draft" || row.status === "cancelled" ? (
            "—"
          ) : (
            <span className="flex min-w-32 flex-col gap-1">
              <span className="h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                <span className={`block h-full rounded-full ${row.progress.percent >= 100 ? "bg-success" : "bg-primary"}`} style={{ width: `${Math.min(100, row.progress.percent)}%` }} />
              </span>
              <span className="text-sm">{t("purchase:orders.received", { received: formatNumber(row.progress.received, language), ordered: formatNumber(row.progress.ordered, language) })}</span>
            </span>
          ),
      },
      { key: "total", header: t("purchase:orders.columns.total"), sortable: true, align: "right", render: (row) => formatCurrency(row.total, language), sum: (value) => formatCurrency(value, language) },
      { key: "status", header: t("purchase:orders.columns.status"), sortable: true, render: (row) => <DocumentStatusBadge status={row.status} /> },
    ];
  }, [t, i18n.language]);

  const extraFilters = useMemo(
    () => [
      { key: "supplier", label: t("purchase:orders.filters.supplier"), kind: "search", options: suppliers.map((supplier) => ({ value: String(supplier.id), label: `${supplier.code} · ${supplier.name}` })) },
      { key: "material", label: t("purchase:orders.filters.material"), kind: "search", options: materials.map((material) => ({ value: String(material.id), label: `${material.code} · ${material.name}` })) },
      { key: "delivery", label: t("purchase:orders.filters.expectedDate"), kind: "dateRange", fromKey: "deliveryFrom", toKey: "deliveryTo" },
    ],
    [suppliers, materials, t],
  );

  return (
    <DocumentListPage
      title={t("nav:items.purchaseOrders")}
      service={purchaseOrderService}
      statuses={PO_STATUSES}
      stepper
      stepperUnit="purchaseOrders"
      customerFilter={false}
      extraFilters={extraFilters}
      extraKeys={EXTRA_KEYS}
      dateLabel={t("purchase:orders.filters.date")}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={canWork(user) ? `${PATH}/new${search}` : null}
      newLabel={t("purchase:orders.new")}
      emptyText={t("purchase:orders.empty")}
      noResultText={t("purchase:orders.noResult")}
      searchLabel={t("purchase:orders.search")}
    />
  );
}

/** P2 Purchase Orders. The list is always shown; /new and /:id open the sheet on top of it. */
export function PurchaseOrdersPage() {
  return (
    <>
      <PurchaseOrdersListPage />
      <Routes>
        <Route path="new" element={<RemountOnId><PurchaseOrderSheet /></RemountOnId>} />
        <Route path=":id" element={<RemountOnId><PurchaseOrderSheet /></RemountOnId>} />
      </Routes>
    </>
  );
}
