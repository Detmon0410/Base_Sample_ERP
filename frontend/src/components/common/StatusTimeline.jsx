import { CheckIcon, CircleDotIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/format";

const MARKERS = {
  success: { icon: CheckIcon, className: "border-success bg-success/10 text-success" },
  danger: { icon: XIcon, className: "border-destructive bg-destructive/10 text-destructive" },
  neutral: { icon: CircleDotIcon, className: "border-border bg-muted text-foreground" },
};

/**
 * Status history, newest first. `events`: [{ id, label, actor, at, note, tone }]
 * Each marker has an icon as well as a color, so the outcome never depends on color alone.
 */
export function StatusTimeline({ title, events, bare = false }) {
  const { t, i18n } = useTranslation();

  const content = (
    <>
      {events.length === 0 ? (
        <p className="text-muted-foreground">{t("detail.noHistory")}</p>
      ) : (
        <ol className="flex flex-col">
          {events.map((event, index) => {
            const { icon: Icon, className } = MARKERS[event.tone] ?? MARKERS.neutral;
            const isLast = index === events.length - 1;
            return (
              <li key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border", className)}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  {isLast ? null : <span className="my-1 w-px flex-1 bg-border" aria-hidden="true" />}
                </div>
                <div className={cn("min-w-0 flex-1", isLast ? "" : "pb-5")}>
                  <p className="font-semibold">{event.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {event.actor ? `${t("detail.by", { name: event.actor })} · ` : ""}
                    {formatDateTime(event.at, i18n.language)}
                  </p>
                  {event.note ? <p className="mt-1 rounded-lg bg-muted px-3 py-2 text-sm break-words">{event.note}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );

  // bare: only the list, for a parent that draws the card (SheetSection in a detail sheet)
  if (bare) return content;
  return (
    <section className="rounded-xl border bg-card p-6" aria-labelledby="status-history-title">
      <h3 id="status-history-title" className="mb-4 text-lg font-bold">
        {title ?? t("detail.history")}
      </h3>
      {content}
    </section>
  );
}
