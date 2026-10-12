import { api, unwrap, unwrapList } from "./api.js";

/**
 * The same 6 calls for every master data resource (docs/api/master-data.md):
 *   GET list, GET :id, POST, PUT :id
 * List params: { q, page, pageSize }  ->  { items, meta: { page, pageSize, total } }
 */
export function createCrud(basePath) {
  return {
    key: basePath,
    list: async (params) => unwrapList(await api.get(basePath, { params })),
    get: async (id) => unwrap(await api.get(`${basePath}/${id}`)),
    create: async (data) => unwrap(await api.post(basePath, data)),
    update: async (id, data) => unwrap(await api.put(`${basePath}/${id}`, data)),
    remove: async (id) => {
      await api.delete(`${basePath}/${id}`);
    },
  };
}
