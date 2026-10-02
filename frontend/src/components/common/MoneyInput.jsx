import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Whole-yen amount with a fixed ¥ sign. Use with react-hook-form's `register` (setValueAs for null). */
export function MoneyInput({ className, ...props }) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground"
      >
        ¥
      </span>
      <Input type="number" inputMode="numeric" min={0} step={1} className={cn("pl-8 text-right", className)} {...props} />
    </div>
  );
}
