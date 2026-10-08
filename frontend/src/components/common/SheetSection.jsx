import { cn } from "@/lib/utils";

// A plain look (docs/specs/f14-plain-ui.md): a white box with a thin grey border, a small corner and no shadow.
/** The look of every block inside a detail sheet. */
export const CARD_CLASS = "rounded-md border border-slate-300 bg-card";

/** The white box of a whole list (filters, table, paging). */
export const PANEL_CLASS = "rounded-md border border-slate-300 bg-card";

/**
 * A block of a detail sheet: a plain icon and a title, a line, then the content. Blocks do not fold;
 * the sheet itself can be made wider or narrower instead (see DetailSheet).
 *   icon   not drawn any more (a plain look); callers may still pass it
 *   aside  shown at the right end of the title line (e.g. document number and status)
 */
export function SheetSection({ title, aside, className, children }) {
  return (
    <section className={cn(CARD_CLASS, className)}>
      <h3 className="m-0 flex min-h-12 items-center gap-3 px-5 py-2 text-lg font-bold">
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {aside}
      </h3>
      <div className="border-t border-slate-300 px-5 pt-4 pb-5">{children}</div>
    </section>
  );
}
