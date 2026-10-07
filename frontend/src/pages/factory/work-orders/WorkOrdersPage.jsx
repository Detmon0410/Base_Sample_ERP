import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation } from "react-router";

import { CardBoard } from "@/components/common/CardBoard";
import { RemountOnId } from "@/components/common/RemountOnId";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { WaitingOrdersPanel } from "@/components/factory/WaitingOrdersPanel";
import { WorkOrderCard } from "@/components/factory/WorkOrderCard";
import { canWork, WORK_ORDER_STATUSES } from "@/config/factory";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { productService } from "@/services/product.service";
import { workOrderService } from "@/services/factory.service";
import { formatDate, formatNumber } from "@/utils/format";

import { WorkOrderSheet } from "./WorkOrderSheet";

const PATH = "/factory/work-orders";
const EXTRA_KEYS = ["product"];

function WorkOrdersListPage() {
  const { t, i18n } = useTranslation(["factory", "nav"]);
  const { user } = useAuth();
  const { search } = useLocation();
  const { options: products } = useOptions(productService);

  const columns = useMemo(
    () => [
      { key: "number", header: t("factory:workOrders.columns.number"), sortable: true },
      { key: "productCode", header: t("factory:workOrders.columns.product"), sortable: true, render: (row) => `${row.productCode} · ${row.productName}` },
      { key: "qty", header: t("factory:workOrders.columns.qty"), sortable: true, align: "right", render: (row) => `${formatNumber(row.qty, i18n.language)} ${row.uom}` },
      { key: "saleOrderNumber", header: t("factory:workOrders.columns.saleOrder") },
      { key: "planStart", header: t("factory:workOrders.columns.planStart"), sortable: true, render: (row) => (row.planStart ? formatDate(row.planStart, i18n.language) : "—") },
      { key: "planFinish", header: t("factory:workOrders.columns.planFinish"), sortable: true, render: (row) => (row.planFinish ? formatDate(row.planFinish, i18n.language) : "—") },
      {
        key: "progress",
        header: t("factory:workOrders.columns.progress"),
        render: (row) => `${row.progress.stepsDone} / ${row.progress.stepsTotal}`,
      },
      { key: "status", header: t("factory:workOrders.columns.status"), sortable: true, render: (row) => <DocumentStatusBadge status={row.status} /> },
    ],
    [t, i18n.language],
  );

  const extraFilters = useMemo(
    () => [{ key: "product", label: t("factory:workOrders.filters.product"), kind: "search", options: products.map((product) => ({ value: String(product.id), label: `${product.code} · ${product.name}` })) }],
    [products, t],
  );

  const board = useMemo(
    () => ({
      viewKey: "kanou.workOrders.view",
      render: (list, { emptyContent }) => (
        <CardBoard
          items={list.items}
          status={list.status}
          fetching={list.fetching}
          onRetry={list.retry}
          emptyContent={emptyContent}
          label={t("factory:workOrders.boardLabel")}
          renderCard={(wo) => <WorkOrderCard wo={wo} to={`${PATH}/${wo.id}${search}`} />}
        />
      ),
    }),
    [t, search],
  );

  return (
    <DocumentListPage
      title={t("nav:items.workOrders")}
      service={workOrderService}
      statuses={WORK_ORDER_STATUSES}
      stepper
      stepperUnit="workOrders"
      defaultSort="board"
      customerFilter={false}
      extraFilters={extraFilters}
      extraKeys={EXTRA_KEYS}
      dateLabel={t("factory:workOrders.filters.planFinish")}
      columns={columns}
      board={board}
      beforePanel={<WaitingOrdersPanel canCreate={canWork(user)} />}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={canWork(user) ? `${PATH}/new${search}` : null}
      newLabel={t("factory:workOrders.new")}
      emptyText={t("factory:workOrders.empty")}
      noResultText={t("factory:workOrders.noResult")}
      searchLabel={t("factory:workOrders.search")}
    />
  );
}

/** F1 Work Orders. The list is always shown; /new and /:id open the Work Order sheet on top of it. */
export function WorkOrdersPage() {
  return (
    <>
      <WorkOrdersListPage />
      <Routes>
        <Route path="new" element={<RemountOnId><WorkOrderSheet /></RemountOnId>} />
        <Route path=":id" element={<RemountOnId><WorkOrderSheet /></RemountOnId>} />
      </Routes>
    </>
  );
}
