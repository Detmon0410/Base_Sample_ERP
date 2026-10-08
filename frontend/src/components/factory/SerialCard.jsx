import { TagsIcon, WandSparklesIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { InfoTip } from "@/components/common/InfoTip";
import { SheetSection } from "@/components/common/SheetSection";
import { SerialStatusBadge } from "@/components/factory/SerialStatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { canWork } from "@/config/factory";
import { workOrderSerials } from "@/services/serial.service";

/** Where a unit is now, in words. */
function Where({ unit }) {
  const { t } = useTranslation("factory");
  if (unit.status === "delivered") return t("serials.where.delivered", { note: unit.deliveryNote?.number, customer: unit.customerName });
  if (unit.status === "in_stock") return t("serials.where.in_stock", { transfer: unit.transferNumber }) + (unit.deliveryNote ? ` · ${t("serials.where.onNote", { note: unit.deliveryNote.number })}` : "");
  return t(`serials.where.${unit.status}`);
}

/**
 * "Product and serial numbers" of a Work Order: the product, how many units have a number, the button that makes them
 * (only a person presses it, never the system) and the list of the units with their status, where each one is, and its tag.
 */
export function SerialCard({ workOrder, user }) {
  const { t } = useTranslation("factory");
  const [state, setState] = useState({ items: [], meta: null });
  const [version, setVersion] = useState(0); // goes up when serial numbers were made: the list is read again
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    workOrderSerials
      .list(workOrder.id)
      .then(({ items, meta }) => !cancelled && setState({ items, meta }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [workOrder.id, workOrder.status, version]);

  const { items, meta } = state;
  const left = meta?.left ?? 0;
  const product = `${workOrder.productCode} · ${workOrder.productName}`;
  const mayMake = Boolean(meta?.canMake) && canWork(user) && left > 0;

  const make = async () => {
    setBusy(true);
    try {
      // one press, one unit, one number
      const made = await workOrderSerials.make(workOrder.id, 1);
      toast.success(t("serials.generated", { count: made.length }));
      setVersion((value) => value + 1);
    } catch (error) {
      const tooMany = error?.details?.some((item) => item.message === "TOO_MANY");
      toast.error(tooMany ? t("serials.tooMany") : t(`errors.${error?.code}`, { defaultValue: t("errors.UNKNOWN") }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SheetSection title={t("serials.title")} icon={TagsIcon}>
      {meta && !meta.canMake && items.length === 0 ? <p className="mt-4 text-muted-foreground">{t("serials.notYet")}</p> : null}

      {/* one row per unit of the Work Order: the numbers made so far, then the empty rows; the first empty row has the button
          that makes its number (one press, one unit, one number: the button turns into the S/N) */}
      {meta && (items.length > 0 || meta.canMake) ? (
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-right">{t("serials.columns.no")}</TableHead>
                <TableHead>{t("serials.columns.product")}</TableHead>
                <TableHead>{t("serials.columns.status")}</TableHead>
                <TableHead>{t("serials.columns.where")}</TableHead>
                <TableHead>
                  <span className="inline-flex items-center gap-1">
                    {t("serials.columns.sn")}
                    <InfoTip label={t("serials.hintLabel")}>{t("serials.manualHint")}</InfoTip>
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((unit, index) => (
                <TableRow key={unit.sn}>
                  <TableCell className="text-right text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="whitespace-normal">{product}</TableCell>
                  <TableCell>
                    <SerialStatusBadge status={unit.status} />
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <Where unit={unit} />
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    <Link to={`/trace/${encodeURIComponent(unit.sn)}`} className="text-primary underline-offset-2 hover:underline">
                      {unit.sn}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {Array.from({ length: meta.canMake ? left : 0 }, (_, slot) => (
                <TableRow key={`empty-${slot}`}>
                  <TableCell className="text-right text-muted-foreground">{items.length + slot + 1}</TableCell>
                  <TableCell className="whitespace-normal">{product}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell>
                    {slot === 0 && mayMake ? (
                      <Button type="button" size="sm" className="h-9" disabled={busy} onClick={make}>
                        <WandSparklesIcon aria-hidden="true" /> {t("serials.generate")}
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </SheetSection>
  );
}
