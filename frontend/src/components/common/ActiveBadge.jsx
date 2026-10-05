import { CircleMinusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatusBadge } from "@/components/common/StatusBadge";

/** Active / Inactive chip used by every master data list and form. */
export function ActiveBadge({ status }) {
  const { t } = useTranslation("master");
  return status === "active" ? (
    <StatusBadge tone="success">{t("common.active")}</StatusBadge>
  ) : (
    <StatusBadge tone="neutral" icon={CircleMinusIcon}>
      {t("common.inactive")}
    </StatusBadge>
  );
}
