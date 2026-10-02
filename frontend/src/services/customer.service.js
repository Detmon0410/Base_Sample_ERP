import { createCrud } from "./crud.js";

/** M1 Customers. Fields: code, name, taxId, address, contactPerson, contactPhone, contactEmail, paymentTerms, creditLimit, status. */
export const customerService = createCrud("/master/customers");
