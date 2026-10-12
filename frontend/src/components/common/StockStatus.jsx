import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

// Each class is written out in full so that Tailwind finds it. The words always say the status; the colour only helps.
const STYLES = {
  Normal: "border-border text-foreground",
  Low: "border-warning text-warning",
  Out: "border-destructive text-destructive",
};

/**
 * The stock status of a material (Normal / Low / Out, from its minimum level; see services/mock/stockStatus.js and
 * docs/specs/s4-stock-group.md). A material without a minimum level has no status and shows a dash.
 */
export function StockStatus({ status }) {
  const { t } = useTranslation("master");
  if (!status) return <span className="text-muted-foreground">-</span>;
  return <span className={cn("inline-block border px-2 py-0.5 text-sm font-bold", STYLES[status])}>{t(`stock.status.${status}`)}</span>;
}
