import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Searchable single choice from a master data list (materials, suppliers, units…).
 *   options   [{ id, code, name }]      value  the chosen id (or "" / null)      onChange(id)
 * The list is filtered by code or name as the user types. Keyboard: type to search, Tab to the list,
 * Enter to choose, Esc to close.
 */
export function EntitySelect({ id, options, value, onChange, placeholder, emptyLabel, className, chevronClassName, disabled, "aria-label": ariaLabel, "aria-invalid": invalid, "aria-describedby": describedby }) {
  const { t } = useTranslation("master");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const selected = options.find((option) => String(option.id) === String(value));
  const needle = text.trim().toLowerCase();
  const shown = needle
    ? options.filter((option) => `${option.code} ${option.name}`.toLowerCase().includes(needle))
    : options;

  const choose = (option) => {
    onChange(option.id);
    setOpen(false);
    setText("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setText("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={invalid}
          aria-describedby={describedby}
          aria-haspopup="listbox"
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-3 text-left text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
            !selected && !emptyLabel && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{selected ? `${selected.code} · ${selected.name}` : (emptyLabel ?? placeholder)}</span>
          <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground", chevronClassName)} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="relative border-b p-2">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("common.searchOptions")}
            aria-label={t("common.searchOptions")}
            className="pl-9"
          />
        </div>
        <ul role="listbox" className="max-h-60 overflow-y-auto p-1">
          {emptyLabel && !needle ? (
            <li role="option" aria-selected={!selected}>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-base outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0 flex-1 truncate font-semibold">{emptyLabel}</span>
                {!selected ? <CheckIcon className="size-4 shrink-0" aria-hidden="true" /> : null}
              </button>
            </li>
          ) : null}
          {shown.length === 0 ? (
            <li className="px-3 py-3 text-muted-foreground">{t("common.noOptions")}</li>
          ) : (
            shown.map((option) => {
              const isSelected = String(option.id) === String(value);
              return (
                <li key={option.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => choose(option)}
                    className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-base outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold">{option.code}</span> · {option.name}
                    </span>
                    {isSelected ? <CheckIcon className="size-4 shrink-0" aria-hidden="true" /> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
