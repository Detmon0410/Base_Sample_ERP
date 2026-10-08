import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation } from "react-router";

import { RemountOnId } from "@/components/common/RemountOnId";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { SignedQty } from "@/components/stock/SignedQty";
import { ADJUSTMENT_STATUSES, canWork } from "@/config/stock";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { adjustmentService } from "@/services/stock.service";
import { formatDate, formatNumber } from "@/utils/format";

import { AdjustmentSheet } from "./AdjustmentSheet";

const PATH = "/stock/adjustments";
const EXTRA_KEYS = ["kind", "warehouse"];

function AdjustmentsListPage() {
  const { t, i18n } = useTranslation(["stock", "nav"]);
  const { user } = useAuth();
  const { search } = useLocation();
  const { options: warehouses } = useOptions(simpleMasterServices.warehouses);

  const columns = useMemo(() => {
    const language = i18n.language;
    return [
      { key: "number", header: t("stock:adjustments.columns.number"), sortable: true },
      { key: "date", header: t("stock:adjustments.columns.date"), sortable: true, render: (row) => formatDate(row.date, language) },
      { key: "itemCode", header: t("stock:adjustments.columns.item"), sortable: true, render: (row) => `${row.itemCode} · ${row.itemName}` },
      { key: "warehouseName", secondary: true, header: t("stock:adjustments.columns.warehouse"), render: (row) => row.warehouseCode },
      { key: "countedQty", secondary: true, header: t("stock:adjustments.columns.counted"), sortable: true, align: "right", render: (row) => `${formatNumber(row.countedQty, language)} ${row.uom}` },
      { key: "difference", header: t("stock:adjustments.columns.difference"), sortable: true, align: "right", render: (row) => <SignedQty value={row.difference} uom={row.uom} language={language} /> },
      { key: "status", header: t("stock:adjustments.columns.status"), sortable: true, render: (row) => <DocumentStatusBadge status={row.status} /> },
    ];
  }, [t, i18n.language]);

  const extraFilters = useMemo(
    () => [
      { key: "kind", label: t("stock:adjustments.filters.kind"), kind: "options", options: ["material", "product"].map((kind) => ({ value: kind, label: t(`stock:kinds.${kind}`) })) },
      { key: "warehouse", label: t("stock:adjustments.filters.warehouse"), kind: "options", options: warehouses.map((warehouse) => ({ value: String(warehouse.id), label: `${warehouse.code} · ${warehouse.name}` })) },
    ],
    [warehouses, t],
  );

  return (
    <DocumentListPage
      title={t("nav:items.stockAdjustment")}
      service={adjustmentService}
      statuses={ADJUSTMENT_STATUSES}
      stepper
      stepperUnit="adjustments"
      customerFilter={false}
      extraFilters={extraFilters}
      extraKeys={EXTRA_KEYS}
      dateLabel={t("stock:adjustments.dateLabel")}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={canWork(user) ? `${PATH}/new${search}` : null}
      newLabel={t("stock:adjustments.new")}
      emptyText={t("stock:adjustments.empty")}
      noResultText={t("stock:adjustments.noResult")}
      searchLabel={t("stock:adjustments.search")}
    />
  );
}

/** T3 Stock adjustments. The list is always shown; /new and /:id open the sheet on top of it. */
export function AdjustmentsPage() {
  return (
    <>
      <AdjustmentsListPage />
      <Routes>
        <Route path="new" element={<RemountOnId><AdjustmentSheet /></RemountOnId>} />
        <Route path=":id" element={<RemountOnId><AdjustmentSheet /></RemountOnId>} />
      </Routes>
    </>
  );
}
