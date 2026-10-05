import { createCrud } from "./crud.js";

/**
 * M5 Bill of materials: one line = quantity of a material for ONE unit of a product.
 * list({ productId }) or list({ materialId }); create { productId, materialId, qty }; update { qty }; remove.
 */
export const bomLineService = createCrud("/master/bom-lines");
