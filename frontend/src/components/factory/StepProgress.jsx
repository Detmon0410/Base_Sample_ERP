import { CheckIcon, CogIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: { circle: "size-6 text-xs", icon: "size-3.5", line: "top-3", label: "text-xs" },
  md: { circle: "size-8 text-sm", icon: "size-4", line: "top-4", label: "text-sm" },
  lg: { circle: "size-10 text-base", icon: "size-5", line: "top-5", label: "text-sm" },
};

/**
 * The routing steps of a Work Order as a row of circles joined by a line: a green check for a step that is done,
 * a blue cog for the step that is running, a grey number for a step that waits. The same look in a card, in the
 * sheet and on the shop-floor board.
 *   steps       [{ stepNo, processName, status: "pending" | "in_progress" | "done" }]
 *   size        "sm" | "md" | "lg"
 *   showLabels  the process name under each circle (cut with … when it is long; the full name is the title)
 */
export function StepProgress({ steps, size = "sm", showLabels = true, className }) {
  const { t } = useTranslation("factory");
  const look = SIZES[size];

  return (
    <ol className={cn("flex w-full", className)} aria-label={t("steps.listLabel")}>
      {steps.map((step, index) => {
        const done = step.status === "done";
        const running = step.status === "in_progress";
        return (
          <li
            key={step.id ?? step.stepNo}
            className="relative flex min-w-0 flex-1 flex-col items-center"
            aria-label={t("steps.itemLabel", { number: step.stepNo, name: step.processName, status: t(`steps.status.${step.status}`) })}
          >
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={cn("absolute right-1/2 h-0.5 w-full -translate-y-1/2 rounded-full", look.line, steps[index - 1].status === "done" ? "bg-success" : "bg-slate-200")}
              />
            ) : null}
            <span
              aria-hidden="true"
              title={`${step.stepNo}. ${step.processName}`}
              className={cn(
                "relative z-10 grid shrink-0 place-items-center rounded-full border-2 font-semibold",
                look.circle,
                done && "border-success bg-success text-white",
                running && "border-primary bg-primary text-white ring-4 ring-primary/20",
                !done && !running && "border-slate-300 bg-card text-slate-500",
              )}
            >
              {done ? <CheckIcon className={look.icon} /> : running ? <CogIcon className={look.icon} /> : step.stepNo}
            </span>
            {showLabels ? (
              <span className={cn("mt-1 w-full truncate px-0.5 text-center", look.label, running ? "font-semibold text-slate-900" : "text-muted-foreground")} title={step.processName}>
                {step.processName}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
