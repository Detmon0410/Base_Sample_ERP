import * as React from "react"
import { cn } from "cn"

// Only an underline, no box (docs/specs/s2-mini-erp-look.md).
function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 border-0 border-b border-input bg-transparent px-1 py-1 text-base outline-none placeholder:text-muted-foreground focus-visible:border-b-2 focus-visible:border-primary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
