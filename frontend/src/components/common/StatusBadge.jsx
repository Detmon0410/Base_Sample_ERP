import { CircleAlertIcon, CircleCheckIcon, TriangleAlertIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONES = {
  danger: { icon: TriangleAlertIcon, className: "border-destructive/40 bg-destructive/10 text-destructive" },
  warning: { icon: CircleAlertIcon, className: "border-warning/40 bg-warning/10 text-warning" },
  success: { icon: CircleCheckIcon, className: "border-success/40 bg-success/10 text-success" },
  neutral: { icon: null, className: "border-border bg-muted text-foreground" },
};

/**
 * Status chip. Meaning is carried by the text and an icon, never by color alone.
 * tone: "danger" | "warning" | "success" | "neutral"
 */
export function StatusBadge({ tone = "neutral", children, className }) {
  const { icon: Icon, className: toneClass } = TONES[tone] ?? TONES.neutral;
  return (
    <Badge variant="outline" className={cn("h-7 gap-1.5 px-2.5 text-sm font-semibold", toneClass, className)}>
      {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
      {children}
    </Badge>
  );
}
