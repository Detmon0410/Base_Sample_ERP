import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation } from "react-router";

import { RemountOnId } from "@/components/common/RemountOnId";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { canWork, TRANSFER_STATUSES } from "@/config/factory";
import { useAuth } from "@/hooks/useAuth";
import { transferService } from "@/services/factory.service";
import { formatDate, formatNumber } from "@/utils/format";

import { TransferSheet } from "./TransferSheet";

const PATH = "/factory/transfers";

function TransfersListPage() {
  const { t, i18n } = useTranslation(["factory", "nav"]);
  const { user } = useAuth();
  const { search } = useLocation();

  const columns = useMemo(
    () => [
      { key: "number", header: t("factory:transfers.columns.number"), sortable: true },
      { key: "date", header: t("factory:transfers.columns.date"), sortable: true, render: (row) => formatDate(row.date, i18n.language) },
      { key: "workOrderNumber", secondary: true, header: t("factory:transfers.columns.workOrder"), sortable: true },
      { key: "productCode", header: t("factory:transfers.columns.product"), render: (row) => `${row.productCode} · ${row.productName}` },
      { key: "qty", header: t("factory:transfers.columns.qty"), sortable: true, align: "right", render: (row) => `${formatNumber(row.qty, i18n.language)} ${row.uom}` },
      { key: "warehouseName", secondary: true, header: t("factory:transfers.columns.warehouse") },
      { key: "status", header: t("factory:transfers.columns.status"), sortable: true, render: (row) => <DocumentStatusBadge status={row.status} /> },
    ],
    [t, i18n.language],
  );

  return (
    <DocumentListPage
      title={t("nav:items.fgTransfer")}
      service={transferService}
      statuses={TRANSFER_STATUSES}
      stepper
      stepperUnit="transfers"
      customerFilter={false}
      dateLabel={t("factory:transfers.columns.date")}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={canWork(user) ? `${PATH}/new${search}` : null}
      newLabel={t("factory:transfers.new")}
      emptyText={t("factory:transfers.empty")}
      noResultText={t("factory:transfers.noResult")}
      searchLabel={t("factory:transfers.search")}
    />
  );
}

/** F5 Finished Goods Transfer. The list is always shown; /new and /:id open the sheet on top of it. */
export function TransfersPage() {
  return (
    <>
      <TransfersListPage />
      <Routes>
        <Route path="new" element={<RemountOnId><TransferSheet /></RemountOnId>} />
        <Route path=":id" element={<RemountOnId><TransferSheet /></RemountOnId>} />
      </Routes>
    </>
  );
}
