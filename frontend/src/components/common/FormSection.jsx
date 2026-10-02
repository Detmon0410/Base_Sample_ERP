/** A titled block of fields inside a form page (F3 spec 2.2). Fields go in a two-column grid. */
export function FormSection({ title, children, columns = 2 }) {
  return (
    <section className="rounded-xl border bg-card p-6">
      <h2 className="mb-5 text-lg font-bold">{title}</h2>
      <div className={columns === 1 ? "grid gap-5" : "grid grid-cols-2 gap-x-6 gap-y-5"}>{children}</div>
    </section>
  );
}
