import { api, unwrap } from "./api.js";
import { createCrud } from "./crud.js";

/**
 * Stock (docs/specs/f8-stock.md). Balances and movements are read-only lists; an adjustment is a document whose
 * status changes are explicit actions called by a person:  run(id, action, { note })  ->  POST /stock/adjustments/:id/<action>
 */
export const balanceService = createCrud("/stock/balances");
export const movementService = createCrud("/stock/movements");

export const adjustmentService = {
  ...createCrud("/stock/adjustments"),
  run: async (id, action, payload = {}) => unwrap(await api.post(`/stock/adjustments/${id}/${action}`, payload)),
};

/** One item with its quantity in every warehouse, its last movements and (for a material) the products that use it. */
export const getStockItem = async (kind, id) => unwrap(await api.get(`/stock/items/${kind === "product" ? "products" : "materials"}/${id}`));

/** On hand of one item in one warehouse: { onHand, uom }. */
export const getOnHand = async (itemType, itemId, warehouseId) => unwrap(await api.get("/stock/balance", { params: { itemType, itemId, warehouseId } }));
