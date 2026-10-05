import {
  BanIcon,
  ClockIcon,
  FactoryIcon,
  LockIcon,
  PackageCheckIcon,
  PencilIcon,
  SendIcon,
  ThumbsUpIcon,
  TruckIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/common/StatusBadge";
import { STATUS_TONES } from "@/config/sale";

// Every status has an icon, so its meaning never depends on color alone.
const ICONS = {
  draft: PencilIcon,
  sent: SendIcon,
  expired: ClockIcon,
  confirmed: ThumbsUpIcon,
  in_production: FactoryIcon,
  ready_to_deliver: PackageCheckIcon,
  delivered: TruckIcon,
  closed: LockIcon,
  cancelled: BanIcon,
};

/** Status of a Sale document as text + icon. `waiting` adds the "waiting for approval" state of a draft order. */
export function DocumentStatusBadge({ status, waiting = false }) {
  const { t } = useTranslation("sale");
  if (waiting) {
    return (
      <StatusBadge tone="warning" icon={ClockIcon}>
        {t("status.waiting")}
      </StatusBadge>
    );
  }
  return (
    <StatusBadge tone={STATUS_TONES[status] ?? "neutral"} icon={ICONS[status]}>
      {t(`status.${status}`)}
    </StatusBadge>
  );
}
