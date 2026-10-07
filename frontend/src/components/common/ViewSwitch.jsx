import { ChartGanttIcon, Columns3Icon, LayoutGridIcon, TableIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const ICONS = { kanban: Columns3Icon, timeline: ChartGanttIcon, cards: LayoutGridIcon, table: TableIcon };

/**
 * The switch between the ways a list can be shown ("Kanban | Cards | Table"). Icon buttons joined in one box, the
 * selected one filled; each has a text for screen readers and a title.
 *   views    the keys to offer, e.g. ["kanban", "cards", "table"]      value  the selected key
 *   onChange (key) => void                                             labels { kanban, timeline, cards, table, group }
 */
export function ViewSwitch({ views = ["cards", "table"], value, onChange, labels }) {
  return (
    <div role="group" aria-label={labels.group} className="flex h-10 shrink-0 overflow-hidden rounded-lg border border-input bg-card">
      {views.map((key, index) => {
        const Icon = ICONS[key];
        return (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            aria-label={labels[key]}
            title={labels[key]}
            onClick={() => onChange(key)}
            className={cn(
              "grid w-11 place-items-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              value === key ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted",
              index > 0 && "border-l border-input",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
