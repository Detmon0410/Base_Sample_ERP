import { ClockIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SheetSection } from "@/components/common/SheetSection";
import { formatDateTime } from "@/utils/format";

/** Created / updated times of a saved record. */
export function RecordInfoCard({ record }) {
  const { t, i18n } = useTranslation("master");
  return (
    <SheetSection title={t("common.recordInfo")} icon={ClockIcon}>
      <dl className="grid gap-4 @lg:grid-cols-2">
        <div>
          <dt className="text-sm font-semibold text-muted-foreground">{t("common.createdAt")}</dt>
          <dd>{formatDateTime(record.createdAt, i18n.language)}</dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-muted-foreground">{t("common.updatedAt")}</dt>
          <dd>{formatDateTime(record.updatedAt, i18n.language)}</dd>
        </div>
      </dl>
    </SheetSection>
  );
}
