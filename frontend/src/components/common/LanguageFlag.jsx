import { cn } from "@/lib/utils";

/**
 * Small rectangular (3:2) flag for a language. Drawn as SVG on purpose: flag emoji do not render on Windows
 * (they show as "GB" / "JP" letters). English uses the UK flag, Japanese the Japanese flag.
 * Decorative only: the button or menu item around it carries the accessible name.
 */
export function LanguageFlag({ code, className }) {
  const common = {
    "aria-hidden": "true",
    focusable: "false",
    preserveAspectRatio: "xMidYMid slice",
    // Fixed size via style: menus and buttons force a generic size on every child svg
    // (e.g. size-4), which would otherwise shrink the flag.
    style: { width: "1.875rem", height: "1.25rem" },
    className: cn("shrink-0 rounded-[3px] ring-1 ring-black/20", className),
  };

  if (code === "ja") {
    return (
      <svg viewBox="0 0 30 20" {...common}>
        <rect width="30" height="20" fill="#ffffff" />
        <circle cx="15" cy="10" r="6" fill="#bc002d" />
      </svg>
    );
  }

  // en — Union Jack (simplified)
  return (
    <svg viewBox="0 0 60 30" {...common}>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0 0L60 30M60 0L0 30" stroke="#ffffff" strokeWidth="6" />
      <path d="M0 0L60 30M60 0L0 30" stroke="#c8102e" strokeWidth="2" />
      <path d="M30 0V30M0 15H60" stroke="#ffffff" strokeWidth="10" />
      <path d="M30 0V30M0 15H60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  );
}
