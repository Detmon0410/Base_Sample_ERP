import { api, unwrap, unwrapList } from "./api.js";

/**
 * The same 6 calls for every master data resource (docs/api/master-data.md):
 *   GET list, GET :id, POST, PUT :id, PATCH :id/status, DELETE :id
 * List params: { q, status, page, pageSize, sort }  ->  { items, meta: { page, pageSize, total } }
 */
export function createCrud(basePath) {
  return {
    list: async (params) => unwrapList(await api.get(basePath, { params })),
    get: async (id) => unwrap(await api.get(`${basePath}/${id}`)),
    create: async (data) => unwrap(await api.post(basePath, data)),
    update: async (id, data) => unwrap(await api.put(`${basePath}/${id}`, data)),
    setStatus: async (id, status) => unwrap(await api.patch(`${basePath}/${id}/status`, { status })),
    remove: async (id) => {
      await api.delete(`${basePath}/${id}`);
    },
  };
}
