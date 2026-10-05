import { PaperclipIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useLocation } from "react-router";

import { RemountOnId } from "@/components/common/RemountOnId";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { canWork } from "@/config/sale";
import { useAuth } from "@/hooks/useAuth";
import { customerPoService } from "@/services/sale.service";
import { formatDate } from "@/utils/format";

import { CustomerPoSheet } from "./CustomerPoSheet";

const PATH = "/sale/customer-pos";

function CustomerPosListPage() {
  const { t, i18n } = useTranslation(["sale", "nav"]);
  const { user } = useAuth();
  const { search } = useLocation();

  const columns = useMemo(
    () => [
      {
        key: "poNumber",
        header: t("sale:columns.poNumber"),
        sortable: true,
        render: (row) => (
          <Link to={`${PATH}/${row.id}${search}`} className="underline-offset-4 hover:underline">
            {row.poNumber}
          </Link>
        ),
      },
      { key: "date", header: t("sale:columns.poDate"), sortable: true, render: (row) => formatDate(row.poDate, i18n.language) },
      { key: "customerCode", header: t("sale:columns.customer"), sortable: true, render: (row) => `${row.customerCode} · ${row.customerName}` },
      { key: "quotationNumber", header: t("sale:columns.linkedQuotation"), render: (row) => row.quotationNumber ?? "—" },
      { key: "orderNumber", header: t("sale:columns.linkedOrder"), render: (row) => row.orderNumber ?? "—" },
      {
        key: "attachment",
        header: t("sale:columns.attachment"),
        render: (row) =>
          row.attachment ? (
            <span className="inline-flex items-center gap-1.5">
              <PaperclipIcon className="size-4 text-muted-foreground" aria-hidden="true" /> {row.attachment.name}
            </span>
          ) : (
            "—"
          ),
      },
    ],
    [t, i18n.language, search],
  );

  return (
    <DocumentListPage
      title={t("nav:items.customerPos")}
      service={customerPoService}
      statuses={null}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={canWork(user) ? `${PATH}/new${search}` : null}
      newLabel={t("sale:customerPos.new")}
      emptyText={t("sale:customerPos.empty")}
      noResultText={t("sale:customerPos.noResult")}
      searchLabel={t("sale:customerPos.search")}
    />
  );
}

/** S4 Customer POs. The list is always shown; /new and /:id open the sheet on top of it. */
export function CustomerPosPage() {
  return (
    <>
      <CustomerPosListPage />
      <Routes>
        <Route path="new" element={<RemountOnId><CustomerPoSheet /></RemountOnId>} />
        <Route path=":id" element={<RemountOnId><CustomerPoSheet /></RemountOnId>} />
      </Routes>
    </>
  );
}
