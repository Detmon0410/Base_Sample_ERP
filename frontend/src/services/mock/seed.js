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
  { code: "MAT-101", name: "Stainless steel sheet", minLevel: 100, lots: [{ lotNumber: "S-2610-A", quantity: 300 }, { lotNumber: "S-2610-B", quantity: 150 }] },
  { code: "MAT-102", name: "Insulation foam", minLevel: 50, lots: [{ lotNumber: "F-2609-A", quantity: 40 }] },
  { code: "MAT-103", name: "Compressor unit", minLevel: 10, lots: [{ lotNumber: "C-2608-A", quantity: 24 }] },
  { code: "MAT-104", name: "Door gasket", minLevel: 20, lots: [] },
  { code: "MAT-105", name: "Screw M4", minLevel: null, lots: [{ lotNumber: "X-2607-A", quantity: 5000 }] },
];

// code, name, price, BOM as [material code, quantity for one product]
const PRODUCTS = [
  { code: "PRD-100", name: "Commercial refrigerator 100", price: 180000, bom: [["MAT-101", 12], ["MAT-102", 6], ["MAT-103", 1], ["MAT-104", 2], ["MAT-105", 80]] },
  { code: "PRD-200", name: "Compact freezer 50", price: 120000, bom: [["MAT-101", 8], ["MAT-102", 5], ["MAT-103", 1], ["MAT-105", 60]] },
  { code: "PRD-300", name: "Cold room door", price: 65000, bom: [["MAT-101", 4], ["MAT-102", 3], ["MAT-104", 1]] },
];

export function seedMock(routes) {
  const call = (route, body) => {
    const response = routes[route]({ authorization: INTERNAL_TOKEN, params: {}, query: {}, body });
    return response.data ?? response;
  };
  for (const customer of CUSTOMERS) call("POST /customers", customer);
  const ids = {};
  for (const material of MATERIALS) ids[material.code] = call("POST /materials", material).id;
  for (const product of PRODUCTS) {
    call("POST /products", { ...product, bom: product.bom.map(([code, quantity]) => ({ materialId: ids[code], quantity })) });
  }
}
