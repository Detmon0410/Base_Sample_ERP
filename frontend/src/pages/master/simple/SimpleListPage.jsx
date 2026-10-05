import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import { ActiveBadge } from "@/components/common/ActiveBadge";
import { ListPage } from "@/components/common/ListPage";
import { useListQuery } from "@/hooks/useListQuery";
import { useResourceList } from "@/hooks/useResourceList";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { formatNumber } from "@/utils/format";

/** List of a flat master data entity (config/simpleMaster.js). */
export function SimpleListPage({ entity }) {
  const { t, i18n } = useTranslation(["master", "nav"]);
  const { query, setQuery } = useListQuery();
  const { search } = useLocation(); // kept when a row opens the detail sheet
  const list = useResourceList(simpleMasterServices[entity.key], query);
  const title = t(`nav:${entity.nav}`);

  const columns = useMemo(() => {
    const own = entity.columns.map((column) => ({
      key: column.key,
      header: t(`master:${entity.key}.columns.${column.key}`),
      sortable: entity.sortable.includes(column.key),
      align: column.kind === "quantity" ? "right" : undefined,
      render: (row) => {
        const value = row[column.key];
        if (value == null || value === "") return "—";
        if (column.kind === "option") return t(`master:${entity.key}.options.${column.key}.${value}`);
        if (column.kind === "quantity") return `${formatNumber(value, i18n.language)} ${row[column.unitKey] ?? ""}`.trim();
        return value;
      },
    }));

    return [
      { key: "code", header: t("master:common.code"), sortable: true, className: "font-semibold" },
      { key: "name", header: t("master:common.name"), sortable: true },
      ...own,
      {
        key: "status",
        header: t("master:common.status"),
        sortable: true,
        render: (row) => <ActiveBadge status={row.status} />,
      },
      {
        key: "edit",
        header: <span className="sr-only">{t("master:common.edit")}</span>,
        align: "right",
        render: (row) => (
          <Link
            to={`${entity.path}/${row.id}${search}`}
            className="inline-flex h-10 items-center rounded-md px-2 font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${t("master:common.edit")} ${row.code}`}
          >
            {t("master:common.edit")}
          </Link>
        ),
      },
    ];
  }, [entity, t, i18n.language, search]);

  return (
    <ListPage
      title={title}
      ariaLabel={title}
      query={query}
      setQuery={setQuery}
      list={list}
      columns={columns}
      rowTo={(row) => `${entity.path}/${row.id}${search}`}
      newTo={`${entity.path}/new${search}`}
      newLabel={t(`master:${entity.key}.new`)}
      emptyText={t(`master:${entity.key}.empty`)}
      noResultText={t(`master:${entity.key}.noResult`)}
      searchLabel={t("master:common.search")}
    />
  );
}
