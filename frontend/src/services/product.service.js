import { createCrud } from "./crud.js";

/** M3 Products (finished goods). Fields: code, name, uom (unit code), sellingPrice, category, status. */
export const productService = createCrud("/master/products");
