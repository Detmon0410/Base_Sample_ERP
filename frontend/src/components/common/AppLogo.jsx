import { cn } from "@/lib/utils";

/**
 * The logo of the company: the picture `public/logo.png` (a square with a white background). It has no words, and the name of the company is
 * not written beside it in the top bar or on the sign-in page. It is decoration there; give `label` where the logo is the only thing that names a link.
 */
export function AppLogo({ className, label }) {
  return <img src="/logo.png" alt={label ?? ""} aria-hidden={label ? undefined : "true"} draggable="false" className={cn("block aspect-square shrink-0 object-contain", className)} />;
}
