import { SIMPLE_MASTERS } from "@/config/simpleMaster";

import { createCrud } from "./crud.js";

/** One CRUD service per flat master data entity: /master/uom, /master/warehouses, /master/machines, /master/employees. */
export const simpleMasterServices = Object.fromEntries(
  Object.values(SIMPLE_MASTERS).map((entity) => [entity.key, createCrud(`/master/${entity.key}`)]),
);
