import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useLocation } from "react-router";

import { RemountOnId } from "@/components/common/RemountOnId";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { DELIVERY_STATUSES } from "@/config/sale";
import { deliveryNoteService } from "@/services/sale.service";
import { formatDate } from "@/utils/format";

import { DeliverySheet } from "./DeliverySheet";

const PATH = "/sale/deliveries";

function DeliveriesListPage() {
  const { t, i18n } = useTranslation(["sale", "nav"]);
  const { search } = useLocation();

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
      { key: "saleOrderNumber", header: t("sale:columns.saleOrder"), sortable: true },
      { key: "customerCode", header: t("sale:columns.customer"), sortable: true, render: (row) => `${row.customerCode} · ${row.customerName}` },
      { key: "lineCount", secondary: true, header: t("sale:columns.lines"), align: "right" },
      { key: "status", header: t("sale:columns.status"), sortable: true, render: (row) => <DocumentStatusBadge status={row.status} /> },
    ],
    [t, i18n.language, search],
  );

  return (
    <DocumentListPage
      title={t("nav:items.deliveryNotes")}
      service={deliveryNoteService}
      statuses={DELIVERY_STATUSES}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={null}
      emptyText={t("sale:deliveries.empty")}
      noResultText={t("sale:deliveries.noResult")}
      searchLabel={t("sale:deliveries.search")}
    />
  );
}

/** S8 Delivery Notes. The list is always shown; /:id opens the sheet. Notes are created from a sale order. */
export function DeliveriesPage() {
  return (
    <>
      <DeliveriesListPage />
      <Routes>
        <Route path=":id" element={<RemountOnId><DeliverySheet /></RemountOnId>} />
      </Routes>
    </>
  );
}
