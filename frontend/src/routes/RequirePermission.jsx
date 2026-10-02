import { Navigate, Outlet } from "react-router";

import { useAuth } from "@/hooks/useAuth";
import { canAccessDepartment } from "@/utils/permissions";

/**
 * Wrap a group of routes to limit them to one department (Admin always passes):
 *   <Route element={<RequirePermission department="Sale" />}> ... </Route>
 * Not applied to any route yet; module routes start using it from F2 onward.
 */
export function RequirePermission({ department }) {
  const { user } = useAuth();

  if (!canAccessDepartment(user, department)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
