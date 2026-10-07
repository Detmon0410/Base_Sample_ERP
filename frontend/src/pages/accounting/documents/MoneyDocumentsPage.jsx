import { TriangleAlertIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation } from "react-router";

import { RemountOnId } from "@/components/common/RemountOnId";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { canWork, DIRECTIONS } from "@/config/accounting";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { customerInvoiceService, supplierBillService } from "@/services/accounting.service";
import { customerService } from "@/services/customer.service";
import { supplierService } from "@/services/supplier.service";
import { formatCurrency, formatDate } from "@/utils/format";

import { MoneyDocumentSheet } from "./MoneyDocumentSheet";

const SERVICES = { ar: customerInvoiceService, ap: supplierBillService };
const EXTRA_KEYS = ["party", "dueFrom", "dueTo"];

function MoneyDocumentsListPage({ direction }) {
  const { t, i18n } = useTranslation(["accounting", "nav"]);
  const d = DIRECTIONS[direction];
  const ns = d.ns;
  const { user } = useAuth();
  const { search } = useLocation();
  const { options: parties } = useOptions(direction === "ar" ? customerService : supplierService);

  const columns = useMemo(() => {
    const language = i18n.language;
    const money = (value) => formatCurrency(value, language);
    return [
      { key: "number", header: t(`accounting:${ns}.columns.number`), sortable: true },
      { key: "date", header: t("accounting:columns.date"), sortable: true, render: (row) => formatDate(row.date, language) },
      { key: "partyCode", header: t(`accounting:${ns}.columns.party`), sortable: true, render: (row) => `${row.partyCode} · ${row.partyName}` },
      { key: "ref", header: t(`accounting:${ns}.columns.ref`), render: (row) => (direction === "ar" ? row.deliveryNumber : row.poNumber) ?? "—" },
      {
        key: "dueDate",
        header: t("accounting:columns.dueDate"),
        sortable: true,
        render: (row) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            {formatDate(row.dueDate, language)}
            {row.overdueDays > 0 ? <TriangleAlertIcon className="size-4 text-destructive" aria-label={t("accounting:overdueShort", { count: row.overdueDays })} /> : null}
          </span>
        ),
      },
      { key: "total", header: t("accounting:columns.total"), sortable: true, align: "right", render: (row) => money(row.total), sum: money },
      { key: "paid", header: t("accounting:columns.paid"), sortable: true, align: "right", render: (row) => money(row.paid), sum: money },
      { key: "balance", header: t("accounting:columns.balance"), sortable: true, align: "right", render: (row) => <span className={row.balance > 0 ? "font-semibold text-slate-900" : ""}>{money(row.balance)}</span>, sum: money },
      { key: "status", header: t("accounting:columns.status"), sortable: true, render: (row) => <DocumentStatusBadge status={row.status} /> },
    ];
  }, [t, i18n.language, direction, ns]);

  const extraFilters = useMemo(
    () => [
      { key: "party", label: t(`accounting:${ns}.columns.party`), kind: "search", options: parties.map((party) => ({ value: String(party.id), label: `${party.code} · ${party.name}` })) },
      { key: "due", label: t("accounting:columns.dueDate"), kind: "dateRange", fromKey: "dueFrom", toKey: "dueTo" },
    ],
    [parties, t, ns],
  );

  return (
    <DocumentListPage
      title={t(`nav:items.${direction === "ar" ? "invoices" : "bills"}`)}
      service={SERVICES[direction]}
      statuses={d.statuses}
      stepper
      stepperUnit={ns}
      customerFilter={false}
      extraFilters={extraFilters}
      extraKeys={EXTRA_KEYS}
      dateLabel={t("accounting:columns.date")}
      columns={columns}
      rowTo={(row) => `${d.docPath}/${row.id}${search}`}
      newTo={canWork(user) ? `${d.docPath}/new${search}` : null}
      newLabel={t(`accounting:${ns}.new`)}
      emptyText={t(`accounting:${ns}.empty`)}
      noResultText={t("accounting:noResult")}
      searchLabel={t(`accounting:${ns}.search`)}
    />
  );
}

/** C1 / C3. The list is always shown; /new and /:id open the sheet on top of it. */
export function MoneyDocumentsPage({ direction }) {
  return (
    <>
      <MoneyDocumentsListPage direction={direction} />
      <Routes>
        <Route path="new" element={<RemountOnId><MoneyDocumentSheet direction={direction} /></RemountOnId>} />
        <Route path=":id" element={<RemountOnId><MoneyDocumentSheet direction={direction} /></RemountOnId>} />
      </Routes>
    </>
  );
}

export const InvoicesPage = () => <MoneyDocumentsPage direction="ar" />;
export const BillsPage = () => <MoneyDocumentsPage direction="ap" />;
