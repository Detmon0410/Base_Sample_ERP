/**
 * Top of every page. The title is NOT shown visually (the breadcrumb already says where the user is) but stays
 * in the page as a screen-reader-only h1 so every page keeps one heading. A page with nothing else to show
 * (no description, no actions) takes no space at all, so its content starts right under the top bar.
 * Page actions (e.g. the primary action of a page) sit on the right.
 */
export function PageHeader({ title, description, actions }) {
  if (!description && !actions) return <h1 className="sr-only">{title}</h1>;

  return (
    <div className="mb-5 flex items-start justify-between gap-6">
      <div>
        <h1 className="sr-only">{title}</h1>
        {description ? <p className="text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="ml-auto flex shrink-0 gap-3">{actions}</div> : null}
    </div>
  );
}
