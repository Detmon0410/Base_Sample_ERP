import { useContext } from "react";

import { NotificationsContext } from "@/lib/notifications-context";

/** { groups }: the request counters of the menu (see lib/notifications-context.js). */
export function useNotifications() {
  return useContext(NotificationsContext);
}
