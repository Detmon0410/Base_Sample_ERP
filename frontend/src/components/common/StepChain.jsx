import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Where a job is, as a chain of steps: the steps before the current one are done (a tick), the current one is marked, the rest are grey.
 * `steps` is a list of { key, label }; `current` is the key of the step the job is at, or the key past the last one when everything is done.
 * The words carry the meaning; the colour and the tick only make it quick to see.
 */
export function StepChain({ steps, current, label }) {
  const at = steps.findIndex((step) => step.key === current);
  return (
    <ol aria-label={label} className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {steps.map((step, index) => {
        const state = at === -1 ? "todo" : index < at ? "done" : index === at ? "current" : "todo";
        return (
          <li key={step.key} aria-current={state === "current" ? "step" : undefined} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true" className="h-px w-5 bg-border" /> : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 text-sm",
                state === "done" && "bg-[#e1f2e8] font-medium text-success",
                state === "current" && "bg-primary font-bold text-primary-foreground",
                state === "todo" && "bg-[#eceef1] text-muted-foreground",
              )}
            >
              {state === "done" ? <Check aria-hidden="true" className="size-4 shrink-0" /> : null}
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
