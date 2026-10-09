/**
 * The title band at the top of every page: light grey, the title on the left (with a status word in a square box
 * next to it when the page has one), the page actions on the right (docs/specs/s2-mini-erp-look.md).
 */
export function PageHeader({ title, status, description, actions }) {
  return (
    <div className="-mx-5 -mt-4 mb-5 border-b border-slate-200 bg-[#eeeeee] px-5 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="flex items-center gap-3 text-xl font-bold">
          {title}
          {status ? <span className="border border-foreground px-2 py-0.5 text-sm font-medium">{status}</span> : null}
        </h1>
        {actions ? <div className="ml-auto flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
      {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
    </div>
  );
}
