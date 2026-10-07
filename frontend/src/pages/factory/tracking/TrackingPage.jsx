import { CheckCircle2Icon, ClockAlertIcon, CogIcon, HourglassIcon, PlayIcon, UserIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { EntitySelect } from "@/components/common/EntitySelect";
import { PageHeader } from "@/components/common/PageHeader";
import { CARD_CLASS } from "@/components/common/SheetSection";
import { useStepDialogs } from "@/components/factory/useStepDialogs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { canWork } from "@/config/factory";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { listTracking } from "@/services/factory.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { cn } from "@/lib/utils";
import { formatDateTime, formatNumber } from "@/utils/format";
import { notifyMasterChanged, onRefresh } from "@/utils/masterEvents";

const COLUMNS = [
  { key: "waiting", icon: HourglassIcon, tone: "text-slate-600" },
  { key: "running", icon: CogIcon, tone: "text-primary" },
  { key: "done", icon: CheckCircle2Icon, tone: "text-success" },
];

/** One step on the shop-floor board: big, with the one button that matters (Start or Done, at least 48px). */
function TrackingCard({ card, onStart, onDone, canAct }) {
  const { t, i18n } = useTranslation("factory");
  const language = i18n.language;
  const { step } = card;
  return (
    <div className={cn(CARD_CLASS, "flex flex-col gap-3 p-4", card.column === "running" && "ring-2 ring-primary/30")}>
      <div className="flex items-start justify-between gap-2">
        <Link to={`/factory/work-orders/${card.workOrderId}`} className="rounded-sm text-lg font-bold text-slate-900 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
          {card.workOrderNumber}
        </Link>
        <span className="shrink-0 font-bold text-slate-900">
          × {formatNumber(card.qty, language)} <span className="text-sm font-normal text-muted-foreground">{card.uom}</span>
        </span>
      </div>
      <p className="-mt-2 truncate text-sm text-muted-foreground">
        {card.productCode} · {card.productName}
      </p>

      <div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("tracking.stepOf", { number: step.stepNo, total: card.stepsTotal })}</p>
        <p className="text-xl font-bold text-slate-900">{step.processName}</p>
      </div>

      <p className="flex flex-col gap-0.5 text-sm text-slate-700">
        <span className="flex items-center gap-1.5">
          <CogIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> {step.machineCode ? `${step.machineCode} · ${step.machineName}` : t("steps.noMachine")}
        </span>
        {step.operatorName ? (
          <span className="flex items-center gap-1.5">
            <UserIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> {step.operatorName}
          </span>
        ) : null}
      </p>

      {card.column === "running" ? (
        <p className="text-sm text-muted-foreground">{t("tracking.startedAt", { time: formatDateTime(step.startAt, language) })}</p>
      ) : null}
      {card.column === "done" ? (
        <p className="text-sm text-slate-700">
          <span className="font-semibold">{t("tracking.completed", { qty: formatNumber(step.qtyDone, language) })}</span>
          {step.qtyDefect > 0 ? <span className="font-semibold text-destructive"> · {t("steps.defectCount", { count: step.qtyDefect })}</span> : null}
          <span className="text-muted-foreground"> · {formatDateTime(step.endAt, language)}</span>
        </p>
      ) : null}

      {card.late && card.column !== "done" ? (
        <p role="status" className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm font-semibold text-amber-800">
          <ClockAlertIcon className="size-4 shrink-0" aria-hidden="true" /> {t("tracking.late")}
        </p>
      ) : null}

      {card.column === "waiting" && canAct ? (
        <Button type="button" size="lg" className="h-12 w-full text-lg" onClick={() => onStart(card)}>
          <PlayIcon aria-hidden="true" /> {t("steps.start")}
        </Button>
      ) : null}
      {card.column === "running" && canAct ? (
        <Button type="button" size="lg" className="h-12 w-full bg-success text-lg hover:bg-success/90" onClick={() => onDone(card)}>
          <CheckCircle2Icon aria-hidden="true" /> {t("steps.done")}
        </Button>
      ) : null}
    </div>
  );
}

/** F4 Production tracking — /factory/tracking: the shop-floor board, three columns: Waiting · Running · Done today. */
export function TrackingPage() {
  const { t } = useTranslation(["factory", "nav"]);
  const { user } = useAuth();
  const { options: machines } = useOptions(simpleMasterServices.machines);
  const [machine, setMachine] = useState("");
  const [state, setState] = useState({ status: "loading", cards: [] });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => onRefresh(reload), [reload]);
  useEffect(() => {
    let cancelled = false;
    listTracking(machine ? { machine } : {})
      .then((cards) => !cancelled && setState({ status: "ready", cards }))
      .catch(() => !cancelled && setState((previous) => ({ status: previous.cards.length ? "ready" : "error", cards: previous.cards })));
    return () => {
      cancelled = true;
    };
  }, [machine, reloadKey]);

  const stepDialogs = useStepDialogs({
    onChanged: () => {
      notifyMasterChanged();
      reload();
    },
  });
  const wo = (card) => ({ id: card.workOrderId, number: card.workOrderNumber, qty: card.qty, uom: card.uom });
  const grouped = useMemo(() => Object.fromEntries(COLUMNS.map(({ key }) => [key, state.cards.filter((card) => card.column === key)])), [state.cards]);

  return (
    <>
      <PageHeader title={t("nav:items.productionTracking")} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">{t("factory:tracking.hint")}</p>
        <div className="flex w-full items-center gap-2 sm:w-80">
          <span className="shrink-0 text-sm font-semibold text-muted-foreground">{t("factory:tracking.machineFilter")}</span>
          <EntitySelect id="tracking-machine" options={machines} value={machine} onChange={setMachine} emptyLabel={t("factory:tracking.allMachines")} className="h-10" aria-label={t("factory:tracking.machineFilter")} />
        </div>
      </div>

      {state.status === "error" ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border bg-card p-6">
          <p>{t("master:common.loadError")}</p>
          <Button type="button" variant="outline" onClick={reload}>
            {t("master:common.retry")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {COLUMNS.map(({ key, icon: Icon, tone }) => (
            <section key={key} aria-label={t(`factory:tracking.columns.${key}`)} className="flex flex-col gap-3 rounded-xl bg-slate-100 p-3">
              <h2 className="flex items-center gap-2 px-1 text-lg font-bold">
                <Icon className={cn("size-5", tone)} aria-hidden="true" /> {t(`factory:tracking.columns.${key}`)}
                <span className="ml-auto rounded-full bg-card px-2.5 py-0.5 text-sm font-semibold text-slate-700">{state.status === "loading" ? "…" : grouped[key].length}</span>
              </h2>
              {state.status === "loading" ? (
                <>
                  <Skeleton className="h-48 rounded-xl" />
                  <Skeleton className="h-48 rounded-xl" />
                </>
              ) : grouped[key].length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-muted-foreground">{t(`factory:tracking.empty.${key}`)}</p>
              ) : (
                grouped[key].map((card) => (
                  <TrackingCard
                    key={`${card.workOrderId}-${card.step.id}`}
                    card={card}
                    canAct={canWork(user)}
                    onStart={(c) => stepDialogs.open("start", wo(c), c.step)}
                    onDone={(c) => stepDialogs.open("done", wo(c), c.step)}
                  />
                ))
              )}
            </section>
          ))}
        </div>
      )}
      {stepDialogs.element}
    </>
  );
}
