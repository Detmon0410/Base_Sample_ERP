import { ArrowLeftIcon, BanIcon, CogIcon, FileTextIcon, FlagIcon, PackageIcon, TagIcon, TruckIcon, WarehouseIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { CARD_CLASS, SheetSection } from "@/components/common/SheetSection";
import { SerialStatusBadge } from "@/components/factory/SerialStatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { serialService } from "@/services/serial.service";
import { formatDateTime, formatNumber } from "@/utils/format";

// The icon and the colour of the marker of each kind of event. The words say the same, colour is only a help.
const MARKERS = {
  generated: { icon: TagIcon, className: "bg-slate-600" },
  materials: { icon: PackageIcon, className: "bg-sky-600" },
  step: { icon: CogIcon, className: "bg-amber-600" },
  finished: { icon: FlagIcon, className: "bg-emerald-600" },
  transferred: { icon: WarehouseIcon, className: "bg-teal-600" },
  delivered: { icon: TruckIcon, className: "bg-emerald-700" },
  invoiced: { icon: FileTextIcon, className: "bg-violet-600" },
  void: { icon: BanIcon, className: "bg-red-600" },
};

/** A document of an event: a link to its page, with its number. */
function DocLink({ doc }) {
  if (!doc?.number) return null;
  return doc.to ? (
    <Link to={doc.to} className="font-semibold text-primary underline-offset-2 hover:underline">
      {doc.number}
    </Link>
  ) : (
    <span className="font-semibold">{doc.number}</span>
  );
}

function Detail({ event }) {
  const { t, i18n } = useTranslation("trace");
  const language = i18n.language;
  switch (event.type) {
    case "generated":
      return <p className="m-0">{t("event.generatedBy")} <DocLink doc={event.ref} /></p>;
    case "materials":
      return event.materials.length === 0 ? null : (
        <table className="mt-1 w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 pr-3 font-semibold">{t("event.material")}</th>
              <th className="py-1 pr-3 text-right font-semibold">{t("event.perUnit")}</th>
              <th className="py-1 font-semibold">{t("event.lots")}</th>
            </tr>
          </thead>
          <tbody>
            {event.materials.map((material) => (
              <tr key={material.code} className="border-t border-slate-200/70 align-top">
                <td className="py-1.5 pr-3">{material.code} · {material.name}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums">{formatNumber(material.qtyPerUnit, language)} {material.uom}</td>
                <td className="py-1.5">
                  {material.lots.length === 0
                    ? <span className="text-muted-foreground">—</span>
                    : material.lots.map((lot) => (
                        <p key={`${lot.lot}-${lot.receiptId}`} className="m-0">
                          <span className="font-semibold">{lot.lot}</span>
                          <span className="text-muted-foreground"> · </span>
                          <Link to={`/purchase/receipts/${lot.receiptId}`} className="text-primary underline-offset-2 hover:underline">{lot.receiptNumber}</Link>
                          {lot.supplier ? <span className="text-muted-foreground"> · {lot.supplier}</span> : null}
                        </p>
                      ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "step":
      return (
        <p className="m-0">
          {event.step.machine ?? t("event.noMachine")} · {t("event.qtyDone", { done: event.step.qtyDone ?? 0, defect: event.step.qtyDefect ?? 0 })}
          {event.step.startAt ? ` · ${t("event.from")} ${formatDateTime(event.step.startAt, language)}` : ""}
        </p>
      );
    case "finished":
    case "void":
      return <p className="m-0"><DocLink doc={event.ref} /></p>;
    case "transferred":
      return <p className="m-0"><DocLink doc={event.ref} />{event.warehouse ? ` · ${event.warehouse}` : ""}</p>;
    case "delivered":
      return (
        <p className="m-0">
          <DocLink doc={event.ref} />
          {event.customer ? ` · ${event.customer}` : ""}
          {event.saleOrder ? ` · ${event.saleOrder}` : ""}
        </p>
      );
    case "invoiced":
      return <p className="m-0"><DocLink doc={event.ref} /></p>;
    default:
      return null;
  }
}

function eventTitle(t, event) {
  if (event.type === "step") return t("event.step", { no: event.step.stepNo, name: event.step.processName });
  return t(`event.${event.type}`);
}

/** R1 — /trace/:sn. The unit and its whole life, one event after the other. */
export function TraceUnitPage() {
  const { t, i18n } = useTranslation(["trace", "nav"]);
  const { sn } = useParams();
  const { search } = useLocation();
  const [state, setState] = useState({ sn: null, unit: null, error: null });

  useEffect(() => {
    let cancelled = false;
    serialService
      .get(sn)
      .then((unit) => !cancelled && setState({ sn, unit, error: null }))
      .catch((error) => !cancelled && setState({ sn, unit: null, error: error?.status === 404 ? "notFound" : "error" }));
    return () => {
      cancelled = true;
    };
  }, [sn]);

  const loading = state.sn !== sn;
  const { unit, error } = state;

  return (
    <>
      <PageHeader title={t("nav:items.productTrace")} />
      <Button asChild variant="ghost" className="mb-3 -ml-2 h-10">
        <Link to={`/trace${search}`}>
          <ArrowLeftIcon aria-hidden="true" /> {t("trace:back")}
        </Link>
      </Button>

      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : error ? (
        <div role="alert" className={cn("flex flex-col items-start gap-3 p-6", CARD_CLASS)}>
          <p className="m-0 text-lg font-semibold">{t(error === "notFound" ? "trace:notFound" : "trace:loadError", { sn })}</p>
          {error === "notFound" ? <p className="m-0 text-muted-foreground">{t("trace:notFoundHint")}</p> : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <section className={cn("flex flex-col gap-4 p-5", CARD_CLASS)}>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="m-0 text-2xl font-bold tabular-nums">{unit.sn}</h2>
              <SerialStatusBadge status={unit.status} />
            </div>
            <dl className="m-0 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Fact label={t("trace:columns.product")}>{unit.productCode} · {unit.productName}</Fact>
              <Fact label={t("trace:columns.workOrder")}>{unit.workOrderNumber}</Fact>
              <Fact label={t("trace:saleOrder")}>{unit.saleOrderNumber ?? "—"}</Fact>
              <Fact label={t("trace:columns.customer")}>{unit.customerName ? `${unit.customerName} · ${unit.deliveryNote?.number}` : "—"}</Fact>
            </dl>
          </section>

          <SheetSection title={t("trace:timeline")} icon={FlagIcon}>
            <ol className="m-0 list-none p-0">
              {unit.timeline.map((event, index) => {
                const { icon: Icon, className } = MARKERS[event.type] ?? MARKERS.generated;
                const last = index === unit.timeline.length - 1;
                return (
                  <li key={`${event.type}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
                    {last ? null : <span aria-hidden="true" className="absolute top-9 bottom-0 left-4 w-0.5 -translate-x-1/2 bg-slate-200" />}
                    <span aria-hidden="true" className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-white", className)}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 text-base font-semibold">{eventTitle(t, event)}</p>
                      <p className="m-0 text-sm text-muted-foreground">
                        {formatDateTime(event.at, i18n.language)}
                        {event.by ? ` · ${t("trace:by", { name: event.by })}` : ""}
                      </p>
                      <div className="mt-1 text-base">
                        <Detail event={event} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </SheetSection>
        </div>
      )}
    </>
  );
}

function Fact({ label, children }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd className="m-0">{children}</dd>
    </div>
  );
}
