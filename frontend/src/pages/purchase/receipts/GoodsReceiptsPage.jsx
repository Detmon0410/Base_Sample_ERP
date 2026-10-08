import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation } from "react-router";

import { RemountOnId } from "@/components/common/RemountOnId";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { WaitingGoodsPanel } from "@/components/purchase/WaitingGoodsPanel";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { canWork, RECEIPT_STATUSES } from "@/config/purchase";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { goodsReceiptService } from "@/services/purchase.service";
import { supplierService } from "@/services/supplier.service";
import { formatDate, formatNumber } from "@/utils/format";

import { GoodsReceiptSheet } from "./GoodsReceiptSheet";

const PATH = "/purchase/receipts";
const EXTRA_KEYS = ["supplier"];

function GoodsReceiptsListPage() {
  const { t, i18n } = useTranslation(["purchase", "nav"]);
  const { user } = useAuth();
  const { search } = useLocation();
  const { options: suppliers } = useOptions(supplierService);

  const columns = useMemo(() => {
    const language = i18n.language;
    return [
      { key: "number", header: t("purchase:receipts.columns.number"), sortable: true },
      { key: "date", header: t("purchase:receipts.columns.date"), sortable: true, render: (row) => formatDate(row.date, language) },
      { key: "poNumber", header: t("purchase:receipts.columns.po"), sortable: true },
      { key: "supplierCode", header: t("purchase:receipts.columns.supplier"), sortable: true, render: (row) => `${row.supplierCode} · ${row.supplierName}` },
      { key: "warehouseName", header: t("purchase:receipts.columns.warehouse") },
      { key: "accepted", header: t("purchase:receipts.columns.accepted"), sortable: true, align: "right", render: (row) => (row.lines.length === 1 ? `${formatNumber(row.accepted, language)} ${row.lines[0].uom}` : t("purchase:receipts.linesCount", { count: row.lines.length })) },
      { key: "receivedBy", header: t("purchase:receipts.columns.receivedBy") },
      { key: "status", header: t("purchase:receipts.columns.status"), sortable: true, render: (row) => <DocumentStatusBadge status={row.status} /> },
    ];
  }, [t, i18n.language]);

  const extraFilters = useMemo(
    () => [{ key: "supplier", label: t("purchase:receipts.filters.supplier"), kind: "search", options: suppliers.map((supplier) => ({ value: String(supplier.id), label: `${supplier.code} · ${supplier.name}` })) }],
    [suppliers, t],
  );

  return (
    <DocumentListPage
      title={t("nav:items.goodsReceipt")}
      service={goodsReceiptService}
      statuses={RECEIPT_STATUSES}
      stepper
      stepperUnit="receipts"
      beforePanel={<WaitingGoodsPanel canCreate={canWork(user)} />}
      customerFilter={false}
      extraFilters={extraFilters}
      extraKeys={EXTRA_KEYS}
      dateLabel={t("purchase:receipts.filters.date")}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={canWork(user) ? `${PATH}/new${search}` : null}
      newLabel={t("purchase:receipts.new")}
      emptyText={t("purchase:receipts.empty")}
      noResultText={t("purchase:receipts.noResult")}
      searchLabel={t("purchase:receipts.search")}
    />
  );
}

/** P5 Goods receipts. The list is always shown; /new and /:id open the sheet on top of it. */
export function GoodsReceiptsPage() {
  return (
    <>
      <GoodsReceiptsListPage />
      <Routes>
        <Route path="new" element={<RemountOnId><GoodsReceiptSheet /></RemountOnId>} />
        <Route path=":id" element={<RemountOnId><GoodsReceiptSheet /></RemountOnId>} />
      </Routes>
    </>
  );
}
