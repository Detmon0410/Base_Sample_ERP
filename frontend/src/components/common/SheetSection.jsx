import { cn } from "@/lib/utils";

/** White card with a soft shadow below it: the look of every block inside a detail sheet. */
export const CARD_CLASS = "rounded-xl bg-card shadow-[0_1px_2px_rgba(15,23,42,0.05),0_6px_14px_-4px_rgba(15,23,42,0.14)]";

/** The white box of a whole list (filters, table, paging): a faint shadow all around, none below. */
export const PANEL_CLASS = "rounded-xl bg-card shadow-[0_0_8px_rgba(15,23,42,0.12)]";

/**
 * A block of a detail sheet: a plain icon and a title, a line, then the content. Blocks do not fold;
 * the sheet itself can be made wider or narrower instead (see DetailSheet).
 *   icon  lucide icon component
 */
export function SheetSection({ title, icon: Icon, className, children }) {
  return (
    <section className={cn(CARD_CLASS, className)}>
      <h3 className="m-0 flex min-h-14 items-center gap-3 px-5 py-3 text-lg font-bold">
        {Icon ? <Icon className="size-6 shrink-0 text-primary" aria-hidden="true" /> : null}
        {title}
      </h3>
      <div className="border-t border-slate-200/70 px-5 pt-5 pb-5">{children}</div>
    </section>
  );
}
