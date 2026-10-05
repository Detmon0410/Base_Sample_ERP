import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enAuth from "./locales/en/auth.json";
import enCommon from "./locales/en/common.json";
import enDashboard from "./locales/en/dashboard.json";
import enMaster from "./locales/en/master.json";
import enNav from "./locales/en/nav.json";
import enSale from "./locales/en/sale.json";
import jaAuth from "./locales/ja/auth.json";
import jaCommon from "./locales/ja/common.json";
import jaDashboard from "./locales/ja/dashboard.json";
import jaMaster from "./locales/ja/master.json";
import jaNav from "./locales/ja/nav.json";
import jaSale from "./locales/ja/sale.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
];

const LANGUAGE_STORAGE_KEY = "kanou.language";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, auth: enAuth, nav: enNav, dashboard: enDashboard, master: enMaster, sale: enSale },
      ja: { common: jaCommon, auth: jaAuth, nav: jaNav, dashboard: jaDashboard, master: jaMaster, sale: jaSale },
    },
    supportedLngs: SUPPORTED_LANGUAGES.map((language) => language.code),
    // English is the primary language. JA files hold the same keys with empty
    // values, so anything not translated yet falls back to English.
    fallbackLng: "en",
    returnEmptyString: false,
    defaultNS: "common",
    ns: ["common", "auth", "nav", "dashboard", "master", "sale"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    detection: {
      order: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

function syncDocumentLanguage(language) {
  document.documentElement.lang = language?.startsWith("ja") ? "ja" : "en";
}

syncDocumentLanguage(i18n.resolvedLanguage);
i18n.on("languageChanged", syncDocumentLanguage);

export default i18n;
