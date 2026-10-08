import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useLocation, useSearchParams } from "react-router";

import { RemountOnId } from "@/components/common/RemountOnId";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { canWork, ENTRY_STATUSES } from "@/config/accounting";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { journalService } from "@/services/accounting.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { formatCurrency, formatDate } from "@/utils/format";
import { onMasterChanged } from "@/utils/masterEvents";

import { JournalSheet } from "./JournalSheet";

const PATH = "/accounting/journal";
const EXTRA_KEYS = ["account", "source"];
const DOC_PATHS = { INV: "invoices", RC: "receipts", BILL: "bills", PAY: "payments" };

/** The total of the account that the list is filtered by: debit, credit and the balance (the journal doubles as the ledger). */
function LedgerPanel({ account }) {
  const { t, i18n } = useTranslation("accounting");
  const [summary, setSummary] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => onMasterChanged(() => setReloadKey((key) => key + 1)), []);
  useEffect(() => {
    if (!account) return undefined;
    let cancelled = false;
    journalService
      .list({ account, pageSize: 1 })
      .then((result) => !cancelled && setSummary(result.meta.account))
      .catch(() => !cancelled && setSummary(null));
    return () => {
      cancelled = true;
    };
  }, [account, reloadKey]);
  if (!account || !summary) return null;
  const money = (value) => formatCurrency(value, i18n.language);
  return (
    <section aria-label={t("journal.ledger")} className="mb-4 rounded-md border border-slate-300 bg-card p-4">
      <h2 className="text-lg font-bold">
        {summary.code} · {summary.name}
      </h2>
      <dl className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted-foreground">{t("journal.debit")}</dt>
          <dd className="font-semibold">{money(summary.debit)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t("journal.credit")}</dt>
          <dd className="font-semibold">{money(summary.credit)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">{t("journal.balance")}</dt>
          <dd className="text-lg font-bold text-slate-900">{money(summary.balance)}</dd>
        </div>
      </dl>
    </section>
  );
}

function JournalListPage() {
  const { t, i18n } = useTranslation(["accounting", "nav"]);
  const { user } = useAuth();
  const { search } = useLocation();
  const [params] = useSearchParams();
  const { options: accounts } = useOptions(simpleMasterServices.accounts);

  const columns = useMemo(() => {
    const language = i18n.language;
    const money = (value) => formatCurrency(value, language);
    return [
      { key: "number", header: t("accounting:journal.columns.number"), sortable: true },
      { key: "date", header: t("accounting:columns.date"), sortable: true, render: (row) => formatDate(row.date, language) },
      { key: "memo", secondary: true, header: t("accounting:fields.memo") },
      {
        key: "docNumber", secondary: true,
        header: t("accounting:journal.columns.reference"),
        render: (row) =>
          row.docNumber && DOC_PATHS[row.docType] && row.docId ? (
            <Link to={`/accounting/${DOC_PATHS[row.docType]}/${row.docId}`} className="font-semibold text-primary underline-offset-2 hover:underline">
              {row.docNumber}
            </Link>
          ) : (
            (row.reference || "—")
          ),
      },
      { key: "debit", header: t("accounting:journal.debit"), sortable: true, align: "right", render: (row) => money(row.debit) },
      { key: "credit", header: t("accounting:journal.credit"), sortable: true, align: "right", render: (row) => money(row.credit) },
      { key: "source", secondary: true, header: t("accounting:columns.source"), render: (row) => t(`accounting:source.${row.source}`) },
      { key: "status", header: t("accounting:columns.status"), sortable: true, render: (row) => <DocumentStatusBadge status={row.status} /> },
    ];
  }, [t, i18n.language]);

  const extraFilters = useMemo(
    () => [
      { key: "account", label: t("accounting:journal.account"), kind: "search", options: accounts.map((account) => ({ value: String(account.id), label: `${account.code} · ${account.name}` })) },
      { key: "source", label: t("accounting:columns.source"), kind: "options", options: ["auto", "manual"].map((source) => ({ value: source, label: t(`accounting:source.${source}`) })) },
    ],
    [accounts, t],
  );

  return (
    <DocumentListPage
      title={t("nav:items.journal")}
      service={journalService}
      statuses={ENTRY_STATUSES}
      customerFilter={false}
      defaultSort="-date"
      extraFilters={extraFilters}
      extraKeys={EXTRA_KEYS}
      dateLabel={t("accounting:columns.date")}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={canWork(user) ? `${PATH}/new${search}` : null}
      newLabel={t("accounting:journal.new")}
      emptyText={t("accounting:journal.empty")}
      noResultText={t("accounting:noResult")}
      searchLabel={t("accounting:journal.search")}
      beforePanel={<LedgerPanel account={params.get("account") ?? ""} />}
    />
  );
}

/** C5 Journal entries. The list is always shown; /new and /:id open the sheet on top of it. */
export function JournalPage() {
  return (
    <>
      <JournalListPage />
      <Routes>
        <Route path="new" element={<RemountOnId><JournalSheet /></RemountOnId>} />
        <Route path=":id" element={<RemountOnId><JournalSheet /></RemountOnId>} />
      </Routes>
    </>
  );
}
