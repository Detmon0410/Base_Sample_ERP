import { createCrud } from "./crud.js";

/**
 * M10 Price lists. One row = the price of one product for one customer in a period.
 * Fields: productId, customerId, price (whole yen per unit), validFrom, validTo (optional, "YYYY-MM-DD"), status.
 * The response also carries productCode / productName / customerCode / customerName.
 */
export const priceListService = createCrud("/master/price-lists");
