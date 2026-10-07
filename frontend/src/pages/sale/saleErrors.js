import { notEnoughStockText } from "@/utils/stockErrors";

/** Text of an API error for a toast: sale:errors.<CODE>, else a generic message. */
export function saleErrorText(t, error) {
  return notEnoughStockText(error) ?? t(`errors.${error?.code}`, { defaultValue: t("errors.UNKNOWN") });
}
