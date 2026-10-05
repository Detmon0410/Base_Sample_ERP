import { useCallback } from "react";

import { lookupPrices } from "@/services/sale.service";

/**
 * Default unit prices of document lines (spec 4.2, Q10): the customer's price list for the document date, else
 * the product's selling price. A price the user typed by hand (priceEdited) is never overwritten.
 *   onProductPicked(index, productId)   a product was chosen on a line
 *   repriceAll(customerId?)             the customer (or the date) changed: re-price every line not edited by hand
 */
export function useDefaultPrices(form) {
  const { getValues, setValue } = form;

  const fetchPrices = useCallback(
    async (customerId, productIds) => {
      if (!customerId || productIds.length === 0) return {};
      try {
        return await lookupPrices({ customerId, productIds, date: getValues("date") });
      } catch {
        return {}; // a failed lookup leaves the prices as they are; the user can type them
      }
    },
    [getValues],
  );

  const onProductPicked = useCallback(
    async (index, productId) => {
      const prices = await fetchPrices(getValues("customerId"), [productId]);
      if (prices[productId] != null && !getValues(`lines.${index}.priceEdited`)) {
        setValue(`lines.${index}.unitPrice`, prices[productId], { shouldDirty: true });
      }
    },
    [fetchPrices, getValues, setValue],
  );

  const repriceAll = useCallback(
    async (customerId = getValues("customerId")) => {
      const lines = getValues("lines") ?? [];
      const ids = [...new Set(lines.filter((line) => line.productId && !line.priceEdited).map((line) => line.productId))];
      const prices = await fetchPrices(customerId, ids);
      lines.forEach((line, index) => {
        if (line.productId && !line.priceEdited && prices[line.productId] != null) {
          setValue(`lines.${index}.unitPrice`, prices[line.productId], { shouldDirty: true });
        }
      });
    },
    [fetchPrices, getValues, setValue],
  );

  return { onProductPicked, repriceAll };
}
