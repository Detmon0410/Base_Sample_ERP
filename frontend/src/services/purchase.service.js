import { api, unwrap } from "./api.js";
import { createCrud } from "./crud.js";

/**
 * Purchase (docs/specs/f9-purchase.md). Every status change is an explicit action called by a person:
 *   run(id, action, { note })   ->  POST /purchase/orders/:id/<action>   and   POST /purchase/receipts/:id/<action>
 */
const documentApi = (path) => ({
  ...createCrud(path),
  run: async (id, action, payload = {}) => unwrap(await api.post(`${path}/${id}/${action}`, payload)),
});

/** The materials with their stock status, what is on order and the supplier to buy from (the stock status board). */
export const stockStatusService = createCrud("/purchase/stock-status");
export const purchaseOrderService = documentApi("/purchase/orders");
/** The approval log of the purchase orders (Manager and Admin): who asked, approved or rejected, and when. */
export const purchaseApprovalService = createCrud("/purchase/approvals");
export const goodsReceiptService = documentApi("/purchase/receipts");
