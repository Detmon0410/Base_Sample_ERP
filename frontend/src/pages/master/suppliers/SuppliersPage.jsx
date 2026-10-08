import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation } from "react-router";

import { ActiveBadge } from "@/components/common/ActiveBadge";
import { ListPage } from "@/components/common/ListPage";
import { useListQuery } from "@/hooks/useListQuery";
import { useResourceList } from "@/hooks/useResourceList";
import { supplierService } from "@/services/supplier.service";

import { SupplierFormPage } from "./SupplierFormPage";

const PATH = "/master/suppliers";

function SuppliersListPage() {
  const { t } = useTranslation(["master", "nav"]);
  const { query, setQuery } = useListQuery();
  const { search } = useLocation(); // kept when a row opens the detail sheet
  const list = useResourceList(supplierService, query);

  const columns = useMemo(
    () => [
      { key: "code", header: t("master:common.code"), sortable: true },
      { key: "name", header: t("master:common.name"), sortable: true },
      {
        key: "paymentTerms", secondary: true,
        header: t("master:customers.columns.paymentTerms"),
        sortable: true,
        render: (row) => (row.paymentTerms ? t(`master:paymentTerms.${row.paymentTerms}`) : "—"),
      },
      { key: "status", header: t("master:common.status"), sortable: true, render: (row) => <ActiveBadge status={row.status} /> },
    ],
    [t],
  );

  return (
    <ListPage
      title={t("nav:items.suppliers")}
      ariaLabel={t("nav:items.suppliers")}
      query={query}
      setQuery={setQuery}
      list={list}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={`${PATH}/new${search}`}
      newLabel={t("master:suppliers.new")}
      emptyText={t("master:suppliers.empty")}
      noResultText={t("master:suppliers.noResult")}
      searchLabel={t("master:common.search")}
    />
  );
}

/** M2 Suppliers. The list is always shown; /new and /:id open the form in a sheet on top of it. */
export function SuppliersPage() {
  return (
    <>
      <SuppliersListPage />
      <Routes>
        <Route path="new" element={<SupplierFormPage />} />
        <Route path=":id" element={<SupplierFormPage />} />
      </Routes>
    </>
  );
}
