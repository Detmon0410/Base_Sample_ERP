import { createCrud } from "./crud.js";

/** M2 Suppliers. Fields: code, name, taxId, address, contactPerson, contactPhone, contactEmail, paymentTerms, status. */
export const supplierService = createCrud("/master/suppliers");
