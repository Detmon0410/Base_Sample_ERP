import { createCrud } from "./crud.js";

/** M4 Materials. Fields: code, name, uom (unit code), reorderPoint, reorderQty, status; onHand is read-only (from Stock). */
export const materialService = createCrud("/master/materials");
