import { useTranslation } from "react-i18next";

import { MessagePage } from "@/components/common/MessagePage";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <MessagePage
      code="404"
      title={t("pages.notFound.title")}
      description={t("pages.notFound.description")}
    />
  );
}
