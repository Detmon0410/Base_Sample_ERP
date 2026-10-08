import { api, unwrap, unwrapList } from "./api.js";
import { createCrud } from "./crud.js";

/**
 * Serial numbers of the finished products (docs/specs/f12-requirements-2.md, part B). They are made only when a Factory user
 * presses the button; everything after that (transferred, delivered, invoiced) is read from the other documents.
 *   serialService.list / get(sn)          GET /serials, GET /serials/:sn (with the timeline of the unit)
 *   workOrderSerials.list(woId)           GET  /factory/work-orders/:id/serials   (units of one Work Order, meta: { qty, made, left, canMake })
 *   workOrderSerials.make(woId, count)    POST /factory/work-orders/:id/serials
 */
const crud = createCrud("/serials");

export const serialService = {
  key: crud.key,
  list: crud.list,
  get: async (sn) => unwrap(await api.get(`/serials/${encodeURIComponent(sn)}`)),
};

export const workOrderSerials = {
  list: async (workOrderId) => unwrapList(await api.get(`/factory/work-orders/${workOrderId}/serials`)),
  make: async (workOrderId, count) => unwrap(await api.post(`/factory/work-orders/${workOrderId}/serials`, { count })),
};
