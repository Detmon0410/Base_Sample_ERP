import { Navigate, Outlet } from "react-router";

import { useAuth } from "@/hooks/useAuth";
import { canUse } from "@/utils/permissions";

/**
 * Wrap a group of routes with the same rule (see `canUse` in utils/permissions.js):
 *   <Route element={<RequirePermission roles={["Admin"]} />}> ... </Route>
 * A user without access is sent to the 403 page.
 */
export function RequirePermission({ roles }) {
  const { user } = useAuth();

  if (!canUse(user, roles)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
