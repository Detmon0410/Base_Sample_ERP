import { ChevronLeftIcon, ChevronRightIcon, ClockAlertIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { addDaysIso, todayIso } from "@/utils/dates";
import { formatDate, formatNumber } from "@/utils/format";

import { donePercent, lateSpan, PAGE_DAYS, pageDays, pageStart, planSpan, sortRows } from "./timelineLayout";

// dark = the done part of the bar, light = the rest
const BAR = {
  draft: { dark: "bg-slate-500", light: "bg-slate-200" },
  scheduled: { dark: "bg-sky-600", light: "bg-sky-100" },
  in_process: { dark: "bg-amber-500", light: "bg-amber-100" },
  late: { dark: "bg-orange-600", light: "bg-orange-100" },
  finished: { dark: "bg-emerald-600", light: "bg-emerald-100" },
  cancelled: { dark: "bg-red-400", light: "bg-red-100" },
};
const OVERRUN = "bg-[repeating-linear-gradient(45deg,#fdba74_0,#fdba74_4px,#fff7ed_4px,#fff7ed_8px)]";
const CLOSED = ["finished", "cancelled"];
const LEFT = "w-72 shrink-0";

/**
 * The work orders on a time line (a simple Gantt chart): one row per work order, a bar from its plan start to its plan
 * finish, the done part (steps done / steps total) darker, and a hatched part when it runs past the plan. Late bars are
 * orange, today is a blue column. Finished and cancelled work orders are hidden until the switch is turned on.
 * A row and a bar open the work order (`to(wo)`); nothing is dragged.
 */
export function WorkOrderTimeline({ items, status, onRetry, to }) {
  const { t, i18n } = useTranslation("factory");
  const language = i18n.language;
  const today = todayIso();
  const [scale, setScale] = useState("week");
  const [start, setStart] = useState(() => pageStart(today, PAGE_DAYS.week));
  const [showClosed, setShowClosed] = useState(false);
  const days = PAGE_DAYS[scale];

  const columns = useMemo(() => pageDays(start, days, today), [start, days, today]);
  const months = useMemo(() => {
    const runs = [];
    for (const [index, day] of columns.entries()) {
      const last = runs[runs.length - 1];
      if (last && last.month === day.month && last.year === day.year) last.span += 1;
      else runs.push({ month: day.month, year: day.year, from: index, span: 1 });
    }
    return runs.map((run) => ({ ...run, label: new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(new Date(run.year, run.month, 1)) }));
  }, [columns, language]);
  const rows = useMemo(() => sortRows(showClosed ? items : items.filter((wo) => !CLOSED.includes(wo.status))), [items, showClosed]);

  const choose = (next) => {
    setScale(next);
    setStart(pageStart(today, PAGE_DAYS[next]));
  };
  const grid = { gridTemplateColumns: `repeat(${days}, minmax(2.5rem, 1fr))` };

  if (status === "loading") return <Skeleton className="mx-3 h-72 rounded-xl" aria-busy="true" />;
  if (status === "error") {
    return (
      <div role="alert" className="mx-3 flex flex-col items-center gap-3 rounded-lg border border-slate-200 px-3 py-10">
        <p>{t("master:common.loadError")}</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          {t("master:common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 px-3 pb-3">
        <div role="group" aria-label={t("timeline.scale")} className="flex h-10 overflow-hidden rounded-lg border border-input bg-card">
          {["week", "month"].map((key, index) => (
            <button
              key={key}
              type="button"
              aria-pressed={scale === key}
              onClick={() => choose(key)}
              className={cn("px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset", scale === key ? "bg-secondary font-semibold text-primary" : "text-muted-foreground hover:bg-muted", index > 0 && "border-l border-input")}
            >
              {t(`timeline.${key}`)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="size-10" aria-label={t("timeline.previous")} onClick={() => setStart((current) => addDaysIso(current, -days))}>
            <ChevronLeftIcon />
          </Button>
          <Button type="button" variant="outline" className="h-10" onClick={() => setStart(pageStart(today, days))}>
            {t("timeline.today")}
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-10" aria-label={t("timeline.next")} onClick={() => setStart((current) => addDaysIso(current, days))}>
            <ChevronRightIcon />
          </Button>
        </div>
        <label className="ml-auto flex items-center gap-2 text-base">
          <Switch checked={showClosed} onCheckedChange={setShowClosed} aria-label={t("timeline.showClosed")} />
          {t("timeline.showClosed")}
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        <div className="min-w-fit rounded-xl bg-card">
          {/* the scale: months and days; it stays on top while the rows scroll */}
          <div className="sticky top-0 z-20 flex rounded-t-xl border-b border-slate-200 bg-card">
            <div className={cn(LEFT, "sticky left-0 z-30 flex items-end rounded-tl-xl bg-card px-3 pb-2 text-sm font-semibold text-muted-foreground")}>{t("timeline.workOrder")}</div>
            <div className="min-w-0 flex-1">
              <div className="grid" style={grid}>
                {months.map((run) => (
                  <div key={`${run.year}-${run.month}`} style={{ gridColumn: `${run.from + 1} / span ${run.span}` }} className="truncate border-l border-slate-200 px-2 pt-2 text-sm font-semibold text-slate-700">
                    {run.label}
                  </div>
                ))}
              </div>
              <div className="grid" style={grid}>
                {columns.map((day) => (
                  <div key={day.iso} className={cn("border-l border-slate-200 py-1.5 text-center text-sm", day.weekend && "bg-slate-50 text-muted-foreground", day.today && "bg-primary font-bold text-white")}>
                    {day.day}
                    {day.today ? <span className="sr-only"> ({t("timeline.today")})</span> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {rows.length === 0 ? <p className="px-4 py-10 text-center text-muted-foreground">{t("workOrders.empty")}</p> : null}
          {rows.map((wo, index) => {
            const span = planSpan(wo, start, days);
            const overrun = lateSpan(wo, start, days, today);
            const tone = wo.progress.late && !CLOSED.includes(wo.status) ? BAR.late : (BAR[wo.status] ?? BAR.draft);
            const percent = donePercent(wo);
            const range = wo.planStart && wo.planFinish ? `${formatDate(wo.planStart, language)} → ${formatDate(wo.planFinish, language)}` : t("card.noPlan");
            const summary = `${wo.number}, ${wo.productName}, ${formatNumber(wo.qty, language)} ${wo.uom}, ${range}, ${t("card.stepsDone", { done: wo.progress.stepsDone, total: wo.progress.stepsTotal })}${wo.progress.late ? `, ${t("card.lateDays", { count: wo.progress.lateDays })}` : ""}`;
            const noPlanHeading = !span && rows[index - 1] && planSpan(rows[index - 1], start, days) !== null ? t("timeline.noPlan") : null;
            return (
              <div key={wo.id}>
                {noPlanHeading ? <p className="border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-muted-foreground">{noPlanHeading}</p> : null}
                <div className="flex min-h-14 border-b border-slate-200 last:border-b-0">
                  <Link to={to(wo)} className={cn(LEFT, "sticky left-0 z-10 block bg-card px-3 py-2 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset")}>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-base font-bold text-slate-900">{wo.number}</span>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {formatNumber(wo.qty, language)} {wo.uom}
                      </span>
                    </span>
                    <span className="block truncate text-sm text-slate-700">{wo.productName}</span>
                    <span className="mt-1 flex items-center gap-2 text-sm">
                      <DocumentStatusBadge status={wo.status} />
                      {wo.progress.late && !CLOSED.includes(wo.status) ? (
                        <span className="flex items-center gap-1 truncate font-semibold text-amber-700">
                          <ClockAlertIcon className="size-4 shrink-0" aria-hidden="true" />
                          {t("card.lateDays", { count: wo.progress.lateDays })}
                        </span>
                      ) : wo.status === "in_process" && wo.progress.currentStep ? (
                        <span className="truncate text-muted-foreground">{wo.progress.currentStep.processName}</span>
                      ) : null}
                    </span>
                  </Link>
                  <div className="relative min-w-0 flex-1">
                    <div className="absolute inset-0 grid" style={grid} aria-hidden="true">
                      {columns.map((day) => (
                        <div key={day.iso} className={cn("border-l border-slate-200", day.weekend && "bg-slate-50", day.today && "border-x-2 border-primary bg-primary/5")} />
                      ))}
                    </div>
                    <div className="relative grid h-full items-center py-2" style={grid}>
                      {span?.from != null ? (
                        <>
                          <Link
                            to={to(wo)}
                            aria-label={summary}
                            title={summary}
                            style={{ gridColumn: `${span.from + 1} / ${span.to + 2}`, gridRow: 1 }}
                            className={cn("relative z-10 flex h-8 items-center overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1", tone.light, span.before ? "rounded-l-none" : "rounded-l-md", span.after ? "rounded-r-none" : "rounded-r-md")}
                          >
                            <span className={cn("h-full", tone.dark)} style={{ width: `${percent}%` }} />
                            <span className="absolute inset-0 flex items-center px-2 text-sm font-bold text-slate-900 mix-blend-normal">
                              <span className={cn("truncate rounded px-1", percent > 0 && "bg-white/80")}>
                                {wo.progress.stepsDone}/{wo.progress.stepsTotal}
                              </span>
                            </span>
                          </Link>
                          {overrun ? (
                            <span
                              aria-hidden="true"
                              style={{ gridColumn: `${overrun.from + 1} / ${overrun.to + 2}`, gridRow: 1 }}
                              className={cn("z-10 flex h-8 items-center justify-end rounded-r-md border border-orange-300 pr-1 text-orange-700", OVERRUN)}
                            >
                              <ClockAlertIcon className="size-4 rounded-full bg-white/80" />
                            </span>
                          ) : null}
                        </>
                      ) : span?.outside ? (
                        <p style={{ gridColumn: "1 / -1" }} className={cn("relative z-10 truncate px-3 text-sm text-muted-foreground", span.outside === "before" ? "text-left" : "text-right")}>
                          {span.outside === "before" ? `← ${range}` : `${range} →`}
                        </p>
                      ) : (
                        <p style={{ gridColumn: "1 / -1" }} className="relative z-10 px-3 text-sm text-muted-foreground">
                          {t("card.noPlan")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
