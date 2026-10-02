import { HardHatIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { findActive } from "@/config/navigation";

/** Placeholder for pages that are in the plan but not built yet (keeps the whole menu usable). */
export function UnderConstructionPage() {
  const { t } = useTranslation("nav");
  const { pathname } = useLocation();
  const match = findActive(pathname);
  const rest = match ? pathname.slice(match.item.to.length).split("/").filter(Boolean) : [];
  const suffix = rest.length ? ` · ${rest[0] === "new" ? t("breadcrumb.new") : t("breadcrumb.detail")}` : "";

  return (
    <>
      <PageHeader title={`${match ? t(match.item.labelKey) : ""}${suffix}`} />
      <Card className="max-w-2xl">
        <CardContent className="flex items-start gap-5">
          <div
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-primary"
          >
            <HardHatIcon className="size-7" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t("underConstruction.title")}</h2>
            <p className="mt-1 text-muted-foreground">{t("underConstruction.description")}</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
