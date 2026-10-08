import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";
import { canApproveAnywhere, canUse, isAdmin } from "@/utils/permissions";
import { formatTime } from "@/utils/format";

import {
  ActivityBlock,
  ApprovalsBlock,
  MyRecentBlock,
  ProductionBlock,
  StockAlertsBlock,
} from "./Blocks";
import { DepartmentPanel } from "./DepartmentPanels";
import { KpiCard, KpiCardSkeleton } from "./KpiCard";
import { ShortcutTiles } from "./ShortcutTiles";
import { KPI_DEFS } from "./kpis";

const DEPARTMENTS = ["Sale", "Factory", "Purchase", "Accounting"];
const OVERVIEW = "overview";

/** The departments of the user that have a panel, in menu order (Admin: all). */
function panelsOf(user) {
  return DEPARTMENTS.filter((department) => isAdmin(user) || user?.memberships?.some((membership) => membership.department === department));
}

/**
 * D1 — one page per department of the user (docs/specs/d2-dashboard-by-department.md) and an overview of all departments
 * (docs/specs/f2-app-shell-dashboard.md). Admin opens the overview, everybody else the first department of theirs.
 */
export function DashboardPage() {
  const { t, i18n } = useTranslation("dashboard");
  const { user } = useAuth();
  const { status, data, error, retry } = useDashboard();
  const [params, setParams] = useSearchParams();
  const departments = panelsOf(user);
  const views = isAdmin(user) ? [OVERVIEW, ...departments] : [...departments, OVERVIEW];
  const requested = params.get("view");
  const view = views.includes(requested) ? requested : isAdmin(user) || departments.length === 0 ? OVERVIEW : departments[0];

  const loading = status === "loading";
  const errors = data?.errors ?? {};
  // Workers get "My recent documents" instead of approvals; decide from the role so the title does not flip after loading.
  const showApprovals = data ? data.approvals !== null : canApproveAnywhere(user);
  const block = (name) => ({ loading, hasError: Boolean(errors[name]), onRetry: retry, items: data?.[name] });

  return (
    <>
      {/* The page updates itself (see useDashboard); nothing to show or press here. */}
      <PageHeader title={t("title")} />


      {status === "error" ? (
        <Alert variant="destructive" className="mb-6 p-4 text-base">
          <AlertTitle className="text-base font-bold">{t("loadErrorPage")}</AlertTitle>
          <AlertDescription className="flex items-center gap-4 text-base">
            <Button type="button" size="sm" variant="outline" onClick={retry}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {error && data ? (
        <Alert variant="destructive" className="mb-6 p-4 text-base">
          <AlertTitle className="text-base font-bold">
            {t("refreshFailed", { time: formatTime(data.generatedAt, i18n.language) })}
          </AlertTitle>
        </Alert>
      ) : null}

      <ShortcutTiles />

      {views.length > 1 ? (
        <div role="tablist" aria-label={t("title")} className="mb-5 flex flex-wrap gap-2">
          {views.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={view === name}
              onClick={() => setParams(name === (isAdmin(user) ? OVERVIEW : departments[0]) ? {} : { view: name }, { replace: true })}
              className={cn("min-h-11 rounded-md border px-4 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring", view === name ? "border-primary bg-primary text-primary-foreground" : "border-slate-300 bg-card hover:bg-muted/50")}
            >
              {t(`views.${name}`)}
            </button>
          ))}
        </div>
      ) : null}

      {view !== OVERVIEW ? (
        <DepartmentPanel department={view} departments={data?.departments} loading={loading || status === "error"} hasError={Boolean(errors.departments)} onRetry={retry} />
      ) : (
        <>
      <section aria-label={t("title")} className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        {loading || status === "error"
          ? KPI_DEFS.map((def) => <KpiCardSkeleton key={def.key} />)
          : KPI_DEFS.map((def) => {
              const kpi = data.kpis?.[def.key];
              if (!kpi) return <KpiCardSkeleton key={def.key} />;
              return (
                <KpiCard
                  key={def.key}
                  department={def.department}
                  label={t(`kpis.${def.key}.label`)}
                  value={def.value(kpi, i18n.language)}
                  context={t(`kpis.${def.key}.context`, def.context(kpi, i18n.language))}
                  problem={def.problem ? def.problem(kpi) : false}
                  to={def.to}
                  canLink={canUse(user, { type: "departments", departments: [def.department] })}
                />
              );
            })}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {showApprovals ? (
          <ApprovalsBlock {...block("approvals")} />
        ) : (
          <MyRecentBlock {...block("myRecentDocuments")} />
        )}
        <StockAlertsBlock {...block("stockAlerts")} />
        <ProductionBlock {...block("production")} />
        <ActivityBlock {...block("activity")} />
      </div>
        </>
      )}
    </>
  );
}
