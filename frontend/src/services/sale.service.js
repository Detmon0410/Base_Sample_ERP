import { api, unwrap } from "./api.js";
import { createCrud } from "./crud.js";

/**
 * Sale documents (docs/specs/f6-sale.md). Every status change is an explicit action called by a person:
 *   run(kind, id, action, { note })  ->  POST /sale/<kind>/:id/<action>   (returns the updated document)
 * kind: "quotations" | "orders" | "deliveries".
 */
const documentApi = (path) => {
  const crud = createCrud(path);
  return {
    ...crud,
    run: async (id, action, payload = {}) => unwrap(await api.post(`${path}/${id}/${action}`, payload)),
  };
};

export const quotationService = {
  ...documentApi("/sale/quotations"),
  createOrder: async (id) => unwrap(await api.post(`/sale/quotations/${id}/create-order`)),
};

export const saleOrderService = {
  ...documentApi("/sale/orders"),
  createDeliveryNote: async (id) => unwrap(await api.post(`/sale/orders/${id}/delivery-notes`)),
};

export const deliveryNoteService = documentApi("/sale/deliveries");

export const customerPoService = createCrud("/sale/customer-pos");

/** Material availability of a list of lines: { canProduce, materials, shortages, noBom, checkedAt }. */
export const checkAvailability = async (lines) =>
  unwrap(await api.post("/sale/availability", { lines: lines.map(({ productId, qty }) => ({ productId, qty })) }));

/** Default unit prices for products of a customer on a date: { [productId]: yen }. */
export const lookupPrices = async ({ customerId, productIds, date }) =>
  unwrap(await api.get("/sale/price-lookup", { params: { customerId, productIds: productIds.join(","), date } }));
