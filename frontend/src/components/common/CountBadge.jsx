import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/**
 * Two signs of the menu: `variant="text"` (an entry) is the number of documents that wait, in red; `variant="dot"` (a group) is
 * only a red dot, shown when something in the group waits. Nothing is drawn for 0. `hint` says what the number counts (on hover).
 */
export function CountBadge({ count, variant = "text", hint, className }) {
  const { t } = useTranslation("nav");
  if (!count || count < 1) return null;
  const label = t("requests.waiting", { count });
  if (variant === "dot") {
    return <span role="status" aria-label={label} title={label} className={cn("inline-block size-2.5 shrink-0 rounded-full bg-red-600", className)} />;
  }
  return (
    <span role="status" aria-label={label} title={hint ? `${label}: ${hint}` : label} className={cn("shrink-0 text-sm leading-none font-bold text-red-600 tabular-nums", className)}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
