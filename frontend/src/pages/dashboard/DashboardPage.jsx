import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/common/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useDashboard } from "@/hooks/useDashboard";
import { canApproveAnywhere, canUse } from "@/utils/permissions";
import { formatTime } from "@/utils/format";

import {
  ActivityBlock,
  ApprovalsBlock,
  MyRecentBlock,
  ProductionBlock,
  StockAlertsBlock,
} from "./Blocks";
import { KpiCard, KpiCardSkeleton } from "./KpiCard";
import { KPI_DEFS } from "./kpis";

/** D1 — overview of all departments for every signed-in user (docs/specs/f2-app-shell-dashboard.md). */
export function DashboardPage() {
  const { t, i18n } = useTranslation("dashboard");
  const { user } = useAuth();
  const { status, data, error, retry } = useDashboard();

  const loading = status === "loading";
  const errors = data?.errors ?? {};
  // Workers get "My recent documents" instead of approvals; decide from the role so the title does not flip after loading.
  const showApprovals = data ? data.approvals !== null : canApproveAnywhere(user);
  const block = (name) => ({ loading, hasError: Boolean(errors[name]), onRetry: retry, items: data?.[name] });

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          // No refresh button: the page updates itself (see useDashboard). This only shows it is live.
          data?.generatedAt ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <span aria-hidden="true" className="relative flex size-2.5">
                <span className="absolute inline-flex size-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
                <span className="relative inline-flex size-2.5 rounded-full bg-success" />
              </span>
              <span className="font-semibold text-foreground">{t("live")}</span>
              {t("updatedAt", { time: formatTime(data.generatedAt, i18n.language, true) })}
            </p>
          ) : null
        }
      />

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

      <section aria-label={t("title")} className="mb-6 grid grid-cols-4 gap-5">
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

      <div className="grid grid-cols-2 gap-5">
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
  );
}
