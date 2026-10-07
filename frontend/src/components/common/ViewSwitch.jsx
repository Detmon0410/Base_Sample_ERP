import { LayoutGridIcon, TableIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The "Cards | Table" switch of a list that can be shown both ways. Two icon buttons joined in one box, the
 * selected one filled; each has a text for screen readers and a tooltip-like title.
 *   value    "cards" | "table"       onChange  (value) => void       labels  { cards, table, group }
 */
export function ViewSwitch({ value, onChange, labels }) {
  const options = [
    { key: "cards", icon: LayoutGridIcon, label: labels.cards },
    { key: "table", icon: TableIcon, label: labels.table },
  ];
  return (
    <div role="group" aria-label={labels.group} className="flex h-10 shrink-0 overflow-hidden rounded-lg border border-input bg-card">
      {options.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          aria-label={label}
          title={label}
          onClick={() => onChange(key)}
          className={cn(
            "grid w-11 place-items-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            value === key ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted",
            key === "table" && "border-l border-input",
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
