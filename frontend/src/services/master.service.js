import { createCrud } from "./crud.js";

// The master data of the Mini ERP (docs/specs/s1-mini-erp-workflow.md, section 4). The same calls for each resource.
export const customersApi = createCrud("/customers");
export const productsApi = createCrud("/products");
export const materialsApi = createCrud("/materials");
export const usersApi = createCrud("/users");
