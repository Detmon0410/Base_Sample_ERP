import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { NotificationsContext } from "@/lib/notifications-context";
import { getNotifications } from "@/services/notification.service";
import { onRefresh } from "@/utils/masterEvents";
import { ensureSince } from "@/utils/rowSeen";

const POLL_MS = 10000;

/**
 * Keeps the request counters of the menu up to date: it asks again every 10 seconds, when the user comes back to the tab,
 * and at once after any change made on a page (saved, approved, posted ...) or by another tab (see utils/masterEvents).
 */
export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [groups, setGroups] = useState({});

  useEffect(() => {
    if (userId == null) return undefined;
    ensureSince(userId); // what arrives from now on is new for this user
    let cancelled = false;
    const load = () => {
      getNotifications()
        .then((data) => !cancelled && setGroups(data.groups ?? {}))
        .catch(() => undefined); // no counters rather than an error: the menu works without them
    };
    load();
    const timer = setInterval(load, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    const stopRefresh = onRefresh(load);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
      stopRefresh();
    };
  }, [userId]);

  const value = useMemo(() => ({ groups: userId == null ? {} : groups }), [groups, userId]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
