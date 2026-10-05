import { CircleCheckIcon, CircleXIcon, PackageSearchIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SheetSection } from "@/components/common/SheetSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { checkAvailability } from "@/services/sale.service";
import { formatNumber } from "@/utils/format";

/**
 * "Material availability" (aditional_req 1): explodes the BOM of every line and compares with the stock on hand.
 * It is advice only (nothing is blocked) and says so. The result is kept until the lines change, then it is
 * marked as out of date.
 *   lines   [{ productId, qty }] as currently entered (invalid ones are ignored)
 */
export function AvailabilityCard({ lines }) {
  const { t, i18n } = useTranslation("sale");
  const [result, setResult] = useState(null);
  const [checkedFor, setCheckedFor] = useState("");
  const [state, setState] = useState("idle"); // idle | loading | error

  const valid = (lines ?? []).filter((line) => line?.productId && Number.isInteger(line.qty) && line.qty > 0);
  const signature = JSON.stringify(valid.map((line) => [line.productId, line.qty]));
  const stale = result && signature !== checkedFor;

  const check = async () => {
    setState("loading");
    try {
      setResult(await checkAvailability(valid));
      setCheckedFor(signature);
      setState("idle");
    } catch {
      setState("error");
      toast.error(t("availability.error"));
    }
  };

  const number = (value) => formatNumber(value, i18n.language);

  return (
    <SheetSection title={t("availability.title")} icon={PackageSearchIcon}>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={check} disabled={valid.length === 0 || state === "loading"}>
          {state === "loading" ? t("availability.checking") : t("availability.check")}
        </Button>
        {valid.length === 0 ? <p className="text-muted-foreground">{t("availability.addLines")}</p> : null}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{t("availability.note")}</p>

      {state === "loading" && !result ? <Skeleton className="mt-4 h-20 w-full" aria-busy="true" /> : null}
      {state === "error" ? (
        <p role="alert" className="mt-4 flex items-center gap-2 text-destructive">
          <TriangleAlertIcon className="size-5" aria-hidden="true" /> {t("availability.error")}
        </p>
      ) : null}

      {result ? (
        <div className={`mt-4 flex flex-col gap-4 ${stale ? "opacity-60" : ""}`} aria-live="polite">
          {stale ? (
            <p role="status" className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-warning">
              <TriangleAlertIcon className="size-5 shrink-0" aria-hidden="true" /> {t("availability.stale")}
            </p>
          ) : null}

          {result.canProduce ? (
            <p className="flex items-center gap-2 text-lg font-bold text-success">
              <CircleCheckIcon className="size-6" aria-hidden="true" /> {t("availability.canProduce")}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-lg font-bold text-destructive">
              <CircleXIcon className="size-6" aria-hidden="true" /> {t("availability.cannotProduce")}
            </p>
          )}

          {result.noBom.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {result.noBom.map((item) => (
                <li key={item.productId} className="flex items-center gap-2 text-warning">
                  <TriangleAlertIcon className="size-5 shrink-0" aria-hidden="true" />
                  {t("availability.noBom", { product: `${item.productCode} · ${item.productName}` })}
                </li>
              ))}
            </ul>
          ) : null}

          {result.materials.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("availability.material")}</TableHead>
                  <TableHead className="text-right">{t("availability.required")}</TableHead>
                  <TableHead className="text-right">{t("availability.available")}</TableHead>
                  <TableHead className="text-right">{t("availability.missing")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.materials.map((row) => (
                  <TableRow key={row.materialId}>
                    <TableCell className="font-semibold whitespace-normal">
                      {row.materialCode} <span className="font-normal text-muted-foreground">· {row.materialName}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {number(row.required)} {row.uom}
                    </TableCell>
                    <TableCell className="text-right">
                      {number(row.available)} {row.uom}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.missing > 0 ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-destructive">
                          <TriangleAlertIcon className="size-4" aria-hidden="true" /> {number(row.missing)} {row.uom}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </div>
      ) : null}
    </SheetSection>
  );
}
