import { enUS } from "date-fns/locale/en-US";
import { ja } from "date-fns/locale/ja";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/format";

const pad = (n) => String(n).padStart(2, "0");
const toIso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
// "2026-10-02" -> a Date at local midnight (new Date("2026-10-02") would be UTC and can show the day before)
const fromIso = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
};

/**
 * A date as a button that opens a calendar. The value is an ISO string ("2026-10-02") or "", the same as the
 * native date input it replaces. `min` / `max` are ISO strings; days outside them cannot be picked.
 * The calendar has month and year dropdowns, and Clear / Today under it.
 */
export function DatePicker({ id, value, onChange, min, max, placeholder, disabled, clearable = true, className, ...aria }) {
  const { t, i18n } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const selected = fromIso(value);
  const minDate = fromIso(min);
  const maxDate = fromIso(max);
  const pick = (iso) => {
    onChange(iso);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-haspopup="dialog"
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 text-left text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
            !selected && "text-muted-foreground",
            className,
          )}
          {...aria}
        >
          <span className="truncate">{selected ? formatDate(value, i18n.language) : (placeholder ?? t("datePicker.choose"))}</span>
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-0">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={new Date(2020, 0)}
          endMonth={new Date(2040, 11)}
          defaultMonth={selected}
          selected={selected}
          onSelect={(date) => pick(date ? toIso(date) : "")}
          disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]}
          locale={i18n.language?.startsWith("ja") ? ja : enUS}
          className="[--cell-size:--spacing(9)]"
        />
        <div className="flex items-center justify-between border-t px-2 py-1.5">
          {clearable ? (
            <Button type="button" variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={() => pick("")}>
              {t("datePicker.clear")}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" variant="ghost" size="sm" className="h-9 text-primary" onClick={() => pick(toIso(new Date()))}>
            {t("datePicker.today")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** DatePicker wired to react-hook-form: <DateField control={form.control} name="date" id="qt-date" {...fieldProps("date")} /> */
export function DateField({ control, name, onValueChange, ...props }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <DatePicker
          {...props}
          value={field.value ?? ""}
          onChange={(iso) => {
            field.onChange(iso);
            onValueChange?.(iso);
          }}
        />
      )}
    />
  );
}
