import { useTranslation } from "react-i18next";
import { Navigate, Outlet, useLocation } from "react-router";

import { useAuth } from "@/hooks/useAuth";

/** Everything below this route requires a logged-in user. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center text-lg">
        {t("loading")}
      </div>
    );
  }

  if (status === "unauthenticated") {
    // Remember where the user was going so login can send them back there.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
