import { InboxIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { PANEL_CLASS } from "@/components/common/SheetSection";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/format";
import { onRefresh } from "@/utils/masterEvents";

/**
 * "Waiting for an invoice" / "Waiting for a bill": what has no document yet and is the work the red number of the menu counts
 * (delivered delivery notes with no invoice, posted goods receipts with no bill). One button per row opens a new document made
 * from it. Nothing is drawn when nothing waits. It reloads when something is saved or the Refresh button is pressed.
 *   namespace  "invoices" | "bills" (texts accounting:<namespace>.waiting.*)       service  has sources()
 */
export function WaitingSourcesPanel({ namespace, service, newPath, canCreate }) {
  const { t, i18n } = useTranslation("accounting");
  const navigate = useNavigate();
  const [state, setState] = useState({ rows: [] });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => onRefresh(() => setReloadKey((key) => key + 1)), []);
  useEffect(() => {
    let cancelled = false;
    service
      .sources()
      .then((rows) => !cancelled && setState({ rows }))
      .catch(() => !cancelled && setState({ rows: [] })); // the list below shows its own error
    return () => {
      cancelled = true;
    };
  }, [service, reloadKey]);

  const { rows } = state;
  if (rows.length === 0) return null;

  return (
    <section className={`${PANEL_CLASS} mb-4 p-4`} aria-label={t(`${namespace}.waiting.title`)}>
      <div className="flex items-center gap-3">
        <InboxIcon className="size-6 shrink-0 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-bold">{t(`${namespace}.waiting.title`)}</h2>
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-bold text-amber-800">{rows.length}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t(`${namespace}.waiting.hint`)}</p>
      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[40rem] text-[15px] text-[#666]">
          <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
            <tr className="text-left text-sm font-semibold">
              <th className="h-10 px-3">{t(`${namespace}.waiting.columns.source`)}</th>
              <th className="h-10 px-3">{t("columns.date")}</th>
              <th className="h-10 px-3">{t(`${namespace}.waiting.columns.party`)}</th>
              <th className="h-10 px-3">{t(`${namespace}.waiting.columns.ref`)}</th>
              <th className="h-10 w-48 px-3">
                <span className="sr-only">{t(`${namespace}.waiting.create`)}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-semibold">{row.number}</td>
                <td className="px-3 py-2">{formatDate(row.date, i18n.language)}</td>
                <td className="px-3 py-2">{row.partyName}</td>
                <td className="px-3 py-2">{row.ref || "—"}</td>
                <td className="px-3 py-1.5 text-right">
                  {canCreate ? (
                    <Button type="button" size="sm" className="h-9" onClick={() => navigate(`${newPath}/new`, { state: { sourceId: row.id } })}>
                      <PlusIcon aria-hidden="true" /> {t(`${namespace}.waiting.create`)}
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
