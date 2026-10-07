import { cn } from "@/lib/utils";

/**
 * A thin bar for "how much of how much". `tone` colours the fill (blue by default, green when it is complete).
 * It has the progressbar role with a text label, so a screen reader hears the same words as the eye reads.
 */
export function ProgressBar({ value, max, label, tone = "primary", className }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
      >
        <div className={cn("h-full rounded-full transition-[width]", tone === "success" ? "bg-success" : tone === "warning" ? "bg-amber-500" : "bg-primary")} style={{ width: `${percent}%` }} />
      </div>
      <span className="shrink-0 text-sm font-semibold text-slate-700">{percent}%</span>
    </div>
  );
}
