import { CheckIcon, CogIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ProgressBar } from "@/components/common/ProgressBar";
import { Button } from "@/components/ui/button";
import { stepAbilities } from "@/config/factory";
import { cn } from "@/lib/utils";
import { formatDateTime, formatNumber } from "@/utils/format";

const time = (value, language) => (value ? formatDateTime(value, language) : null);

/** The round mark of a step on the line: a tick when done, a cog while it runs, its number while it waits. */
function StepMark({ step }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-base font-bold",
        step.status === "done" && "bg-success text-white",
        step.status === "in_progress" && "bg-primary text-white ring-4 ring-primary/20",
        step.status === "pending" && "border-2 border-slate-300 bg-card text-muted-foreground",
      )}
    >
      {step.status === "done" ? <CheckIcon className="size-5" /> : step.status === "in_progress" ? <CogIcon className="size-5" /> : step.stepNo}
    </span>
  );
}

/**
 * How far a work order has come, and the place to work on it: a progress bar with the numbers on top, and under it the
 * steps as a vertical line (Trello / checklist style). Each step shows who works on it, on which machine, when, and how
 * many pieces came out; the buttons Start, Done and Reopen are on the step itself. `stepDialogs` is useStepDialogs().
 */
export function StepTimeline({ record, user, stepDialogs }) {
  const { t, i18n } = useTranslation("factory");
  const language = i18n.language;
  const { progress } = record;
  const tone = record.status === "finished" ? "success" : progress.late ? "warning" : "primary";
  const label = t("card.stepsDone", { done: progress.stepsDone, total: progress.stepsTotal });

  return (
    <div>
      <ProgressBar value={progress.stepsDone} max={progress.stepsTotal} label={label} tone={tone} />
      <p className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-muted-foreground">
          {t("card.produced", { done: formatNumber(progress.producedQty, language), qty: formatNumber(record.qty, language), uom: record.uom })}
          {progress.transferredQty > 0 ? ` · ${t("card.transferred", { qty: formatNumber(progress.transferredQty, language), uom: record.uom })}` : ""}
        </span>
      </p>
      {progress.late ? (
        <p role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          {t("card.lateDays", { count: progress.lateDays })}
        </p>
      ) : null}

      <ol aria-label={t("steps.listLabel")} className="mt-5">
        {record.steps.map((step, index) => {
          const can = stepAbilities(record, step, user);
          const started = time(step.startAt, language);
          const ended = time(step.endAt, language);
          const last = index === record.steps.length - 1;
          return (
            <li key={step.id} className="relative flex gap-3 pb-3 last:pb-0" aria-label={t("steps.itemLabel", { number: step.stepNo, name: step.processName, status: t(`steps.status.${step.status}`) })}>
              {!last ? <span aria-hidden="true" className={cn("absolute top-9 -bottom-0 left-[17px] w-0.5", step.status === "done" ? "bg-success" : "bg-slate-200")} /> : null}
              <StepMark step={step} />
              <div className={cn("min-w-0 flex-1 rounded-lg border bg-card px-3 py-2.5", step.status === "in_progress" ? "border-primary/50" : "border-slate-200")}>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900">{step.processName}</p>
                    <p className={cn("text-sm font-semibold", step.status === "done" ? "text-success" : step.status === "in_progress" ? "text-primary" : "text-muted-foreground")}>
                      {t(`steps.status.${step.status}`)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {can.start ? (
                      <Button type="button" size="sm" variant="secondary" className="h-9" onClick={() => stepDialogs.open("start", record, step)}>
                        {t("steps.start")}
                      </Button>
                    ) : null}
                    {can.done ? (
                      <Button type="button" size="sm" className="h-9" onClick={() => stepDialogs.open("done", record, step)}>
                        {t("steps.done")}
                      </Button>
                    ) : null}
                    {can.reopen ? (
                      <Button type="button" size="sm" variant="ghost" className="h-9 text-slate-600" onClick={() => stepDialogs.open("reopen", record, step)}>
                        {t("steps.reopen")}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="sr-only">{t("steps.machineOperator")}</dt>
                    <dd>{step.machineCode ? `${step.machineCode} · ${step.machineName}` : <span className="text-muted-foreground">{t("steps.noMachine")}</span>}</dd>
                    <dd className="text-muted-foreground">{step.operatorName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">{t("steps.time")}</dt>
                    <dd>{started ? t("steps.startedAt", { time: started }) : <span className="text-muted-foreground">{t("steps.notStarted")}</span>}</dd>
                    {ended ? <dd className="text-muted-foreground">{t("steps.finishedAt", { time: ended })}</dd> : null}
                  </div>
                </dl>

                {step.status === "done" ? (
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">{t("steps.goodQty", { qty: formatNumber(step.qtyDone, language), uom: record.uom })}</span>
                    <span className={cn("ml-3", step.qtyDefect > 0 ? "font-semibold text-destructive" : "text-muted-foreground")}>{t("steps.defectCount", { count: step.qtyDefect })}</span>
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
