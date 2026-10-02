import { Navigate, Outlet, useLocation } from "react-router";

import { useAuth } from "@/hooks/useAuth";

/** Login-only routes: a logged-in user is sent on to where they were headed (or Dashboard). */
export function GuestRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "authenticated") {
    const from = location.state?.from;
    const target = from ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}` : "/";
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}
