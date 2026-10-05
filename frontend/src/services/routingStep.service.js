import { api, unwrap } from "./api.js";
import { createCrud } from "./crud.js";

const crud = createCrud("/master/routing-steps");

/**
 * Production steps of a product, in order. list({ productId }); create { productId, processName, machineId };
 * update { processName, machineId }; remove (later steps are renumbered); move(id, "up" | "down").
 */
export const routingStepService = {
  ...crud,
  move: async (id, direction) => unwrap(await api.post(`/master/routing-steps/${id}/move`, { direction })),
};
