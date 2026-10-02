/**
 * Top of every page. The title is NOT shown visually (the breadcrumb already says where the
 * user is) but stays in the page as a screen-reader-only h1 so every page keeps one heading.
 * Page actions (e.g. Refresh, or the primary action of a list) sit on the right.
 */
export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-6">
      <div>
        <h1 className="sr-only">{title}</h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="ml-auto flex shrink-0 gap-3">{actions}</div> : null}
    </div>
  );
}
