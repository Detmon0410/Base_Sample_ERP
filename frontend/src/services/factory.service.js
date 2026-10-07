import { api, unwrap } from "./api.js";
import { createCrud } from "./crud.js";

/**
 * Factory documents (docs/specs/f7-factory.md). Every status change is an explicit action called by a person:
 *   run(id, action, { note })                       ->  POST /factory/work-orders/:id/<action>
 *   stepAction(id, stepId, action, payload)         ->  POST /factory/work-orders/:id/steps/:stepId/<action>
 */
const documentApi = (path) => ({
  ...createCrud(path),
  run: async (id, action, payload = {}) => unwrap(await api.post(`${path}/${id}/${action}`, payload)),
});

export const workOrderService = {
  ...documentApi("/factory/work-orders"),
  stepAction: async (id, stepId, action, payload = {}) => unwrap(await api.post(`/factory/work-orders/${id}/steps/${stepId}/${action}`, payload)),
};

export const transferService = documentApi("/factory/transfers");

/** Sales orders sent to the factory that still have quantity without a Work Order. */
export const listWaitingOrders = async () => unwrap(await api.get("/factory/waiting-orders"));

/** Cards of the shop-floor board: [{ column: "waiting" | "running" | "done", workOrderNumber, step, … }]. */
export const listTracking = async (params) => unwrap(await api.get("/factory/tracking", { params }));

/** Material availability for lines [{ productId, qty }]; the same answer as the Sale check. */
export const checkFactoryAvailability = async (lines) =>
  unwrap(await api.post("/factory/availability", { lines: lines.map(({ productId, qty }) => ({ productId, qty })) }));
