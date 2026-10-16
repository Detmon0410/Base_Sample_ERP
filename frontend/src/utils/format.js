// Locale-aware formatting. The locale is the active i18n language ("en" or "ja").

const LOCALES = { en: "en-US", ja: "ja-JP" };
const toLocale = (language) => LOCALES[language?.startsWith("ja") ? "ja" : "en"];

/** Money is JPY only, whole yen. */
export function formatCurrency(value, language) {
  return new Intl.NumberFormat(toLocale(language), {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatNumber(value, language) {
  return new Intl.NumberFormat(toLocale(language)).format(value ?? 0);
}

/** EN: 2026-10-01   JA: 2026年10月1日 */
export function formatDate(value, language) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (language?.startsWith("ja")) {
    return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(date);
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(value, language) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(toLocale(language), { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatDateTime(value, language) {
  if (!value) return "";
  return `${formatDate(value, language)} ${formatTime(value, language)}`;
}

