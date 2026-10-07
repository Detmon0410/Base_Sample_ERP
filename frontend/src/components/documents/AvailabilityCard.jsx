import { InfoIcon, PackageSearchIcon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SheetSection } from "@/components/common/SheetSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { checkAvailability } from "@/services/sale.service";
import { formatNumber } from "@/utils/format";

import { MaterialIcon } from "./MaterialIcon";

/** One material: how much is needed, how much is in stock, and what is left after the lines are produced. */
function MaterialRow({ row, number }) {
  const left = Math.round((row.available - row.required) * 1000) / 1000;
  const short = left < 0;
  const unit = <span className="ml-1 text-sm font-medium text-slate-600">{row.uom}</span>;

  return (
    <TableRow
      className={cn(
        short
          ? "bg-destructive/10 odd:bg-destructive/10 even:bg-destructive/10 hover:bg-destructive/15"
          : "bg-success/10 odd:bg-success/10 even:bg-success/10 hover:bg-success/15",
      )}
    >
      <TableCell className="whitespace-normal">
        <div className="flex items-center gap-3">
          <MaterialIcon code={row.materialCode} className={cn("size-7 shrink-0", short ? "text-destructive" : "text-success")} />
          <span>
            <span className="font-bold text-slate-900">{row.materialCode}</span> <span className="text-slate-700">· {row.materialName}</span>
          </span>
        </div>
      </TableCell>
      <TableCell className="text-right text-lg font-bold text-slate-900">
        {number(row.required)}
        {unit}
      </TableCell>
      <TableCell className="text-right text-lg font-bold text-slate-900">
        {number(row.available)}
        {unit}
      </TableCell>
      <TableCell className={cn("text-right text-xl font-extrabold", short ? "text-destructive" : "text-success")}>
        {short ? "−" : ""}
        {number(Math.abs(left))}
        {unit}
      </TableCell>
    </TableRow>
  );
}

/**
 * "Material availability" (aditional_req 1): explodes the BOM of every line and compares with the stock on hand.
 * It is advice only (nothing is blocked) and says so. The result is kept until the lines change, then it is
 * marked as out of date. Shows a summary first (can we produce it?), then the materials that are short, then
 * the ones that are fine.
 *   lines   [{ productId, qty }] as currently entered (invalid ones are ignored)
 *   check   the call that answers (default: the Sale check; Factory brings its own)
 */
export function AvailabilityCard({ lines, check: checkLines = checkAvailability }) {
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
      setResult(await checkLines(valid));
      setCheckedFor(signature);
      setState("idle");
    } catch {
      setState("error");
      toast.error(t("availability.error"));
    }
  };

  const number = (value) => formatNumber(value, i18n.language);
  const materials = result ? [...result.materials].sort((a, b) => Number(b.missing > 0) - Number(a.missing > 0)) : [];
  const shortCount = materials.filter((row) => row.missing > 0).length;

  return (
    <SheetSection title={t("availability.title")} icon={PackageSearchIcon}>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant={result ? "outline" : "default"} className="h-9" onClick={check} disabled={valid.length === 0 || state === "loading"}>
          <RefreshCwIcon aria-hidden="true" className={state === "loading" ? "animate-spin" : undefined} />
          {state === "loading" ? t("availability.checking") : result ? t("availability.checkAgain") : t("availability.check")}
        </Button>
        {valid.length === 0 ? <p className="text-muted-foreground">{t("availability.addLines")}</p> : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t("availability.note")}
              className="ml-auto grid size-8 place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <InfoIcon className="size-5" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{t("availability.note")}</TooltipContent>
        </Tooltip>
      </div>

      {state === "loading" && !result ? <Skeleton className="mt-4 h-24 w-full" aria-busy="true" /> : null}
      {state === "error" ? (
        <p role="alert" className="mt-4 flex items-center gap-2 text-destructive">
          <TriangleAlertIcon className="size-5" aria-hidden="true" /> {t("availability.error")}
        </p>
      ) : null}

      {result ? (
        <div className={cn("mt-4 flex flex-col gap-3", stale && "opacity-60")} aria-live="polite">
          {stale ? (
            <p role="status" className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-warning">
              <TriangleAlertIcon className="size-5 shrink-0" aria-hidden="true" /> {t("availability.stale")}
            </p>
          ) : null}

          <div role="status" className={cn("h-3 rounded-full", result.canProduce ? "bg-success/40" : "bg-destructive/40")}>
            <span className="sr-only">
              {t(result.canProduce ? "availability.canProduce" : "availability.cannotProduce")}
              {!result.canProduce && shortCount > 0 ? `. ${t("availability.summary", { short: shortCount, total: materials.length })}` : ""}
            </span>
          </div>

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

          {materials.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("availability.material")}</TableHead>
                  <TableHead className="text-right">{t("availability.required")}</TableHead>
                  <TableHead className="text-right">{t("availability.available")}</TableHead>
                  <TableHead className="text-right">{t("availability.remaining")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((row) => (
                  <MaterialRow key={row.materialId} row={row} number={number} />
                ))}
              </TableBody>
            </Table>
          ) : null}
        </div>
      ) : null}
    </SheetSection>
  );
}
