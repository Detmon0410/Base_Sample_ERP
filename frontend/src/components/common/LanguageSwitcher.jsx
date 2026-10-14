import { useTranslation } from "react-i18next";

import { SUPPORTED_LANGUAGES } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * The two languages as plain words ("EN", "日本語"), no flags.
 * The current language is bold. The full language name is the accessible name; names are never translated.
 */
export function LanguageSwitcher({ className }) {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage;

  return (
    <div role="group" aria-label={t("language.label")} className={cn("flex items-center gap-1", className)}>
      {SUPPORTED_LANGUAGES.map(({ code, label, short }, index) => (
        <span key={code} className="flex items-center gap-1">
          {index > 0 ? <span aria-hidden="true">|</span> : null}
          <button
            type="button"
            lang={code}
            aria-label={label}
            title={label}
            aria-pressed={current === code}
            onClick={() => i18n.changeLanguage(code)}
            className={cn("px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring", current === code ? "font-bold" : "opacity-80 hover:opacity-100")}
          >
            {short}
          </button>
        </span>
      ))}
    </div>
  );
}
