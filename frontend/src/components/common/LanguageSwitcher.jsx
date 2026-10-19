import { useTranslation } from "react-i18next";

import { Flag } from "@/components/common/Flag";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * The two languages as flags (the United Kingdom for English, Japan for Japanese). The current language has a ring around its flag and the
 * other is dimmed. The full language name is the accessible name and the tooltip; names are never translated.
 */
export function LanguageSwitcher({ className }) {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage;

  return (
    <div role="group" aria-label={t("language.label")} className={cn("flex items-center gap-3", className)}>
      {SUPPORTED_LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-label={label}
          title={label}
          aria-pressed={current === code}
          onClick={() => i18n.changeLanguage(code)}
          className={cn(
            "block overflow-hidden rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            current === code ? "ring-2 ring-current ring-offset-2" : "opacity-70 hover:opacity-100",
          )}
        >
          <Flag code={code} className="block h-5 w-[30px]" />
        </button>
      ))}
    </div>
  );
}
