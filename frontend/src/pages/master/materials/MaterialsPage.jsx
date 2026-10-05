import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useLocation } from "react-router";

import { ActiveBadge } from "@/components/common/ActiveBadge";
import { ListPage } from "@/components/common/ListPage";
import { useListQuery } from "@/hooks/useListQuery";
import { useResourceList } from "@/hooks/useResourceList";
import { materialService } from "@/services/material.service";
import { formatNumber } from "@/utils/format";

import { MaterialFormPage } from "./MaterialFormPage";

const PATH = "/master/materials";

function MaterialsListPage() {
  const { t, i18n } = useTranslation(["master", "nav"]);
  const { query, setQuery } = useListQuery();
  const { search } = useLocation(); // kept when a row opens the detail sheet
  const list = useResourceList(materialService, query);

  const columns = useMemo(
    () => [
      { key: "code", header: t("master:common.code"), sortable: true, className: "font-semibold" },
      { key: "name", header: t("master:common.name"), sortable: true },
      { key: "uom", header: t("master:materials.columns.uom"), sortable: true },
      {
        key: "reorderPoint",
        header: t("master:materials.columns.reorderPoint"),
        sortable: true,
        align: "right",
        render: (row) => formatNumber(row.reorderPoint, i18n.language),
      },
      { key: "status", header: t("master:common.status"), sortable: true, render: (row) => <ActiveBadge status={row.status} /> },
      {
        key: "edit",
        header: <span className="sr-only">{t("master:common.edit")}</span>,
        align: "right",
        render: (row) => (
          <Link
            to={`${PATH}/${row.id}${search}`}
            className="inline-flex h-10 items-center rounded-md px-2 font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${t("master:common.edit")} ${row.code}`}
          >
            {t("master:common.edit")}
          </Link>
        ),
      },
    ],
    [t, i18n.language, search],
  );

  return (
    <ListPage
      title={t("nav:items.materials")}
      ariaLabel={t("nav:items.materials")}
      query={query}
      setQuery={setQuery}
      list={list}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={`${PATH}/new${search}`}
      newLabel={t("master:materials.new")}
      emptyText={t("master:materials.empty")}
      noResultText={t("master:materials.noResult")}
      searchLabel={t("master:common.search")}
    />
  );
}

/** M4 Materials. The list is always shown; /new and /:id open the form in a sheet on top of it. */
export function MaterialsPage() {
  return (
    <>
      <MaterialsListPage />
      <Routes>
        <Route path="new" element={<MaterialFormPage />} />
        <Route path=":id" element={<MaterialFormPage />} />
      </Routes>
    </>
  );
}
