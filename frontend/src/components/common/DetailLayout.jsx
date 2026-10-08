/**
 * Layout of every document / record detail page (Quotation, Sale Order, Work Order, PO…).
 *
 *   header   DetailHeader: number, status, key facts, page actions
 *   main     DetailSection blocks (fields, lines, notes)
 *   aside    StatusTimeline
 *
 * Wide screens show main and aside side by side; narrow screens (e.g. 200% zoom) stack them.
 */
export function DetailLayout({ header, children, aside }) {
  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-5">{children}</div>
        {aside ? <aside className="flex min-w-0 flex-col gap-5">{aside}</aside> : null}
      </div>
    </div>
  );
}

/**
 * Top of a detail page: back link, document number and status on the left, actions on the right.
 * One primary action at most; destructive actions look different (variant="destructive").
 */
export function DetailHeader({ title, status, meta, backLink, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-col gap-2">
        {backLink}
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold break-words">{title}</h2>
          {status}
        </div>
        {meta ? <p className="text-muted-foreground">{meta}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

/** A titled card in the main column. `actions` sit next to the title (e.g. "Add line"). */
export function DetailSection({ title, actions, children, className = "" }) {
  return (
    <section className={`rounded-xl border bg-card p-6 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Read-only label / value pairs. `items`: [{ label, value, wide? }]. Empty values show a dash. */
export function DetailFields({ items, columns = 2 }) {
  return (
    <dl className={columns === 1 ? "grid gap-4" : "grid gap-x-8 gap-y-4 md:grid-cols-2"}>
      {items.map((item) => (
        <div key={item.label} className={item.wide ? "md:col-span-2" : undefined}>
          <dt className="text-sm font-semibold text-muted-foreground">{item.label}</dt>
          <dd className="mt-0.5 break-words">{item.value || item.value === 0 ? item.value : "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
