import { Navigate, Outlet } from "react-router";

import { useAuth } from "@/hooks/useAuth";
import { can } from "@/utils/permissions";

/**
 * Wrap a group of routes with the same rule (an action of `ACTIONS` in utils/permissions.js):
 *   <Route element={<RequirePermission action="invoices.use" />}> ... </Route>
 * A user without access is sent to the 403 page.
 */
export function RequirePermission({ action }) {
  const { user } = useAuth();

  if (!can(user, action)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
