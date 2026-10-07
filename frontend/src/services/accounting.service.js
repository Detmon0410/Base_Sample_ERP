import { api, unwrap } from "./api.js";
import { createCrud } from "./crud.js";

/**
 * Accounting (docs/specs/f10-accounting.md). Every status change is an explicit action called by a person:
 *   run(id, action, { note })   ->  POST /accounting/<documents>/:id/<action>
 * `sources()` lists what a new invoice (delivered delivery notes) or bill (posted goods receipts) can still be made from.
 */
const documentApi = (path) => ({
  ...createCrud(path),
  run: async (id, action, payload = {}) => unwrap(await api.post(`${path}/${id}/${action}`, payload)),
});
const withSources = (path) => ({ ...documentApi(path), sources: async () => unwrap(await api.get(`${path}/sources`)) });

export const customerInvoiceService = withSources("/accounting/invoices");
export const customerReceiptService = documentApi("/accounting/receipts");
export const supplierBillService = withSources("/accounting/bills");
export const supplierPaymentService = documentApi("/accounting/payments");
export const journalService = documentApi("/accounting/journal");
