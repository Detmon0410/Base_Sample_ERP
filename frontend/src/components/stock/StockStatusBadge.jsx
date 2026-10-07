import { BanIcon, CircleCheckIcon, MinusIcon, PackageCheckIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/common/StatusBadge";

const LOOK = {
  shortage: { tone: "danger", icon: TriangleAlertIcon },
  near_shortage: { tone: "warning", icon: TriangleAlertIcon },
  normal: { tone: "success", icon: CircleCheckIcon },
  not_set: { tone: "neutral", icon: MinusIcon },
  in_stock: { tone: "success", icon: PackageCheckIcon },
  out_of_stock: { tone: "danger", icon: BanIcon },
};

/** Stock status of an item as text + icon (the colour is never the only signal): shortage / near shortage / normal for a material, in stock / out of stock for a product. */
export function StockStatusBadge({ status }) {
  const { t } = useTranslation("stock");
  const look = LOOK[status] ?? { tone: "neutral" };
  return (
    <StatusBadge tone={look.tone} icon={look.icon}>
      {t(`status.${status}`)}
    </StatusBadge>
  );
}
