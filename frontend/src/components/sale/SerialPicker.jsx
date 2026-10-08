import { ListChecksIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { serialService } from "@/services/serial.service";

/**
 * Names the units of a delivery line: the serial numbers that are in the warehouse and not on another delivery note.
 *   value     the chosen serial numbers          max   how many pieces the line delivers (the most that can be named)
 *   dnId      this delivery note (its own units stay in the list)
 */
export function SerialPicker({ productId, dnId, value, max, onChange, error }) {
  const { t } = useTranslation("sale");
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState(null);

  const load = async () => {
    try {
      const { items } = await serialService.list({ product: productId, free: 1, dn: dnId, status: "in_stock", pageSize: 200, sort: "sn" });
      setUnits(items.map((unit) => unit.sn));
    } catch {
      setUnits([]);
    }
  };
  const toggle = (sn) => onChange(value.includes(sn) ? value.filter((item) => item !== sn) : [...value, sn].slice(0, Math.max(max, value.length)));
  const complete = max > 0 && value.length === max;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) load();
          }}
        >
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-9">
              <ListChecksIcon aria-hidden="true" /> {t("sale:serials.choose")}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-96 max-w-[90vw] p-0">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-3">
              <span className="text-sm font-semibold">{t("sale:serials.chosenOf", { chosen: value.length, max })}</span>
              <span className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="h-8" disabled={!units || units.length === 0} onClick={() => onChange((units ?? []).slice(0, max))}>
                  {t("sale:serials.first", { count: Math.min(max, units?.length ?? 0) })}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8" disabled={value.length === 0} onClick={() => onChange([])}>
                  {t("sale:serials.clear")}
                </Button>
              </span>
            </div>
            <ul className="m-0 max-h-72 list-none overflow-y-auto p-1">
              {units === null ? <li className="p-3 text-muted-foreground">{t("sale:serials.loading")}</li> : null}
              {units?.length === 0 ? <li className="p-3 text-muted-foreground">{t("sale:serials.noneInStock")}</li> : null}
              {(units ?? []).map((sn) => (
                <li key={sn}>
                  <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 hover:bg-muted">
                    <input type="checkbox" className="size-5" checked={value.includes(sn)} disabled={!value.includes(sn) && value.length >= max} onChange={() => toggle(sn)} />
                    <span className="font-semibold tabular-nums">{sn}</span>
                  </label>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
        <span className={complete ? "text-sm font-semibold text-success" : "text-sm text-muted-foreground"}>{t("sale:serials.chosenOf", { chosen: value.length, max })}</span>
      </div>
      {value.length > 0 ? (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {value.map((sn) => (
            <li key={sn} className="rounded-md bg-muted px-2 py-0.5 text-sm tabular-nums">
              {sn}
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
