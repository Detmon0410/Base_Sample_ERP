import { api, unwrap } from "./api.js";
import { createCrud } from "./crud.js";

// Production orders (docs/api/orders.md). An order is made by Confirm QT, never by hand, so there is no `create`.
const { list, get, update } = createCrud("/orders");

export const ordersApi = {
  list,
  get,
  /** Changes an order that has not started: the date, the notes, the lines and their processes. */
  update,
  /** The Admin or a Factory Worker starts the production; the order then locks its products and processes. */
  start: async (id) => unwrap(await api.post(`/orders/${id}/start`)),
  /** Adds one progress entry to a process: { processId, status, completedQuantity, workDate, note }. */
  recordProgress: async (id, body) => unwrap(await api.post(`/orders/${id}/progress`, body)),
};
