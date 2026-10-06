import { PackageIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Small line icons of the refrigerator parts, drawn here (24 x 24, 1.8 stroke, like the lucide icons) because
 * the icon set has no compressor or insulation foam. Keyed by material code; any other material gets a box.
 */
const PARTS = {
  // a door panel with a freezer split and two handles
  DOOR: (
    <>
      <rect x="6" y="2.5" width="12" height="19" rx="2" />
      <path d="M6 10h12M15 5.5v2M15 13v3" />
    </>
  ),
  // a thermostat: a thermometer with marks
  THERMO: (
    <>
      <path d="M14 14.5V5a2 2 0 0 0-4 0v9.5a4 4 0 1 0 4 0Z" />
      <path d="M12 9v7M17 6h2M17 10h2" />
    </>
  ),
  // a compressor: round body, pipe on top, a coil inside
  COMP: (
    <>
      <rect x="5" y="8" width="14" height="12" rx="4" />
      <path d="M10 8V4.5h4V8M9 14h6M12 11v6" />
    </>
  ),
  // a shelf: a frame with two shelves
  SHELF: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M3.5 9.5h17M3.5 15h17" />
    </>
  ),
  // insulation foam: bubbles
  FOAM: (
    <>
      <circle cx="8" cy="9" r="3.5" />
      <circle cx="16.5" cy="7.5" r="2" />
      <circle cx="15.5" cy="15.5" r="4" />
      <circle cx="6.5" cy="17.5" r="2" />
    </>
  ),
  // a steel sheet with a shine
  STEEL: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <path d="M8 15l5-5M12 17l5-5" />
    </>
  ),
};

export function MaterialIcon({ code, className }) {
  const part = PARTS[String(code ?? "").toUpperCase()];
  if (!part) return <PackageIcon className={cn("size-6", className)} aria-hidden="true" />;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-6", className)}
    >
      {part}
    </svg>
  );
}
