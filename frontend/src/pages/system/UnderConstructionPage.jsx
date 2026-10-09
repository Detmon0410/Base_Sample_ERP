import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { findActive } from "@/config/navigation";

/** Placeholder for pages that are in the plan but not built yet (keeps the whole menu usable). */
export function UnderConstructionPage() {
  const { t } = useTranslation("nav");
  const { pathname } = useLocation();
  const item = findActive(pathname);

  return (
    <>
      <PageHeader title={item ? t(item.labelKey) : ""} />
      <div className="max-w-2xl border border-slate-300 bg-card p-5">
        <h2 className="text-xl font-bold">{t("underConstruction.title")}</h2>
        <p className="mt-1 text-muted-foreground">{t("underConstruction.description")}</p>
      </div>
    </>
  );
}
