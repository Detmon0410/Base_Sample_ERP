import { api, unwrap, unwrapList } from "./api.js";
import { createCrud } from "./crud.js";

// The master data of the Mini ERP (docs/specs/s1-mini-erp-workflow.md, section 4). The same calls for each resource.
export const customersApi = createCrud("/customers");
export const productsApi = createCrud("/products");
export const materialsApi = createCrud("/materials");
export const usersApi = createCrud("/users");

/** The stock changes of a material (docs/specs/s1-mini-erp-workflow.md, section 2 step 8). */
export const stockApi = {
  /** The numbers of the overview: { materials, lots } */
  overview: async () => unwrap(await api.get("/stock/overview")),
  /** The ledger of every stock change: params { q, type, from, to, page, pageSize } -> { items, meta }, newest first. */
  listChanges: async (params) => unwrapList(await api.get("/stock-changes", { params })),
  /** The history, newest first. */
  history: async (materialId) => unwrap(await api.get(`/materials/${materialId}/stock-changes`)),
  /** { kind: "Add" | "Deduct" | "Adjust", lotNumber, quantity, changeDate, note, orderId? } -> the material with its new lots */
  change: async (materialId, body) => unwrap(await api.post(`/materials/${materialId}/stock-changes`, body)),
};
