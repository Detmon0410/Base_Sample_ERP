/**
 * Title row used at the top of every page: one h1 on the left,
 * the single primary action (and any secondary ones) on the right.
 */
export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-3">{actions}</div> : null}
    </div>
  );
}
