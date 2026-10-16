import { cn } from "@/lib/utils";

/**
 * A small bar of tabs, each with its word and an optional count. `tabs` is a list of { key, label, count }; `value` is the key that is open.
 * It switches the list under it and does not change the address.
 */
export function TabBar({ tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 border-b border-border">
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-base",
              selected ? "border-primary font-bold text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count != null ? <span className={cn("min-w-6 rounded-full px-1.5 text-center text-sm font-bold tabular-nums", selected ? "bg-[#d9eefa] text-primary" : "bg-[#eceef1]")}>{tab.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
