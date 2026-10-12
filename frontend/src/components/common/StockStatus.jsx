import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/common/StatusBadge";

const TONES = { Normal: "good", Low: "warn", Out: "bad" };

/**
 * The stock status of a material (Normal / Low / Out, from its minimum level; see services/mock/stockStatus.js and
 * docs/specs/s4-stock-group.md). A material without a minimum level has no status and shows a dash.
 */
export function StockStatus({ status }) {
  const { t } = useTranslation("master");
  if (!status) return <span className="text-muted-foreground">-</span>;
  return <StatusBadge tone={TONES[status]}>{t(`stock.status.${status}`)}</StatusBadge>;
}
