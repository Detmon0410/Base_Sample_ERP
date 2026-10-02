import { Route, Routes } from "react-router";

import { NAV_GROUPS } from "@/config/navigation";
import { AuthLayout } from "@/layouts/AuthLayout";
import { MainLayout } from "@/layouts/MainLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { ForbiddenPage } from "@/pages/system/ForbiddenPage";
import { NotFoundPage } from "@/pages/system/NotFoundPage";
import { UnderConstructionPage } from "@/pages/system/UnderConstructionPage";

import { GuestRoute } from "./GuestRoute";
import { ProtectedRoute } from "./ProtectedRoute";
import { RequirePermission } from "./RequirePermission";

/**
 * Route table. Every menu entry in config/navigation.js gets a route (and a wildcard
 * for its /new and /:id pages) guarded by the group's access rule. Until a page is built
 * it renders the "not built yet" placeholder; replace the element when the page exists.
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
          <Route index element={<DashboardPage />} />
          <Route path="403" element={<ForbiddenPage />} />

          {NAV_GROUPS.map((group) => (
            <Route key={group.key} element={<RequirePermission access={group.access} />}>
              {group.items.map((item) => (
                <Route
                  key={item.key}
                  path={`${item.to.slice(1)}/*`}
                  element={<UnderConstructionPage />}
                />
              ))}
            </Route>
          ))}

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
