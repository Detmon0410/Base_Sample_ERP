import { useTranslation } from "react-i18next";

import { LanguageFlag } from "@/components/common/LanguageFlag";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Two small rectangular flags for the login screen, where there is no profile menu yet.
 * Inside the app the language is chosen in the user (profile) menu instead.
 * The language name is the accessible name and the tooltip; names are never translated.
 */
export function LanguageSwitcher({ className }) {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage;

  return (
    <div role="group" aria-label={t("language.label")} className={cn("flex items-center gap-2", className)}>
      {SUPPORTED_LANGUAGES.map(({ code, label }) => {
        const isActive = current === code;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-label={label}
            title={label}
            aria-pressed={isActive}
            onClick={() => i18n.changeLanguage(code)}
            className={cn(
              "grid h-10 w-14 place-items-center rounded-md outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
              isActive ? "bg-secondary ring-2 ring-primary" : "opacity-70 hover:bg-muted hover:opacity-100",
            )}
          >
            <LanguageFlag code={code} />
          </button>
        );
      })}
    </div>
  );
}
