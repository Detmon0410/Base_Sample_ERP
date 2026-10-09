import { api, unwrap } from "./api.js";
import { createCrud } from "./crud.js";

// Production orders (docs/specs/s1-mini-erp-workflow.md, section 2 steps 2-5).
export const ordersApi = {
  ...createCrud("/orders"),
  /** The Admin starts the production; the order then locks its products and processes. */
  start: async (id) => unwrap(await api.post(`/orders/${id}/start`)),
  /** Adds one progress entry to a process: { processId, status, completedQuantity, workDate, note }. */
  recordProgress: async (id, body) => unwrap(await api.post(`/orders/${id}/progress`, body)),
};
