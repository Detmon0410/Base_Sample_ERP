import { useAuth } from "@/hooks/useAuth";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";

import { TodayPage } from "./TodayPage";

/** The first page: a Factory Worker starts from the work of today; the Admin and a Sale Worker from the numbers of the Dashboard. */
export function HomePage() {
  const { user } = useAuth();
  return user?.role === "Worker" && user.department === "Factory" ? <TodayPage /> : <DashboardPage />;
}
