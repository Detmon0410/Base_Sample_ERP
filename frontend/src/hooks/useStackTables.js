import { useEffect } from "react";

import { PHONE_BELOW } from "@/hooks/useNarrow";

/**
 * On a phone every table (the lines inside a sheet, a small summary table) is shown as blocks: one block per row, each cell with its column name in front
 * (docs/specs/f16-mobile.md). The column names are copied from the header cells into `data-label`; the CSS in index.css does the layout.
 * A cell that spans several columns (a sum row, a note) gets no label.
 */
function label(table) {
  for (const row of table.querySelectorAll("tr")) {
    const heads = row.closest("thead") ? null : table.querySelector("thead tr");
    if (!heads) continue;
    const names = [...heads.children].map((cell) => cell.textContent.trim());
    let index = 0;
    for (const cell of row.children) {
      const name = cell.colSpan > 1 ? "" : names[index] ?? "";
      if (name) cell.setAttribute("data-label", name);
      else cell.removeAttribute("data-label");
      index += cell.colSpan || 1;
    }
  }
  table.setAttribute("data-stack", "");
}

export function useStackTables() {
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia(`(max-width: ${PHONE_BELOW - 1}px)`);
    let timer = null;
    const run = () => {
      timer = null;
      for (const table of document.querySelectorAll("table:not([data-stack])")) label(table);
      for (const table of document.querySelectorAll("table[data-stack]")) label(table); // rows that were added since
    };
    const schedule = () => {
      if (timer == null) timer = setTimeout(run, 50);
    };
    const observer = new MutationObserver(schedule);
    const on = () => {
      observer.disconnect();
      if (query.matches) {
        run();
        observer.observe(document.body, { childList: true, subtree: true });
      } else {
        for (const table of document.querySelectorAll("table[data-stack]")) table.removeAttribute("data-stack");
      }
    };
    on();
    query.addEventListener("change", on);
    return () => {
      observer.disconnect();
      query.removeEventListener("change", on);
      if (timer != null) clearTimeout(timer);
    };
  }, []);
}
