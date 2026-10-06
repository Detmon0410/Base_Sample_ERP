import { CheckIcon, HistoryIcon, LinkIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { LinkedDocuments } from "@/components/common/LinkedDocuments";
import { SheetSection } from "@/components/common/SheetSection";
import { Stepper, StepperDescription, StepperIndicator, StepperItem, StepperNav, StepperSeparator, StepperTitle } from "@/components/reui/stepper";
import { HISTORY_TONES } from "@/config/sale";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/format";

import { DocumentStatusBadge } from "./DocumentStatusBadge";

// Marker of a history step: a green check, or a red cross when the step rejected or cancelled the document.
const MARKER = {
  success: { icon: CheckIcon, className: "data-[state=completed]:bg-success" },
  danger: { icon: XIcon, className: "data-[state=completed]:bg-destructive" },
  neutral: { icon: CheckIcon, className: "data-[state=completed]:bg-success" },
};

/**
 * Status history card: a vertical stepper, newest step on top and the first step at the bottom. Every step is
 * already done, so each one is a completed marker joined to the next by a line. `history` comes from the server.
 */
export function HistoryCard({ history }) {
  const { t, i18n } = useTranslation(["sale", "common"]);

  return (
    <SheetSection title={t("cards.history")} icon={HistoryIcon}>
      {history.length === 0 ? (
        <p className="text-muted-foreground">{t("history.none")}</p>
      ) : (
        // value is past the last step, so every step reads as completed
        <Stepper orientation="vertical" value={history.length + 1} role="list" className="w-full">
          <StepperNav>
            {history.map((entry, index) => {
              const { icon: Icon, className } = MARKER[HISTORY_TONES[entry.action] ?? "neutral"] ?? MARKER.neutral;
              return (
                <StepperItem key={entry.id} step={index + 1} role="listitem" className="relative items-start not-last:flex-1">
                  <div className="flex items-start gap-3 pb-6 group-last/step:pb-0">
                    <StepperIndicator className={cn("size-7 text-white", className)}>
                      <Icon className="size-4" aria-hidden="true" />
                    </StepperIndicator>
                    <div className="min-w-0 text-left">
                      <StepperTitle className="text-base leading-snug font-semibold text-slate-900">{t(`history.${entry.action}`)}</StepperTitle>
                      <StepperDescription className="mt-0.5 text-sm">
                        {entry.actor ? `${t("common:detail.by", { name: entry.actor })} · ` : ""}
                        {formatDateTime(entry.at, i18n.language)}
                      </StepperDescription>
                      {entry.note ? <p className="mt-1.5 rounded-lg bg-muted px-3 py-2 text-sm break-words">{entry.note}</p> : null}
                    </div>
                  </div>
                  {index < history.length - 1 ? (
                    <StepperSeparator className="absolute inset-y-0 top-8 left-3.5 -order-1 m-0 -translate-x-1/2 bg-success group-data-[orientation=vertical]/stepper-nav:h-[calc(100%-2rem)]" />
                  ) : null}
                </StepperItem>
              );
            })}
          </StepperNav>
        </Stepper>
      )}
    </SheetSection>
  );
}

/**
 * Linked documents card. `links` from the server: { id, type, number, status?, to? }. A type without a page yet
 * (work order, invoice) is shown as plain text, never as a dead link.
 */
export function LinksCard({ links }) {
  const { t } = useTranslation("sale");
  const items = links.map((link) => ({
    id: link.id,
    type: t(`links.${link.type}`),
    number: link.number ?? t("links.notRecorded"),
    to: link.number ? link.to : undefined,
    status: link.status ? <DocumentStatusBadge status={link.status} /> : undefined,
  }));
  return (
    <SheetSection title={t("cards.links")} icon={LinkIcon}>
      <LinkedDocuments items={items} bare />
    </SheetSection>
  );
}
