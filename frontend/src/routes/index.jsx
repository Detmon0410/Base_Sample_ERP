import { useTranslation } from "react-i18next";
import { Route, Routes } from "react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MainLayout } from "@/layouts/MainLayout";
import { ForbiddenPage } from "@/pages/system/ForbiddenPage";
import { NotFoundPage } from "@/pages/system/NotFoundPage";

// Placeholder until the Dashboard page (D1) is built.
function HomePlaceholder() {
  const { t } = useTranslation("nav");
  return <PageHeader title={t("dashboard")} />;
}

/**
 * Route table. F1 adds /login inside <AuthLayout> and wraps <MainLayout>
 * in a ProtectedRoute; module routes are added as their pages are built.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>{/* /login (A1) — F1 */}</Route>

      <Route element={<MainLayout />}>
        <Route index element={<HomePlaceholder />} />
        <Route path="403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
