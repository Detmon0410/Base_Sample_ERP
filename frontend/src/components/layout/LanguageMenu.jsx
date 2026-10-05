import { useTranslation } from "react-i18next";

import { LanguageFlag } from "@/components/common/LanguageFlag";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES } from "@/i18n";

/**
 * Language button of the top bar: shows the flag of the current language and opens a list of
 * flag + language name. Separate from the user menu. Names are written in their own language
 * and are never translated.
 */
export function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const current = SUPPORTED_LANGUAGES.find((language) => language.code === i18n.resolvedLanguage) ?? SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${t("language.label")}: ${current.label}`}
        title={`${t("language.label")}: ${current.label}`}
        className="grid h-9 w-11 place-items-center rounded-lg outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white data-[state=open]:bg-white/15"
      >
        <LanguageFlag code={current.code} size="sm" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup value={current.code} onValueChange={(code) => i18n.changeLanguage(code)}>
          {SUPPORTED_LANGUAGES.map(({ code, label }) => (
            <DropdownMenuRadioItem
              key={code}
              value={code}
              lang={code}
              className="h-10 gap-3 text-base data-[state=checked]:font-bold"
            >
              <LanguageFlag code={code} />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
