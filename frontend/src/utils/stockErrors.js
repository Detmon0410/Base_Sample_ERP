import i18n from "@/i18n";

/**
 * The text of a "not enough stock" failure with what is missing: "Not enough stock. COMP: needs 12 pcs, has 8".
 * Returns null for any other error, so the caller shows its own text. `t` is the translation function of the "stock"
 * namespace; without it the current language of the app is used (so any sheet can call it with its own `t`).
 */
export function notEnoughStockText(error, t = i18n.getFixedT(null, "stock")) {
  if (error?.code !== "NOT_ENOUGH_STOCK") return null;
  const items = error.details?.[0]?.items ?? [];
  const list = items.map((item) => t("short.item", { code: item.code, needed: item.needed, uom: item.uom ?? "", has: item.has })).join("; ");
  return list ? `${t("errors.NOT_ENOUGH_STOCK")} ${list}` : t("errors.NOT_ENOUGH_STOCK");
}
