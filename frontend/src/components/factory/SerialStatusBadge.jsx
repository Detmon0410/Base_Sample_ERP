import { BanIcon, TagIcon, TruckIcon, WarehouseIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/common/StatusBadge";

// Status of one unit (docs/specs/f12-requirements-2.md): text and icon, never colour alone.
const LOOK = {
  made: { tone: "neutral", icon: TagIcon },
  in_stock: { tone: "neutral", icon: WarehouseIcon, className: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  delivered: { tone: "success", icon: TruckIcon },
  void: { tone: "danger", icon: BanIcon },
};

export function SerialStatusBadge({ status }) {
  const { t } = useTranslation("factory");
  const look = LOOK[status] ?? LOOK.made;
  return (
    <StatusBadge tone={look.tone} icon={look.icon} className={look.className}>
      {t(`serials.status.${status}`)}
    </StatusBadge>
  );
}
