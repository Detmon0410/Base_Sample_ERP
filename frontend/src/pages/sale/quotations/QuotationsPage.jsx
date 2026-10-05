import { TriangleAlertIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useLocation } from "react-router";

import { RemountOnId } from "@/components/common/RemountOnId";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { canWork, QUOTATION_STATUSES } from "@/config/sale";
import { useAuth } from "@/hooks/useAuth";
import { quotationService } from "@/services/sale.service";
import { formatCurrency, formatDate } from "@/utils/format";

import { QuotationSheet } from "./QuotationSheet";

const PATH = "/sale/quotations";

function QuotationsListPage() {
  const { t, i18n } = useTranslation(["sale", "nav"]);
  const { user } = useAuth();
  const { search } = useLocation(); // kept when a row opens the sheet

  const columns = useMemo(
    () => [
      {
        key: "number",
        header: t("sale:columns.number"),
        sortable: true,
        render: (row) => (
          <Link to={`${PATH}/${row.id}${search}`} className="underline-offset-4 hover:underline">
            {row.number}
          </Link>
        ),
      },
      { key: "date", header: t("sale:columns.date"), sortable: true, render: (row) => formatDate(row.date, i18n.language) },
      { key: "customerCode", header: t("sale:columns.customer"), sortable: true, render: (row) => `${row.customerCode} · ${row.customerName}` },
      { key: "salesPersonName", header: t("sale:columns.salesPerson"), render: (row) => row.salesPersonName ?? "—" },
      { key: "total", header: t("sale:columns.total"), sortable: true, align: "right", render: (row) => formatCurrency(row.totals.total, i18n.language) },
      {
        key: "validUntil",
        header: t("sale:columns.validUntil"),
        sortable: true,
        render: (row) => (
          <span className="inline-flex items-center gap-1.5">
            {formatDate(row.validUntil, i18n.language)}
            {row.pastValidUntil ? <TriangleAlertIcon className="size-4 text-warning" aria-label={t("sale:quotations.pastValidUntil")} /> : null}
          </span>
        ),
      },
      { key: "status", header: t("sale:columns.status"), sortable: true, render: (row) => <DocumentStatusBadge status={row.status} /> },
    ],
    [t, i18n.language, search],
  );

  return (
    <DocumentListPage
      title={t("nav:items.quotations")}
      service={quotationService}
      statuses={QUOTATION_STATUSES}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={canWork(user) ? `${PATH}/new${search}` : null}
      newLabel={t("sale:quotations.new")}
      emptyText={t("sale:quotations.empty")}
      noResultText={t("sale:quotations.noResult")}
      searchLabel={t("sale:quotations.search")}
    />
  );
}

/** S1 Quotations. The list is always shown; /new and /:id open the document sheet on top of it. */
export function QuotationsPage() {
  return (
    <>
      <QuotationsListPage />
      <Routes>
        <Route path="new" element={<RemountOnId><QuotationSheet /></RemountOnId>} />
        <Route path=":id" element={<RemountOnId><QuotationSheet /></RemountOnId>} />
      </Routes>
    </>
  );
}
