import { describe, expect, it } from "vitest";

import { mockRoutes } from "./routes.js";
import { seedMock } from "./seed.js";
import { mockUsers, tokenOf } from "./users.js";

describe("the first data of the mock", () => {
  it("makes customers, materials with lots and products with a BOM, without an error", () => {
    seedMock(mockRoutes);
    const call = (route) => mockRoutes[route]({ authorization: `Bearer ${tokenOf(mockUsers[0])}`, params: {}, query: { pageSize: 50 }, body: {} });
    expect(call("GET /customers").data.length).toBeGreaterThanOrEqual(4);
    const materials = call("GET /materials").data;
    expect(materials.map((material) => material.stockStatus)).toEqual(expect.arrayContaining(["Normal", "Low", "Out"]));
    expect(call("GET /products").data.every((product) => product.bom.length > 0)).toBe(true);
    expect(materials.every((material) => material.unit)).toBe(true);
    expect(call("GET /suppliers").data.map((supplier) => supplier.active)).toEqual(expect.arrayContaining([true, false]));
    expect(call("GET /purchase-orders").data.map((po) => po.status).sort()).toEqual(["Draft", "Received", "Sent"]);
  });
});
