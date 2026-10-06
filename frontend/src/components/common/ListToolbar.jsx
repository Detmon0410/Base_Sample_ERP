import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, FunnelIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { DatePicker } from "@/components/common/DateField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * The bar above a list: [ Filters ▾ | search ... ] and the New button, all on one line (40px high).
 * "Filters" opens a small menu of the filters; picking one shows its choices (with a Back arrow). The filters
 * that are on are listed in blue in the menu and again as removable chips under the bar.
 *
 * filters: [{ key, label, kind, ... }]
 *   kind "options"   { options: [{ value, label }], emptyValue: "all" }   one choice, `values[key]`
 *   kind "search"    { options: [{ value, label }] }                       one choice from a long list, with a search box
 *   kind "dateRange" { fromKey, toKey }                                    two dates, `values[fromKey]` / `values[toKey]`
 * values:   the current query (strings). onChange(changes) writes keys of it back.
 */

const isOn = (filter, values) => {
  if (filter.kind === "dateRange") return Boolean(values[filter.fromKey] || values[filter.toKey]);
  const empty = filter.emptyValue ?? "";
  return Boolean(values[filter.key]) && values[filter.key] !== empty;
};

const summaryOf = (filter, values, dash) => {
  if (filter.kind === "dateRange") return `${values[filter.fromKey] || dash} – ${values[filter.toKey] || dash}`;
  return filter.options.find((option) => option.value === values[filter.key])?.label ?? values[filter.key];
};

const clearChanges = (filter) => {
  if (filter.kind === "dateRange") return { [filter.fromKey]: "", [filter.toKey]: "" };
  return { [filter.key]: filter.emptyValue ?? "" };
};

function Choice({ selected, onClick, children }) {
  return (
    <li role="option" aria-selected={selected}>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-base outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={cn("min-w-0 flex-1 truncate", selected && "font-semibold")}>{children}</span>
        {selected ? <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
      </button>
    </li>
  );
}

function FilterChoices({ filter, values, onChange, close }) {
  const { t } = useTranslation("common");
  const [needle, setNeedle] = useState("");
  const empty = filter.emptyValue ?? "";

  if (filter.kind === "dateRange") {
    return (
      <div className="flex flex-col gap-3 p-3">
        <label className="flex flex-col gap-1 text-sm font-semibold text-muted-foreground">
          {t("toolbar.from")}
          <DatePicker value={values[filter.fromKey]} max={values[filter.toKey] || undefined} onChange={(iso) => onChange({ [filter.fromKey]: iso })} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-muted-foreground">
          {t("toolbar.to")}
          <DatePicker value={values[filter.toKey]} min={values[filter.fromKey] || undefined} onChange={(iso) => onChange({ [filter.toKey]: iso })} />
        </label>
        <Button type="button" size="sm" className="h-9" onClick={close}>
          {t("toolbar.done")}
        </Button>
      </div>
    );
  }

  const shown = filter.kind === "search" ? filter.options.filter((option) => option.label.toLowerCase().includes(needle.trim().toLowerCase())) : filter.options;
  const pick = (value) => {
    onChange({ [filter.key]: value });
    close();
  };

  return (
    <div className="flex flex-col">
      {filter.kind === "search" ? (
        <div className="relative p-2 pb-1">
          <SearchIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus type="search" value={needle} onChange={(event) => setNeedle(event.target.value)} placeholder={t("toolbar.search")} aria-label={t("toolbar.search")} className="h-9 pl-9" />
        </div>
      ) : null}
      <ul role="listbox" aria-label={filter.label} className="max-h-64 overflow-y-auto p-1">
        {!needle ? (
          <Choice selected={!isOn(filter, values)} onClick={() => pick(empty)}>
            {t("toolbar.all")}
          </Choice>
        ) : null}
        {shown.map((option) => (
          <Choice key={option.value} selected={values[filter.key] === option.value} onClick={() => pick(option.value)}>
            {option.label}
          </Choice>
        ))}
        {shown.length === 0 ? <li className="px-3 py-2 text-muted-foreground">{t("toolbar.noMatch")}</li> : null}
      </ul>
    </div>
  );
}

export function ListToolbar({ searchValue, onSearchChange, searchLabel, filters = [], values, onChange, newTo, newLabel }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [openKey, setOpenKey] = useState(null); // which filter's choices are showing (null = the menu)
  const active = useMemo(() => filters.filter((filter) => isOn(filter, values)), [filters, values]);
  const current = filters.find((filter) => filter.key === openKey);
  const dash = "…";

  const clearAll = () => onChange(Object.assign({}, ...filters.map(clearChanges)));

  return (
    <div className="mb-4" role="search">
      <div className="flex items-center gap-3">
        <div className="flex h-10 min-w-0 flex-1 items-center gap-1 rounded-full border border-input bg-card pr-3 pl-1 focus-within:ring-2 focus-within:ring-ring">
          {filters.length > 0 ? (
            <Popover
              open={open}
              onOpenChange={(next) => {
                setOpen(next);
                if (next) setOpenKey(null);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 shrink-0 rounded-full px-3 hover:bg-muted", active.length > 0 ? "text-[#0EA5E9] hover:text-[#0EA5E9]" : "text-foreground")}
                >
                  <FunnelIcon aria-hidden="true" /> {t("toolbar.filters")}
                  {active.length > 0 ? <span className="font-semibold">({active.length})</span> : null}
                  <ChevronRightIcon aria-hidden="true" className="rotate-90" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72">
                {current ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setOpenKey(null)}
                      className="flex min-h-11 w-full items-center gap-2 border-b px-3 text-left font-semibold outline-none hover:bg-muted focus-visible:bg-muted"
                    >
                      <ChevronLeftIcon className="size-4" aria-hidden="true" /> {current.label}
                    </button>
                    <FilterChoices filter={current} values={values} onChange={onChange} close={() => setOpen(false)} />
                  </>
                ) : (
                  <ul className="p-1">
                    {filters.map((filter) => {
                      const on = isOn(filter, values);
                      return (
                        <li key={filter.key}>
                          <button
                            type="button"
                            onClick={() => setOpenKey(filter.key)}
                            className={cn(
                              "flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-base outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                              on && "text-primary",
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {filter.label}
                              {on ? ` : ${summaryOf(filter, values, dash)}` : ""}
                            </span>
                            <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
          ) : (
            <SearchIcon aria-hidden="true" className="mx-2 size-4 shrink-0 text-muted-foreground" />
          )}
          <Input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchLabel}
            aria-label={searchLabel}
            className="h-9 min-w-0 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
          />
        </div>

        {newTo ? (
          <Button asChild className="h-10 shrink-0">
            <Link to={newTo}>
              <PlusIcon /> {newLabel}
            </Link>
          </Button>
        ) : null}
      </div>

      {active.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {active.map((filter) => (
            <span key={filter.key} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-secondary pr-1 pl-3 text-sm text-primary">
              <span>
                {filter.label} : <span className="font-semibold">{summaryOf(filter, values, dash)}</span>
              </span>
              <button
                type="button"
                aria-label={`${t("toolbar.remove")}, ${filter.label}`}
                onClick={() => onChange(clearChanges(filter))}
                className="grid size-6 place-items-center rounded-full outline-none hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <XIcon className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
          <Button type="button" variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={clearAll}>
            {t("toolbar.clearAll")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
