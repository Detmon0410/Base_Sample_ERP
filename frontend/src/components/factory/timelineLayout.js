import { addDaysIso } from "@/utils/dates";

// Pure helpers of the work order timeline: dates become day columns. Dates are "YYYY-MM-DD" strings.

export const PAGE_DAYS = { week: 14, month: 42 };

const MS_PER_DAY = 86400000;
const utc = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from, to) {
  return Math.round((utc(to) - utc(from)) / MS_PER_DAY);
}

/** The first day of the page that opens when the scale is chosen or "Today" is pressed: today is a third from the left. */
export function pageStart(today, days) {
  return addDaysIso(today, -Math.floor(days / 3));
}

/** The days of a page: [{ iso, day, month, weekend, today }]. */
export function pageDays(start, days, today) {
  return Array.from({ length: days }, (_, index) => {
    const iso = addDaysIso(start, index);
    const date = new Date(`${iso}T00:00:00`);
    const weekday = date.getDay();
    return { iso, day: date.getDate(), month: date.getMonth(), year: date.getFullYear(), weekend: weekday === 0 || weekday === 6, today: iso === today };
  });
}

/**
 * Where a work order's plan lies on a page. Returns null without plan dates; otherwise
 * { from, to } (0-based columns, both inside the page, `to` included), `before` / `after` when the plan goes past the
 * page on that side, or { outside: "before" | "after" } when the whole plan is off the page.
 */
export function planSpan(wo, start, days) {
  if (!wo.planStart || !wo.planFinish) return null;
  const from = daysBetween(start, wo.planStart);
  const to = daysBetween(start, wo.planFinish);
  if (to < 0) return { outside: "before" };
  if (from > days - 1) return { outside: "after" };
  return { from: Math.max(from, 0), to: Math.min(to, days - 1), before: from < 0, after: to > days - 1 };
}

/** The columns between the planned finish and today of a late work order (the part that runs past its plan), or null. */
export function lateSpan(wo, start, days, today) {
  if (!wo.progress?.late || !wo.planFinish) return null;
  const from = daysBetween(start, wo.planFinish) + 1;
  const to = daysBetween(start, today);
  if (to < 0 || from > days - 1 || to < from) return null;
  return { from: Math.max(from, 0), to: Math.min(to, days - 1) };
}

/** Share of the bar that is done: steps done / steps total, 0 to 100. */
export function donePercent(wo) {
  const { stepsDone = 0, stepsTotal = 0 } = wo.progress ?? {};
  return stepsTotal > 0 ? Math.round((stepsDone / stepsTotal) * 100) : 0;
}

/** The rows in the order of the timeline: plan start ascending (then number), work orders without a plan last. */
export function sortRows(items) {
  return [...items].sort((a, b) => {
    const aNone = !a.planStart || !a.planFinish;
    const bNone = !b.planStart || !b.planFinish;
    if (aNone !== bNone) return aNone ? 1 : -1;
    return String(a.planStart ?? "").localeCompare(String(b.planStart ?? "")) || String(a.number).localeCompare(String(b.number));
  });
}
