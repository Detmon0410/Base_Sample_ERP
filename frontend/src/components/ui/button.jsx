import * as React from "react"
import { cva } from "class-variance-authority";
import { cn } from "cn"
import { Slot } from "radix-ui"

// Flat, with small rounded corners.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md border border-transparent text-base font-medium whitespace-nowrap outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#006fa8]",
        outline: "border-[#c9ccd1] bg-secondary text-secondary-foreground hover:bg-[#e4e4e4]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[#e4e4e4]",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive: "bg-destructive text-white hover:bg-[#9a1d13]",
        link: "text-link underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 gap-2 px-5",
        xs: "h-8 gap-1 px-3 text-sm",
        sm: "h-9 gap-1.5 px-4 text-sm",
        lg: "h-11 gap-2 px-6",
        icon: "size-9 p-0 [&_svg]:size-5", // an icon alone, no frame (use with variant ghost)
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
