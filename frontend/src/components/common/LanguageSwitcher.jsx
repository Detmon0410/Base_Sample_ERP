import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { cn } from "@/lib/utils";

const ON_DARK_ACTIVE = "bg-white text-primary hover:bg-white/90";
const ON_DARK_IDLE = "border-white/70 bg-transparent text-white hover:bg-white/15 hover:text-white";

/**
 * Text buttons (not an icon or dropdown) so the current choice is always visible.
 * Language names are written in their own language and are never translated.
 * Use `onDark` when placed on the primary-colored header.
 */
export function LanguageSwitcher({ onDark = false, className }) {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage;

  return (
    <div role="group" aria-label={t("language.label")} className={className}>
      <div className="inline-flex gap-1">
        {SUPPORTED_LANGUAGES.map(({ code, label }) => {
          const isActive = current === code;
          return (
            <Button
              key={code}
              type="button"
              size="sm"
              variant={isActive ? "default" : "outline"}
              aria-pressed={isActive}
              lang={code}
              className={cn(onDark && (isActive ? ON_DARK_ACTIVE : ON_DARK_IDLE))}
              onClick={() => i18n.changeLanguage(code)}
            >
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
