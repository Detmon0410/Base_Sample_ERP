// A small chart drawn by hand with CSS (no chart library). It has a text alternative: an `aria-label` that says the
// numbers, so the numbers are not only in the picture.

/** Horizontal bars, one per row: rows = [{ label, value }]. The bar is as long as value / the largest value. */
export function BarList({ rows, format = String, label }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul aria-label={label} className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map((row) => (
        <li key={row.label} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3">
          <span className="text-sm">{row.label}</span>
          <span className="h-6 bg-muted" aria-hidden="true">
            <span className="block h-full bg-primary" style={{ width: `${(row.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-bold">{format(row.value)}</span>
        </li>
      ))}
    </ul>
  );
}
