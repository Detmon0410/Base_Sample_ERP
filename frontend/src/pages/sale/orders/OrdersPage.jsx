import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useLocation } from "react-router";

import { RemountOnId } from "@/components/common/RemountOnId";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { canWork, ORDER_STATUSES } from "@/config/sale";
import { useAuth } from "@/hooks/useAuth";
import { saleOrderService } from "@/services/sale.service";
import { formatCurrency, formatDate } from "@/utils/format";

import { OrderSheet } from "./OrderSheet";

const PATH = "/sale/orders";

function OrdersListPage() {
  const { t, i18n } = useTranslation(["sale", "nav"]);
  const { user } = useAuth();
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
      { key: "customerCode", header: t("sale:columns.customer"), sortable: true, render: (row) => `${row.customerCode} · ${row.customerName}` },
      { key: "quotationNumber", header: t("sale:columns.quotation"), render: (row) => row.quotationNumber ?? "—" },
      { key: "customerPoNumber", header: t("sale:columns.customerPo"), render: (row) => row.customerPoNumber ?? "—" },
      { key: "deliveryDate", header: t("sale:columns.deliveryDate"), sortable: true, render: (row) => (row.deliveryDate ? formatDate(row.deliveryDate, i18n.language) : "—") },
      { key: "total", header: t("sale:columns.total"), sortable: true, align: "right", render: (row) => formatCurrency(row.totals.total, i18n.language) },
      {
        key: "status",
        header: t("sale:columns.status"),
        sortable: true,
        render: (row) => <DocumentStatusBadge status={row.status} waiting={row.status === "draft" && row.approval === "requested"} />,
      },
    ],
    [t, i18n.language, search],
  );

  return (
    <DocumentListPage
      title={t("nav:items.saleOrders")}
      service={saleOrderService}
      statuses={ORDER_STATUSES}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={canWork(user) ? `${PATH}/new${search}` : null}
      newLabel={t("sale:orders.new")}
      emptyText={t("sale:orders.empty")}
      noResultText={t("sale:orders.noResult")}
      searchLabel={t("sale:orders.search")}
    />
  );
}

/** S5 Sale Orders. The list is always shown; /new and /:id open the document sheet on top of it. */
export function OrdersPage() {
  return (
    <>
      <OrdersListPage />
      <Routes>
        <Route path="new" element={<RemountOnId><OrderSheet /></RemountOnId>} />
        <Route path=":id" element={<RemountOnId><OrderSheet /></RemountOnId>} />
      </Routes>
    </>
  );
}
