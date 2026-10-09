import { api, unwrap } from "./api.js";
import { createCrud } from "./crud.js";

// Invoices, payments and receipts (docs/specs/s1-mini-erp-workflow.md, section 2 steps 6-7). An invoice is never changed or deleted.
export const invoicesApi = {
  ...createCrud("/invoices"),
  /** The full payment: { paymentDate, amount }. The invoice becomes Paid and its receipt is issued. */
  pay: async (id, body) => unwrap(await api.post(`/invoices/${id}/payment`, body)),
};
