// The first data of the mock in the browser: some customers, materials (with lots) and products (with a BOM), so the lists, the order
// form and the stock pages have something to show. Not in the tests, which start from empty stores.
// The records are made through the routes (as the system), so they get ids, numbers and the first "Add" of each lot like any other record.

import { INTERNAL_TOKEN } from "./users.js";

const CUSTOMERS = [
  { name: "Sakura Cold Storage Co., Ltd.", address: "1-2-3 Minato, Tokyo 105-0001", email: "order@sakura-cold.example", telephone: "03-5555-0101" },
  { name: "Nagoya Food Service Inc.", address: "4-5-6 Sakae, Nagoya 460-0008", email: "buyer@nagoya-food.example", telephone: "052-555-0102" },
  { name: "Osaka Kitchen Supply", address: "7-8-9 Namba, Osaka 542-0076", email: "info@osaka-kitchen.example", telephone: "06-5555-0103" },
  { name: "Hokkaido Fisheries Union", address: "2-1 Kita 1-jo, Sapporo 060-0001", email: "purchase@hokkaido-fish.example", telephone: "011-555-0104" },
];

// code, name, minimum level, lots
const MATERIALS = [
  { code: "MAT-101", name: "Stainless steel sheet", unit: "kg", minLevel: 100, lots: [{ lotNumber: "S-2610-A", quantity: 300 }, { lotNumber: "S-2610-B", quantity: 150 }] },
  { code: "MAT-102", name: "Insulation foam", unit: "kg", minLevel: 50, lots: [{ lotNumber: "F-2609-A", quantity: 40 }] },
  { code: "MAT-103", name: "Compressor unit", unit: "pcs", minLevel: 10, lots: [{ lotNumber: "C-2608-A", quantity: 24 }] },
  { code: "MAT-104", name: "Door gasket", unit: "pcs", minLevel: 20, lots: [] },
  { code: "MAT-105", name: "Screw M4", unit: "pcs", minLevel: null, lots: [{ lotNumber: "X-2607-A", quantity: 5000 }] },
];

// code, name, contact, address, the materials it sells as [material code, initial price]; the last one is not active
const SUPPLIERS = [
  { code: "SUP-01", name: "Aichi Steel Trading", contact: "Mr. Ito", address: "3-1 Marunouchi, Nagoya 460-0002", active: true, items: [["MAT-101", 520], ["MAT-105", 3]] },
  { code: "SUP-02", name: "Kansai Insulation Co.", contact: "Ms. Mori", address: "8-2 Kitahama, Osaka 541-0041", active: true, items: [["MAT-102", 1800], ["MAT-104", 650]] },
  { code: "SUP-03", name: "Tokai Compressors", contact: "Mr. Endo", address: "5-9 Sakae, Nagoya 460-0008", active: true, items: [["MAT-103", 24000]] },
  { code: "SUP-09", name: "Old Parts Supplier", contact: "", address: "", active: false, items: [["MAT-105", 4]] },
];

// code, name, price, BOM as [material code, quantity for one product]
const PRODUCTS = [
  { code: "PRD-100", name: "Commercial refrigerator 100", price: 180000, bom: [["MAT-101", 12], ["MAT-102", 6], ["MAT-103", 1], ["MAT-104", 2], ["MAT-105", 80]] },
  { code: "PRD-200", name: "Compact freezer 50", price: 120000, bom: [["MAT-101", 8], ["MAT-102", 5], ["MAT-103", 1], ["MAT-105", 60]] },
  { code: "PRD-300", name: "Cold room door", price: 65000, bom: [["MAT-101", 4], ["MAT-102", 3], ["MAT-104", 1]] },
];

export function seedMock(routes) {
  const call = (route, body, params = {}) => {
    const response = routes[route]({ authorization: INTERNAL_TOKEN, params, query: {}, body });
    return response.data ?? response;
  };
  for (const customer of CUSTOMERS) call("POST /customers", customer);
  const ids = {};
  for (const material of MATERIALS) ids[material.code] = call("POST /materials", material).id;
  for (const product of PRODUCTS) {
    call("POST /products", { ...product, bom: product.bom.map(([code, quantity]) => ({ materialId: ids[code], quantity })) });
  }

  // suppliers, and purchase orders in the three statuses (a Draft, a Sent one and a Received one that is not paid yet)
  const supplierIds = {};
  for (const supplier of SUPPLIERS) {
    supplierIds[supplier.code] = call("POST /suppliers", { ...supplier, items: supplier.items.map(([code, unitPrice]) => ({ materialId: ids[code], unitPrice })) }).id;
  }
  const stamp = new Date();
  const required = new Date(stamp.getFullYear(), stamp.getMonth(), stamp.getDate() + 14);
  const requiredDate = `${required.getFullYear()}-${String(required.getMonth() + 1).padStart(2, "0")}-${String(required.getDate()).padStart(2, "0")}`;
  const makePo = (supplierCode, lines) => call("POST /purchase-orders", { supplierId: supplierIds[supplierCode], requiredDate, department: "Factory", notes: "", lines: lines.map(([code, quantity, unitPrice]) => ({ materialId: ids[code], quantity, unitPrice })) });
  makePo("SUP-02", [["MAT-102", 60, 1800]]); // Draft: the foam is low
  const sent = makePo("SUP-03", [["MAT-103", 10, 24000]]);
  call("POST /purchase-orders/:id/status", { status: "Sent" }, { id: sent.id });
  const received = makePo("SUP-01", [["MAT-101", 200, 520]]);
  call("POST /purchase-orders/:id/status", { status: "Sent" }, { id: received.id });
  call("POST /purchase-orders/:id/status", { status: "Received", lots: [{ lineId: received.lines[0].id, lotNumber: "S-2610-C" }] }, { id: received.id });
}
