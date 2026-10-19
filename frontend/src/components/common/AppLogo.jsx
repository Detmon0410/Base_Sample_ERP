import { cn } from "@/lib/utils";

/**
 * The logo of the company: the picture `public/logo.png`, with no background. `light` is the same picture with its dark lines made white, for the blue bar (`public/logo-light.png`). It has no words, and the name of the company is
 * not written beside it in the top bar or on the sign-in page. It is decoration there; give `label` where the logo is the only thing that names a link.
 */
export function AppLogo({ className, label, light = false }) {
  return <img src={light ? "/logo-light.png" : "/logo.png"} alt={label ?? ""} aria-hidden={label ? undefined : "true"} draggable="false" className={cn("block aspect-square shrink-0 object-contain", className)} />;
}
