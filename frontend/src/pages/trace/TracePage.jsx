import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation } from "react-router";

import { SerialStatusBadge } from "@/components/factory/SerialStatusBadge";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { SERIAL_STATUSES } from "@/config/trace";
import { serialService } from "@/services/serial.service";
import { formatDateTime } from "@/utils/format";

import { TraceUnitPage } from "./TraceUnitPage";

/** R1 — /trace. Search the units by serial number, work order, sale order, delivery note, invoice, customer or lot number. */
function TraceSearchPage() {
  const { t, i18n } = useTranslation(["trace", "nav"]);
  const { search } = useLocation();

  const columns = useMemo(
    () => [
      { key: "sn", header: t("trace:columns.sn"), sortable: true, render: (row) => <span className="font-semibold tabular-nums">{row.sn}</span> },
      { key: "productCode", header: t("trace:columns.product"), sortable: true, render: (row) => `${row.productCode} · ${row.productName}` },
      { key: "status", header: t("trace:columns.status"), sortable: true, render: (row) => <SerialStatusBadge status={row.status} /> },
      { key: "workOrderNumber", header: t("trace:columns.workOrder"), sortable: true },
      { key: "customerName", secondary: true, header: t("trace:columns.customer"), render: (row) => (row.customerName ? `${row.customerName} · ${row.deliveryNote?.number}` : "—") },
      { key: "createdAt", secondary: true, header: t("trace:columns.madeAt"), sortable: true, render: (row) => formatDateTime(row.createdAt, i18n.language) },
    ],
    [t, i18n.language],
  );

  return (
    <DocumentListPage
      title={t("nav:items.productTrace")}
      service={serialService}
      statuses={SERIAL_STATUSES}
      statusNamespace="trace"
      defaultSort="-sn"
      customerFilter={false}
      dateFilter={false}
      columns={columns}
      rowTo={(row) => `/trace/${encodeURIComponent(row.sn)}${search}`}
      newTo={null}
      emptyText={t("trace:empty")}
      noResultText={t("trace:noResult")}
      searchLabel={t("trace:search")}
    />
  );
}

export function TracePage() {
  return (
    <Routes>
      <Route index element={<TraceSearchPage />} />
      <Route path=":sn" element={<TraceUnitPage />} />
    </Routes>
  );
}
