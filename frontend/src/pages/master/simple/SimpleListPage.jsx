import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";

import { ActiveBadge } from "@/components/common/ActiveBadge";
import { ListPage } from "@/components/common/ListPage";
import { useAuth } from "@/hooks/useAuth";
import { useListQuery } from "@/hooks/useListQuery";
import { useResourceList } from "@/hooks/useResourceList";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { formatNumber } from "@/utils/format";
import { canApprove } from "@/utils/permissions";

/** List of a flat master data entity (config/simpleMaster.js). */
export function SimpleListPage({ entity }) {
  const { t, i18n } = useTranslation(["master", "nav"]);
  const { user } = useAuth();
  const { query, setQuery } = useListQuery();
  // the Accounting master is changed by the Manager of Accounting (and Admin); everybody else reads it
  const mayCreate = !entity.managerDepartment || canApprove(user, entity.managerDepartment);
  const { search } = useLocation(); // kept when a row opens the detail sheet
  const list = useResourceList(simpleMasterServices[entity.key], query);
  const title = t(`nav:${entity.nav}`);

  const columns = useMemo(() => {
    const own = entity.columns.map((column) => ({
      key: column.key,
      header: t(`master:${entity.key}.columns.${column.key}`),
      sortable: entity.sortable.includes(column.key),
      align: column.kind === "quantity" || column.kind === "percent" ? "right" : undefined,
      render: (row) => {
        const value = row[column.key];
        if (value == null || value === "") return "—";
        if (column.kind === "option") return t(`master:${entity.key}.options.${column.key}.${value}`);
        if (column.kind === "percent") return `${formatNumber(value, i18n.language)} %`;
        if (column.kind === "quantity") return `${formatNumber(value, i18n.language)} ${row[column.unitKey] ?? ""}`.trim();
        return value;
      },
    }));

    return [
      { key: "code", header: t("master:common.code"), sortable: true, width: "w-40" },
      { key: "name", header: t("master:common.name"), sortable: true },
      ...own,
      {
        key: "status",
        header: t("master:common.status"),
        sortable: true,
        width: "w-44",
        render: (row) => <ActiveBadge status={row.status} />,
      },
    ];
  }, [entity, t, i18n.language]);

  return (
    <ListPage
      title={title}
      ariaLabel={title}
      query={query}
      setQuery={setQuery}
      list={list}
      columns={columns}
      rowTo={(row) => `${entity.path}/${row.id}${search}`}
      newTo={mayCreate ? `${entity.path}/new${search}` : null}
      newLabel={t(`master:${entity.key}.new`)}
      emptyText={t(`master:${entity.key}.empty`)}
      noResultText={t(`master:${entity.key}.noResult`)}
      searchLabel={t("master:common.search")}
    />
  );
}
