import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";

import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { APPROVAL_ACTIONS, isPurchaseManager } from "@/config/purchase";
import { useAuth } from "@/hooks/useAuth";
import { purchaseApprovalService } from "@/services/purchase.service";
import { ForbiddenPage } from "@/pages/system/ForbiddenPage";
import { formatCurrency, formatDateTime } from "@/utils/format";

const STATUSES = ["pending", "approved", "rejected", "draft"];
const EXTRA_KEYS = ["action"];

/** The approval log of the purchase orders (docs/specs/f12-requirements-2.md, N6): Purchase Manager and Admin only, read only. */
export function ApprovalLogPage() {
  const { t, i18n } = useTranslation(["purchase", "nav", "sale"]);
  const { user } = useAuth();
  const { search } = useLocation();

  const columns = useMemo(() => {
    const language = i18n.language;
    return [
      { key: "at", header: t("purchase:approvals.columns.at"), sortable: true, render: (row) => formatDateTime(row.at, language) },
      { key: "poNumber", header: t("purchase:approvals.columns.poNumber"), sortable: true },
      { key: "supplierName", header: t("purchase:approvals.columns.supplier") },
      { key: "total", header: t("purchase:approvals.columns.total"), sortable: true, align: "right", render: (row) => formatCurrency(row.total, language) },
      { key: "action", header: t("purchase:approvals.columns.action"), sortable: true, render: (row) => t(`purchase:approval.log.${row.action}`) },
      { key: "actor", header: t("purchase:approvals.columns.actor"), sortable: true },
      { key: "status", header: t("purchase:approvals.columns.status"), sortable: true, render: (row) => <DocumentStatusBadge status={row.status} /> },
      { key: "note", header: t("purchase:approvals.columns.note"), render: (row) => row.note ?? "—" },
    ];
  }, [t, i18n.language]);

  const extraFilters = useMemo(
    () => [{ key: "action", label: t("purchase:approvals.filters.action"), kind: "options", options: APPROVAL_ACTIONS.map((value) => ({ value, label: t(`purchase:approval.log.${value}`) })) }],
    [t],
  );

  if (!isPurchaseManager(user)) return <ForbiddenPage />;

  return (
    <DocumentListPage
      title={t("nav:items.purchaseApprovals")}
      service={purchaseApprovalService}
      statuses={STATUSES}
      defaultSort="-at"
      customerFilter={false}
      extraFilters={extraFilters}
      extraKeys={EXTRA_KEYS}
      dateLabel={t("purchase:approvals.filters.date")}
      columns={columns}
      rowTo={(row) => `/purchase/orders/${row.poId}${search}`}
      newTo={null}
      emptyText={t("purchase:approvals.empty")}
      noResultText={t("purchase:approvals.noResult")}
      searchLabel={t("purchase:approvals.search")}
    />
  );
}
