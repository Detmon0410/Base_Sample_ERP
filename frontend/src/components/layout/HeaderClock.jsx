import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

const TICK_MS = 15000;

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

/** Date and time (to the minute, from the computer clock) and the connection: a dot and the word Online / Offline. */
export function HeaderClock() {
  const { t, i18n } = useTranslation("nav");
  const now = useNow();
  const online = useOnline();
  const locale = i18n.language?.startsWith("ja") ? "ja-JP" : "en-GB";
  const date = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(now);
  const time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hour12: false }).format(now);

  return (
    <div className="flex items-center gap-3 text-sm text-primary-foreground max-md:gap-1.5">
      <time dateTime={now.toISOString()} className="whitespace-nowrap">
        <span className="max-[991px]:hidden">{date} · </span>
        <span className="font-semibold">{time}</span>
      </time>
      <span className="flex items-center gap-1.5 whitespace-nowrap" role="status">
        <span aria-hidden="true" className={cn("size-2.5 rounded-full", online ? "bg-green-400" : "bg-red-400")} />
        <span className="max-[991px]:sr-only">{t(online ? "clock.online" : "clock.offline")}</span>
      </span>
    </div>
  );
}
