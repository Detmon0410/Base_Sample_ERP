import { HistoryIcon, LinkIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { LinkedDocuments } from "@/components/common/LinkedDocuments";
import { SheetSection } from "@/components/common/SheetSection";
import { StatusTimeline } from "@/components/common/StatusTimeline";
import { HISTORY_TONES } from "@/config/sale";

import { DocumentStatusBadge } from "./DocumentStatusBadge";

/** Status history card: one line per step (who, when, note), newest first. `history` comes from the server. */
export function HistoryCard({ history }) {
  const { t } = useTranslation("sale");
  const events = history.map((entry) => ({
    id: entry.id,
    label: t(`history.${entry.action}`),
    actor: entry.actor,
    at: entry.at,
    note: entry.note,
    tone: HISTORY_TONES[entry.action] ?? "neutral",
  }));
  return (
    <SheetSection title={t("cards.history")} icon={HistoryIcon}>
      <StatusTimeline events={events} bare />
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
