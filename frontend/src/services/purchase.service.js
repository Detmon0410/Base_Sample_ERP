import { api, unwrap } from "./api.js";
import { createCrud } from "./crud.js";

// Purchase orders (docs/api/purchase.md).
export const purchaseApi = {
  ...createCrud("/purchase-orders"),
  /** Moves the status one step: { status: "Sent" } or { status: "Received", lots: [{ lineId, lotNumber }] } (the stock is added, once). */
  setStatus: async (id, body) => unwrap(await api.post(`/purchase-orders/${id}/status`, body)),
  /** The one payment of a received PO: { paymentDate, amount, method, referenceNo, note }. */
  pay: async (id, body) => unwrap(await api.post(`/purchase-orders/${id}/payment`, body)),
};
