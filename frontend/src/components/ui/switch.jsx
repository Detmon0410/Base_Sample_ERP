import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

/**
 * An on / off toggle. On = green, off = grey, so the state shows without reading anything. 44px wide and
 * 26px high; the round knob (20px) is 3px from the edge in both positions, so on and off look the same size. Use it with a visible label or an aria-label.
 */
function Switch({ className, ...props }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[26px] w-11 shrink-0 cursor-pointer items-center rounded-full bg-slate-300 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-success",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 translate-x-[3px] rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-[21px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
