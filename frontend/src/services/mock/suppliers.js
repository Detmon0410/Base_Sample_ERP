// Suppliers and the materials they sell (docs/api/suppliers.md): a supplier is { id, code, name, contact, address, active, items }, where
// items = [{ materialId, unitPrice }] is the list of materials the supplier sells, with the initial price a purchase order starts from.
// `active` is only for suppliers: an inactive supplier cannot be chosen on a new PO.

import { invalid, issue, materials, number, resource, text } from "./master.js";

export const suppliers = [];

const itemView = (item) => {
  const material = materials.find((entry) => entry.id === item.materialId);
  return { ...item, materialCode: material?.code ?? "", materialName: material?.name ?? "", unit: material?.unit ?? "" };
};
const toView = (record) => ({ ...record, items: record.items.map(itemView) });
const toListView = ({ items, ...record }) => ({ ...record, itemCount: items.length });

export const supplierRoutes = resource({
  path: "/suppliers",
  store: suppliers,
  readAction: "suppliers.view",
  writeAction: "suppliers.write",
  unique: ["code"],
  searchIn: ["code", "name", "contact"],
  toView,
  toListView,
  // the list can be filtered by active (true / false)
  filter: (record, query) =>
    (query.active === undefined || query.active === "" || String(record.active) === String(query.active)) &&
    (!query.materialId || record.items.some((item) => item.materialId === Number(query.materialId))),
  normalize: (body) => {
    const data = { code: text(body.code), name: text(body.name), contact: text(body.contact), address: text(body.address), active: body.active === undefined ? true : body.active === true || body.active === "true", items: [] };
    const issues = [];
    if (!data.code) issues.push(issue("code", "REQUIRED"));
    if (!data.name) issues.push(issue("name", "REQUIRED"));
    (Array.isArray(body.items) ? body.items : []).forEach((item, index) => {
      const materialId = Number(item.materialId);
      const unitPrice = number(item.unitPrice);
      if (!materials.some((material) => material.id === materialId)) issues.push(issue(`items.${index}.materialId`, "REQUIRED"));
      if (!(Number.isInteger(unitPrice) && unitPrice >= 0)) issues.push(issue(`items.${index}.unitPrice`, "INVALID"));
      data.items.push({ materialId, unitPrice });
    });
    if (new Set(data.items.map((item) => item.materialId)).size < data.items.length) issues.push(issue("items", "DUPLICATE"));
    if (issues.length) invalid(issues);
    return data;
  },
});
