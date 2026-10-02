import { Navigate, Outlet } from "react-router";

import { useAuth } from "@/hooks/useAuth";
import { canUse } from "@/utils/permissions";

/**
 * Wrap a group of routes with the same access rule (see `canUse` in utils/permissions.js):
 *   <Route element={<RequirePermission access={{ type: "admin" }} />}> ... </Route>
 * A user without access is sent to the 403 page.
 */
export function RequirePermission({ access }) {
  const { user } = useAuth();

  if (!canUse(user, access)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
