import { Link, Navigate, Route, Routes, useParams } from "react-router";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { SimpleMasterPage } from "@/pages/master/simple/SimpleMasterPage";

const TABS = ["accounts", "taxRates", "paymentMethods", "bankAccounts"];

/** One of the four lists under the tabs; the form of a record opens on top of it as a sheet. */
function MasterTab() {
  const { t } = useTranslation("accounting");
  const { entity } = useParams();
  if (!TABS.includes(entity)) return <Navigate to="/accounting/master/accounts" replace />;
  return (
    <>
      <nav aria-label={t("master.tabs")} className="mb-4 flex w-fit flex-wrap overflow-hidden rounded-lg border border-input bg-card">
        {TABS.map((tab, index) => (
          <Link
            key={tab}
            to={`/accounting/master/${tab}`}
            aria-current={entity === tab ? "page" : undefined}
            className={cn("h-11 content-center px-5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset", entity === tab ? "bg-secondary font-semibold text-primary" : "text-muted-foreground hover:bg-muted", index > 0 && "border-l border-input")}
          >
            {t(`master.${tab}`)}
          </Link>
        ))}
      </nav>
      <SimpleMasterPage key={entity} entityKey={entity} />
    </>
  );
}

/** C6 Accounting master: chart of accounts, tax rates, payment methods and bank accounts, in one page with tabs. */
export function AccountingMasterPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="accounts" replace />} />
      <Route path=":entity/*" element={<MasterTab />} />
    </Routes>
  );
}
