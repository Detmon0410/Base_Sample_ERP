import { CircleMinusIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation } from "react-router";

import { RoleChips } from "@/components/admin/RoleChips";
import { RemountOnId } from "@/components/common/RemountOnId";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { DEPARTMENTS, ROLES } from "@/config/permissions";
import { userService } from "@/services/users.service";
import { formatDateTime } from "@/utils/format";

import { UserFormPage } from "./UserFormPage";

const PATH = "/admin/users";
const EXTRA_KEYS = ["department", "role"];
const STATUSES = ["active", "inactive"];

function UsersListPage() {
  const { t, i18n } = useTranslation(["users", "nav"]);
  const { search } = useLocation();

  const columns = useMemo(
    () => [
      {
        key: "name",
        header: t("users:list.columns.name"),
        sortable: true,
        render: (row) => (
          <span className="flex items-center gap-2">
            {row.name}
            {row.isSelf ? <StatusBadge tone="neutral" icon={null}>{t("users:list.you")}</StatusBadge> : null}
          </span>
        ),
      },
      { key: "email", header: t("users:list.columns.email"), sortable: true },
      { key: "memberships", header: t("users:list.columns.assignments"), render: (row) => <RoleChips memberships={row.memberships} /> },
      {
        key: "lastLoginAt",
        header: t("users:list.columns.lastLoginAt"),
        sortable: true,
        render: (row) => (row.lastLoginAt ? formatDateTime(row.lastLoginAt, i18n.language) : <span className="text-muted-foreground">{t("users:list.neverSignedIn")}</span>),
      },
      {
        key: "status",
        header: t("users:list.columns.status"),
        sortable: true,
        render: (row) =>
          row.status === "active" ? (
            <StatusBadge tone="success">{t("users:status.active")}</StatusBadge>
          ) : (
            <StatusBadge tone="neutral" icon={CircleMinusIcon}>
              {t("users:status.inactive")}
            </StatusBadge>
          ),
      },
    ],
    [t, i18n.language],
  );

  const extraFilters = useMemo(
    () => [
      { key: "department", label: t("users:list.filters.department"), kind: "options", options: DEPARTMENTS.map((value) => ({ value, label: t(`users:departments.${value}`) })) },
      { key: "role", label: t("users:list.filters.role"), kind: "options", options: ROLES.map((value) => ({ value, label: t(`users:roles.${value}`) })) },
    ],
    [t],
  );

  return (
    <DocumentListPage
      title={t("nav:items.users")}
      service={userService}
      statuses={STATUSES}
      statusNamespace="users"
      defaultSort="name"
      customerFilter={false}
      dateFilter={false}
      extraFilters={extraFilters}
      extraKeys={EXTRA_KEYS}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={`${PATH}/new${search}`}
      newLabel={t("users:list.new")}
      emptyText={t("users:list.empty")}
      noResultText={t("users:list.noResult")}
      searchLabel={t("users:list.search")}
    />
  );
}

/** U1 Users. The list is always shown; /new and /:id open the form in a sheet on top of it. */
export function UsersPage() {
  return (
    <>
      <UsersListPage />
      <Routes>
        <Route path="new" element={<RemountOnId><UserFormPage /></RemountOnId>} />
        <Route path=":id" element={<RemountOnId><UserFormPage /></RemountOnId>} />
      </Routes>
    </>
  );
}
