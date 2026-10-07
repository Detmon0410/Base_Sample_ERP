import {
  BanIcon,
  CalendarCheckIcon,
  FileCheck2Icon,
  PackageOpenIcon,
  CircleCheckBigIcon,
  HourglassIcon,
  CircleCheckIcon,
  ClockIcon,
  CogIcon,
  FactoryIcon,
  LockIcon,
  PackageCheckIcon,
  PencilIcon,
  SendIcon,
  ThumbsUpIcon,
  TruckIcon,
  WarehouseIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/common/StatusBadge";
import { STATUS_COLORS, STATUS_TONES } from "@/config/sale";

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
  scheduled: CalendarCheckIcon,
  in_process: CogIcon,
  finished: CircleCheckIcon,
  transferred: WarehouseIcon,
  pending: HourglassIcon,
  approved: CircleCheckBigIcon,
  partially_received: PackageOpenIcon,
  received: PackageCheckIcon,
  posted: FileCheck2Icon,
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
    <StatusBadge tone={STATUS_TONES[status] ?? "neutral"} icon={ICONS[status]} className={STATUS_COLORS[status]?.badge}>
      {t(`status.${status}`)}
    </StatusBadge>
  );
}
