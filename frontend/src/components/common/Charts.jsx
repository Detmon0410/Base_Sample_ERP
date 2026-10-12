import { cn } from "@/lib/utils";

// Two small charts drawn by hand with CSS and SVG (no chart library). Each has a text alternative: an `aria-label` that says the
// numbers, so the numbers are not only in the picture.

const SERIES_COLORS = ["var(--primary)", "var(--link)"];

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

/**
 * Vertical bars in groups: groups = [{ label, values: [number, number] }], series = [{ label }] (same order as the values).
 * `format` writes a value for the text alternative and the tooltip; the bars are scaled to the largest value.
 */
export function GroupedBars({ groups, series, format = String, label, className }) {
  const width = 560;
  const height = 220;
  const left = 8;
  const bottom = 28;
  const top = 12;
  const max = Math.max(1, ...groups.flatMap((group) => group.values));
  const groupWidth = (width - left) / groups.length;
  const barWidth = Math.min(28, (groupWidth - 16) / series.length);
  const plotHeight = height - bottom - top;

  const text = groups.map((group) => `${group.label}: ${series.map((item, index) => `${item.label} ${format(group.values[index])}`).join(", ")}`).join("; ");

  return (
    <figure className={cn("m-0", className)}>
      <svg role="img" aria-label={`${label}. ${text}`} viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        {[0.5, 1].map((part) => (
          <line key={part} x1={left} x2={width} y1={top + plotHeight * (1 - part)} y2={top + plotHeight * (1 - part)} stroke="var(--border)" strokeWidth="1" />
        ))}
        <line x1={left} x2={width} y1={top + plotHeight} y2={top + plotHeight} stroke="var(--input)" strokeWidth="1" />
        {groups.map((group, groupIndex) => {
          const x0 = left + groupIndex * groupWidth + (groupWidth - barWidth * series.length) / 2;
          return (
            <g key={group.label}>
              {group.values.map((value, index) => {
                const barHeight = (value / max) * plotHeight;
                return (
                  <g key={series[index].label}>
                    <rect x={x0 + index * barWidth} y={top + plotHeight - barHeight} width={barWidth - 2} height={barHeight} fill={SERIES_COLORS[index]}>
                      <title>{`${group.label}: ${series[index].label} ${format(value)}`}</title>
                    </rect>
                    {value > 0 ? (
                      <text x={x0 + index * barWidth + (barWidth - 2) / 2} y={top + plotHeight - barHeight - 4} textAnchor="middle" fontSize="11" fill="var(--foreground)">
                        {format(value)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              <text x={left + groupIndex * groupWidth + groupWidth / 2} y={height - 8} textAnchor="middle" fontSize="12" fill="var(--muted-foreground)">
                {group.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-sm">
        {series.map((item, index) => (
          <span key={item.label} className="inline-flex items-center gap-2">
            <span className="inline-block size-3" style={{ background: SERIES_COLORS[index] }} aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
