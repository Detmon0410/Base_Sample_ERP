import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enAuth from "./locales/en/auth.json";
import enCommon from "./locales/en/common.json";
import enMaster from "./locales/en/master.json";
import enInvoices from "./locales/en/invoices.json";
import enNav from "./locales/en/nav.json";
import enDashboard from "./locales/en/dashboard.json";
import enOrders from "./locales/en/orders.json";
import jaAuth from "./locales/ja/auth.json";
import jaCommon from "./locales/ja/common.json";
import jaMaster from "./locales/ja/master.json";
import jaInvoices from "./locales/ja/invoices.json";
import jaNav from "./locales/ja/nav.json";
import jaDashboard from "./locales/ja/dashboard.json";
import jaOrders from "./locales/ja/orders.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "ja", label: "日本語", short: "日本語" },
];

const LANGUAGE_STORAGE_KEY = "kanou.language";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, auth: enAuth, nav: enNav, master: enMaster, orders: enOrders, invoices: enInvoices, dashboard: enDashboard },
      ja: { common: jaCommon, auth: jaAuth, nav: jaNav, master: jaMaster, orders: jaOrders, invoices: jaInvoices, dashboard: jaDashboard },
    },
    supportedLngs: SUPPORTED_LANGUAGES.map((language) => language.code),
    // English is the primary language. JA files hold the same keys with empty
    // values, so anything not translated yet falls back to English.
    fallbackLng: "en",
    returnEmptyString: false,
    defaultNS: "common",
    ns: ["common", "auth", "nav", "master", "orders", "invoices", "dashboard"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    // Development only: a key with no text in English is a bug. It is collected in window.__missingKeys and reported as a console
    // error, so the Playwright tests (which fail on a console error) catch it on every page they visit.
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (languages, namespace, key) => {
      if (!languages.includes("en")) return; // another language falls back to English, that is not an error
      (window.__missingKeys ??= new Set()).add(`${namespace}:${key}`);
      console.error(`Missing translation: ${namespace}:${key}`);
    },
    detection: {
      order: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

function syncDocumentLanguage(language) {
  document.documentElement.lang = language?.startsWith("ja") ? "ja" : "en";
  document.title = i18n.t("common:app.name"); // the name of the system follows the language
}

syncDocumentLanguage(i18n.resolvedLanguage);
i18n.on("languageChanged", syncDocumentLanguage);

export default i18n;
