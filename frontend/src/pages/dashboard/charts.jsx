import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/**
 * Bars of plain CSS (the text stays the size of the page, also on a phone). One group per label, one bar per series.
 *   data    [{ label, values: [number, ...] }]
 *   series  [{ name, className }]            (className = the colour of the bar)
 *   format  full number for the table, compact the number above a bar
 * Under the bars there is always a table with the full numbers (for people who cannot read a chart).
 */
export function BarChart({ data, series, format, compact, ariaLabel, emptyText }) {
  const { t } = useTranslation("dashboard");
  const max = Math.max(0, ...data.flatMap((row) => row.values));
  if (max === 0) return <p className="py-6 text-center text-muted-foreground">{emptyText}</p>;

  return (
    <div className="flex flex-col gap-3">
      <div role="img" aria-label={ariaLabel} className="flex h-48 items-end gap-2 border-b border-slate-300 pt-6">
        {data.map((row) => (
          <div key={row.label} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1">
            <div className="flex min-h-0 flex-1 items-end justify-center gap-0.5">
              {row.values.map((value, index) => (
                <div key={index} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                  {series.length === 1 ? <span className="mb-0.5 text-xs font-semibold text-slate-700">{value > 0 ? compact(value) : ""}</span> : null}
                  <div className={cn("w-full max-w-10 rounded-t-sm", series[index].className)} style={{ height: `${Math.max(2, (value / max) * 100)}%`, opacity: value > 0 ? 1 : 0.2 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {data.map((row) => (
          <span key={row.label} className="flex min-w-0 flex-1 flex-col items-center gap-0.5 text-xs font-semibold text-muted-foreground">
            {row.label}
            {series.length > 1
              ? row.values.map((value, index) => (
                  <span key={index} className="flex items-center gap-1 font-bold text-slate-700">
                    <span aria-hidden="true" className={cn("size-2 rounded-full", series[index].className)} />
                    {value > 0 ? compact(value) : "-"}
                  </span>
                ))
              : null}
          </span>
        ))}
      </div>
      {series.length > 1 ? (
        <ul className="m-0 flex list-none flex-wrap gap-4 p-0 text-sm">
          {series.map((item) => (
            <li key={item.name} className="flex items-center gap-2">
              <span aria-hidden="true" className={cn("size-3 rounded-sm", item.className)} />
              {item.name}
            </li>
          ))}
        </ul>
      ) : null}
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-primary">{t("showTable")}</summary>
        <table className="mt-2 w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="border-b border-slate-300 py-1 pr-2 font-semibold" />
              {series.map((item) => (
                <th key={item.name} className="border-b border-slate-300 py-1 text-right font-semibold">
                  {item.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.label}>
                <th className="border-b border-slate-200 py-1 pr-2 font-normal">{row.label}</th>
                {row.values.map((value, index) => (
                  <td key={index} className="border-b border-slate-200 py-1 text-right">
                    {format(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/**
 * One line per item: name, a bar as long as its share of the largest value, and the number.
 *   rows  [{ key, label, value, text?, className? }]    `text` replaces the number (for money)
 */
export function BarList({ rows, emptyText }) {
  const max = Math.max(0, ...rows.map((row) => row.value));
  if (max === 0) return <p className="py-6 text-center text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map((row) => (
        <li key={row.key} className="grid grid-cols-[minmax(6rem,9rem)_1fr_auto] items-center gap-3 max-md:grid-cols-[1fr_auto]">
          <span className="min-w-0 break-words font-semibold">{row.label}</span>
          <span className="text-right font-bold md:order-3">{row.text ?? row.value}</span>
          <span className="h-3 overflow-hidden rounded-sm bg-slate-100 max-md:col-span-2" aria-hidden="true">
            <span className={cn("block h-full rounded-sm", row.className ?? "bg-primary")} style={{ width: `${Math.max(row.value > 0 ? 2 : 0, (row.value / max) * 100)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}
