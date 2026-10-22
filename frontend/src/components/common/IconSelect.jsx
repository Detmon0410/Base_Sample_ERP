import { Check, ChevronDown } from "lucide-react";
import { Select } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * A select whose choices have an icon (the browser's own select cannot show one). It looks like the underlined fields of the forms.
 *   options   [{ value, label, icon }]; `icon` is a lucide component
 *   value     the chosen value, "" for none (then `placeholder` is shown)
 *   onChange  called with the new value
 */
export function IconSelect({ options, value, onChange, placeholder, invalid, className, ...props }) {
  return (
    <Select.Root value={value || undefined} onValueChange={onChange}>
      <Select.Trigger
        aria-invalid={invalid ? true : undefined}
        className={cn(
          "flex h-10 w-full min-w-0 cursor-pointer items-center gap-2 border-0 border-b border-input bg-transparent px-1 text-left text-base outline-none focus-visible:border-b-2 focus-visible:border-primary data-[placeholder]:text-muted-foreground aria-invalid:border-destructive",
          className,
        )}
        {...props}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="ml-auto">
          <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" sideOffset={4} className="z-50 w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-border bg-card shadow-lg">
          <Select.Viewport className="p-1">
            {options.map(({ value: optionValue, label, icon: Icon }) => (
              <Select.Item key={optionValue} value={optionValue} className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2 text-base outline-none data-[highlighted]:bg-[#e6f3fa] data-[state=checked]:font-semibold">
                {Icon ? <Icon aria-hidden="true" className="size-5 shrink-0 text-primary" /> : null}
                <Select.ItemText>{label}</Select.ItemText>
                <Select.ItemIndicator className="ml-auto">
                  <Check aria-hidden="true" className="size-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
