import { useTranslation } from "react-i18next";
import { Navigate, Route, Routes, useParams } from "react-router";

import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader } from "@/components/common/PageHeader";
import { RecordList } from "@/components/common/RecordList";
import { useAuth } from "@/hooks/useAuth";
import { useLoad } from "@/hooks/useLoad";
import { ordersApi } from "@/services/orders.service";
import { can } from "@/utils/permissions";

import { OrderForm } from "./OrderForm";
import { OrderView } from "./OrderView";
import { statusKey } from "@/utils/serverErrors";

/** An order: an Admin or a Sale Worker edits one that has not started; everything else is the view with the progress. */
function OrderPage() {
  const { id } = useParams();
  const { t } = useTranslation(["orders", "common", "master"]);
  const { user } = useAuth();
  const { data, error, loading, reload } = useLoad(() => ordersApi.get(id), [id]);

  if (error) return <PageHeader title={t("master:form.notFound")} />;
  if (loading) return <PageHeader title={t("common:loading")} />;
  return can(user, "orders.edit") && !data.started ? <OrderForm key={data.updatedAt} order={data} onChanged={reload} /> : <OrderView order={data} onChanged={reload} />;
}

/** Production orders: the list (search, status filter) and one order. Orders are made by Confirm QT, so there is no "new order" here. */
export function OrdersPage() {
  const { t } = useTranslation(["orders", "master"]);
  const statuses = ["Draft", "In Progress", "Completed"];

  return (
    <Routes>
      <Route
        index
        element={
          <RecordList
            api={ordersApi}
            base="/sale/orders"
            title={t("title")}
            statusOptions={[{ value: "", label: t("master:list.all") }, ...statuses.map((value) => ({ value, label: t(`status.${statusKey(value)}`) }))]}
            statusOf={(row) => <StatusBadge tone={{ Draft: "neutral", InProgress: "progress", Completed: "good" }[statusKey(row.status)]}>{t(`status.${statusKey(row.status)}`)}</StatusBadge>}
            columns={[
              { key: "orderNumber", header: t("orderNumber") },
              { key: "orderDate", header: t("orderDate") },
              { key: "customerName", header: t("customer") },
              { key: "qtNumber", header: t("qt") },
            ]}
          />
        }
      />
      <Route path="new" element={<Navigate to="/sale/quotations" replace />} /> {/* an order is made by Confirm QT */}
      <Route path=":id" element={<OrderPage />} />
    </Routes>
  );
}
