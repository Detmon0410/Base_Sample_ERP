import { cn } from "@/lib/utils";

/** Classes that make a control sit flat inside a FilterField (no border of its own, fills the box). */
export const FILTER_CONTROL = "h-full min-w-0 rounded-none border-0 bg-transparent px-3 shadow-none focus-visible:ring-0";

/**
 * One filter of a list toolbar: a small grey label cell and the control beside it in the same rounded box
 * ("Status | All"). It is compact (40px high), shrinks when the row is narrow, and shows one focus ring around
 * the whole box. `children` is the control; give it FILTER_CONTROL so it loses its own border.
 */
export function FilterField({ label, className, children }) {
  return (
    <div
      className={cn(
        "flex h-9 min-w-0 items-stretch overflow-hidden rounded-lg border border-input bg-card focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      <span className="flex shrink-0 items-center border-r border-input bg-slate-100 px-3 text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 items-stretch">{children}</div>
    </div>
  );
}
