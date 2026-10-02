import { useTranslation } from "react-i18next";

import { MessagePage } from "@/components/common/MessagePage";

export function ForbiddenPage() {
  const { t } = useTranslation();
  return (
    <MessagePage
      code="403"
      title={t("pages.forbidden.title")}
      description={t("pages.forbidden.description")}
    />
  );
}
