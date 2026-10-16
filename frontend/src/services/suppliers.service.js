import { createCrud } from "./crud.js";

// Suppliers and the materials they sell (docs/api/purchase.md): the same calls as the master data.
export const suppliersApi = createCrud("/suppliers");
