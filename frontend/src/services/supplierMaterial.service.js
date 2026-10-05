import { createCrud } from "./crud.js";

/**
 * Links between a supplier and a material they sell (price in JPY per unit, lead time in days).
 * list({ supplierId }) or list({ materialId }); create / update / remove one link at a time.
 */
export const supplierMaterialService = createCrud("/master/supplier-materials");
