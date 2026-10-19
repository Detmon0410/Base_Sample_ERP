import { api, unwrap, unwrapList } from "./api.js";
import { createCrud } from "./crud.js";

// Invoices, payments and receipts. An invoice is never changed or deleted.
const { list, get, create } = createCrud("/invoices");

export const invoicesApi = {
  list,
  get,
  create,
  /** The full payment: { paymentDate, amount }. The invoice becomes Paid and its receipt is issued. */
  pay: async (id, body) => unwrap(await api.post(`/invoices/${id}/payment`, body)),
};

/** The receipts: the list and one receipt. A receipt is made by the payment of an invoice and never changed or deleted. */
export const receiptsApi = {
  list: async (params) => unwrapList(await api.get("/receipts", { params })),
  get: async (id) => unwrap(await api.get(`/receipts/${id}`)),
};
