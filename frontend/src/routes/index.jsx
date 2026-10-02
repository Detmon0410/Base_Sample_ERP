import { useTranslation } from "react-i18next";
import { Route, Routes } from "react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MainLayout } from "@/layouts/MainLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ForbiddenPage } from "@/pages/system/ForbiddenPage";
import { NotFoundPage } from "@/pages/system/NotFoundPage";

import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";

// Placeholder until the Dashboard page (D1) is built.
function HomePlaceholder() {
  const { t } = useTranslation("nav");
  return <PageHeader title={t("dashboard")} />;
}

/**
 * Route table. Module routes are added inside the protected <MainLayout> as their
 * pages are built, wrapped in <RequirePermission department="..."> where needed.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<HomePlaceholder />} />
          <Route path="403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
