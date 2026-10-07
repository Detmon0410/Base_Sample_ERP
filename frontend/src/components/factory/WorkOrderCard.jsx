import { ClockAlertIcon, CogIcon, FlagIcon, UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ProgressBar } from "@/components/common/ProgressBar";
import { CARD_CLASS } from "@/components/common/SheetSection";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { StepProgress } from "@/components/factory/StepProgress";
import { cn } from "@/lib/utils";
import { formatDate, formatNumber } from "@/utils/format";

/**
 * One Work Order as a card: who and what at the top, the routing steps as a row of circles, the step that is
 * running (machine and operator), a bar of how many steps are done, and the plan dates with a late label.
 * The whole card opens the sheet of the Work Order.
 *   wo   a Work Order as the API sends it (with `steps` and `progress`)    to   where the card goes
 */
export function WorkOrderCard({ wo, to }) {
  const { t, i18n } = useTranslation("factory");
  const language = i18n.language;
  const { progress } = wo;
  const current = progress.currentStep;
  const open = ["scheduled", "in_process"].includes(wo.status);
  const allTransferred = wo.status === "finished" && progress.producedQty > 0 && progress.transferredQty >= progress.producedQty;

  return (
    <Link
      to={to}
      className={cn(
        CARD_CLASS,
        "flex h-full flex-col gap-3 p-4 outline-none transition-shadow hover:shadow-[0_2px_4px_rgba(15,23,42,0.08),0_10px_20px_-4px_rgba(15,23,42,0.2)] focus-visible:ring-2 focus-visible:ring-ring",
        wo.status === "cancelled" && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-lg font-bold text-slate-900">{wo.number}</p>
        <DocumentStatusBadge status={wo.status} />
      </div>

      <div>
        <p className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate font-semibold text-slate-900">
            {wo.productCode} <span className="font-normal text-slate-700">· {wo.productName}</span>
          </span>
          <span className="shrink-0 font-bold text-slate-900">
            × {formatNumber(wo.qty, language)} <span className="text-sm font-normal text-muted-foreground">{wo.uom}</span>
          </span>
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {t("card.for")} {wo.saleOrderNumber} · {wo.customerName}
        </p>
      </div>

      <StepProgress steps={wo.steps} size="sm" />

      <div className="min-h-[3.25rem] text-sm">
        {wo.status === "finished" ? (
          <p className="flex items-center gap-1.5 font-semibold text-success">
            <FlagIcon className="size-4 shrink-0" aria-hidden="true" />
            {t("card.produced", { done: formatNumber(progress.producedQty, language), qty: formatNumber(wo.qty, language), uom: wo.uom })}
            {allTransferred ? <span className="font-normal text-muted-foreground"> · {t("card.allTransferred")}</span> : null}
          </p>
        ) : open && current ? (
          <>
            <p className="flex items-center gap-1.5 text-slate-900">
              <CogIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 truncate">
                <span className="text-muted-foreground">{current.status === "in_progress" ? t("card.now") : t("card.next")}:</span> <span className="font-semibold">{current.processName}</span>
                {current.machineCode ? <span className="text-muted-foreground"> · {current.machineCode}</span> : null}
              </span>
            </p>
            {current.operatorName ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                <UserIcon className="size-4 shrink-0" aria-hidden="true" /> {current.operatorName}
              </p>
            ) : null}
          </>
        ) : wo.status === "draft" ? (
          <p className="text-muted-foreground">{t("card.notScheduled")}</p>
        ) : null}
      </div>

      <ProgressBar
        value={progress.stepsDone}
        max={progress.stepsTotal}
        label={t("card.stepsDone", { done: progress.stepsDone, total: progress.stepsTotal })}
        tone={wo.status === "finished" ? "success" : progress.late ? "warning" : "primary"}
      />
      <div className="-mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold text-slate-700">{t("card.stepsDone", { done: progress.stepsDone, total: progress.stepsTotal })}</span>
        <span className="text-muted-foreground">
          {wo.planStart && wo.planFinish ? `${t("card.plan")} ${formatDate(wo.planStart, language)} → ${formatDate(wo.planFinish, language)}` : t("card.noPlan")}
        </span>
      </div>
      {progress.late ? (
        <p role="status" className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm font-semibold text-amber-800">
          <ClockAlertIcon className="size-4 shrink-0" aria-hidden="true" /> {t("card.lateDays", { count: progress.lateDays })}
        </p>
      ) : null}
    </Link>
  );
}
