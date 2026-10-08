import { HardHatIcon } from "lucide-react";

import { ROLE_HATS } from "@/config/roleStyle";
import { cn } from "@/lib/utils";

/** A safety helmet icon in the colour of the role (white Manager, yellow Worker, red Admin). Decorative: the role is said in words next to it. */
export function RoleHat({ role, className }) {
  return <HardHatIcon aria-hidden="true" strokeWidth={2.25} className={cn("size-6 shrink-0", ROLE_HATS[role] ?? ROLE_HATS.Worker, className)} />;
}
