import { cn } from "@/lib/utils";

/** One key number with its small grey label: the number is always the larger of the two. `tone` colours it only when it means something. */
export function StatCard({ label, value, tone, className }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-md border border-border bg-card px-4 py-3", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-3xl font-bold tabular-nums", tone === "warn" && "text-warning", tone === "bad" && "text-destructive", tone === "good" && "text-success")}>{value}</span>
    </div>
  );
}

/** A row of StatCards, one column each on a phone and side by side from a tablet. */
export function StatRow({ children }) {
  return <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">{children}</div>;
}
