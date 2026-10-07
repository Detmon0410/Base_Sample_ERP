import { cn } from "@/lib/utils";
import { formatNumber } from "@/utils/format";

/** A quantity with its sign: +12 in green, -12 in red (the sign and the colour say the same), 0 plain. */
export function SignedQty({ value, uom, language, className }) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return (
    <span className={cn("font-semibold whitespace-nowrap", value > 0 && "text-success", value < 0 && "text-destructive", className)}>
      {sign}
      {formatNumber(Math.abs(value), language)}
      {uom ? <span className="ml-1 font-normal text-muted-foreground">{uom}</span> : null}
    </span>
  );
}
