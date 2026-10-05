// In-memory master data for VITE_USE_MOCK=true. It lives as long as the page is not reloaded.
// The shapes and error codes are the contract in docs/api/master-data.md.

import { MockHttpError, MockResponse } from "./errors.js";

// Testing helper: localStorage "kanou.mockFail" containing "master" makes every list request fail (HTTP 500).
function listShouldFail() {
  try {
    return (window.localStorage.getItem("kanou.mockFail") ?? "").split(",").map((s) => s.trim()).includes("master");
  } catch {
    return false;
  }
}

const matches = (value, text) => String(value ?? "").toLowerCase().includes(text);

/**
 * Builds the 6 routes every master data resource has:
 *   GET list, GET :id, POST, PUT :id, PATCH :id/status, DELETE :id
 * `options.searchFields` — fields searched by `?q=`; `options.sortable` — allowed `?sort=` fields;
 * `options.validate(body)` — returns field errors; `options.isInUse(row)` — block delete (409 IN_USE);
 * `options.guard(authorization)` — throws when the user may not use master data.
 */
export function createMockCrud(basePath, rows, options) {
  const { searchFields, sortable, validate, isInUse = () => false, guard, readOnly = [], onRemove } = options;
  const stripReadOnly = (body) => Object.fromEntries(Object.entries(body).filter(([key]) => !readOnly.includes(key)));
  let nextId = Math.max(0, ...rows.map((row) => row.id)) + 1;

  const find = (id) => {
    const row = rows.find((candidate) => candidate.id === Number(id));
    if (!row) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
    return row;
  };

  const checkBody = (body, existingId) => {
    const errors = validate(body);
    if (errors.length) throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", errors);
    const code = String(body.code ?? "").trim();
    if (rows.some((row) => row.code.toLowerCase() === code.toLowerCase() && row.id !== existingId)) {
      throw new MockHttpError(409, "CODE_ALREADY_EXISTS", "Code already exists");
    }
  };

  return {
    [`GET ${basePath}`]: ({ authorization, query }) => {
      guard(authorization);
      if (listShouldFail()) throw new MockHttpError(500, "INTERNAL_SERVER_ERROR", "Mock failure");
      const text = String(query.q ?? "").trim().toLowerCase();
      const status = query.status && query.status !== "all" ? query.status : null;
      let result = rows.filter(
        (row) =>
          (!status || row.status === status) &&
          (!text || searchFields.some((field) => matches(row[field], text))),
      );

      const sortKey = String(query.sort ?? "code");
      const descending = sortKey.startsWith("-");
      const field = descending ? sortKey.slice(1) : sortKey;
      if (sortable.includes(field)) {
        result = [...result].sort((a, b) => {
          const left = a[field];
          const right = b[field];
          // Empty values sort first when ascending (last when descending).
          let order;
          if (left == null || left === "") order = right == null || right === "" ? 0 : -1;
          else if (right == null || right === "") order = 1;
          else order = typeof left === "number" ? left - right : String(left).localeCompare(String(right));
          return descending ? -order : order;
        });
      }

      const pageSize = Math.min(Number(query.pageSize) || 20, 100);
      const total = result.length;
      const page = Math.min(Math.max(Number(query.page) || 1, 1), Math.max(1, Math.ceil(total / pageSize)));
      return new MockResponse({
        data: result.slice((page - 1) * pageSize, page * pageSize),
        meta: { page, pageSize, total },
      });
    },

    [`GET ${basePath}/:id`]: ({ authorization, params }) => {
      guard(authorization);
      return find(params.id);
    },

    [`POST ${basePath}`]: ({ authorization, body }) => {
      guard(authorization);
      checkBody(body);
      const now = new Date().toISOString();
      const row = { ...stripReadOnly(body), code: String(body.code).trim(), id: nextId++, status: "active", createdAt: now, updatedAt: now };
      rows.push(row);
      return new MockResponse({ data: row, status: 201, message: "Created" });
    },

    [`PUT ${basePath}/:id`]: ({ authorization, params, body }) => {
      guard(authorization);
      const row = find(params.id);
      // The code is fixed after creation: it is ignored on update.
      checkBody({ ...body, code: row.code }, row.id);
      Object.assign(row, stripReadOnly(body), { id: row.id, code: row.code, status: row.status, updatedAt: new Date().toISOString() });
      return row;
    },

    [`PATCH ${basePath}/:id/status`]: ({ authorization, params, body }) => {
      guard(authorization);
      const row = find(params.id);
      if (!["active", "inactive"].includes(body.status)) {
        throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [{ path: ["status"], message: "INVALID" }]);
      }
      row.status = body.status;
      row.updatedAt = new Date().toISOString();
      return row;
    },

    [`DELETE ${basePath}/:id`]: ({ authorization, params }) => {
      guard(authorization);
      const row = find(params.id);
      if (isInUse(row)) throw new MockHttpError(409, "IN_USE", "Record is used by other data");
      rows.splice(rows.indexOf(row), 1);
      onRemove?.(row);
      return null;
    },
  };
}

// ---- Customers (M1) ---------------------------------------------------------------------------

const PAYMENT_TERMS = ["NET_15", "NET_30", "NET_45", "NET_60", "COD"];
const FIRST_NAMES = ["Sakura", "Fuji", "Hikari", "Nippon", "Tokyo", "Osaka", "Kyoto", "Nagoya", "Hokkaido", "Kansai"];
const KINDS = ["Appliance Store", "Home Mart", "Electric", "Living", "Retail", "Trading"];

function sampleCustomers() {
  const base = [
    { code: "C001", name: "ABC Appliance Store", taxId: "1234567890", paymentTerms: "NET_30", creditLimit: 5000000 },
    { code: "C002", name: "Best Home Mart", taxId: "9876543210", paymentTerms: "NET_15", creditLimit: 3000000 },
  ];
  const extra = Array.from({ length: 30 }, (_, index) => ({
    code: `C${String(index + 3).padStart(3, "0")}`,
    name: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${KINDS[index % KINDS.length]}`,
    taxId: String(1000000000 + index * 7919),
    paymentTerms: PAYMENT_TERMS[index % PAYMENT_TERMS.length],
    creditLimit: index % 4 === 0 ? null : (1 + (index % 5)) * 1000000,
  }));

  return [...base, ...extra].map((customer, index) => ({
    id: index + 1,
    address: index < 2 ? "1-2-3 Shinjuku, Tokyo" : "",
    contactPerson: index < 2 ? "Tanaka" : "",
    contactPhone: index < 2 ? "03-1234-5678" : "",
    contactEmail: index < 2 ? `purchasing@example${index + 1}.co.jp` : "",
    status: index % 11 === 10 ? "inactive" : "active",
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-01T09:00:00.000Z",
    ...customer,
  }));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCustomer(body) {
  const errors = [];
  const text = (field) => String(body[field] ?? "").trim();
  if (!text("code")) errors.push({ path: ["code"], message: "REQUIRED" });
  if (!text("name")) errors.push({ path: ["name"], message: "REQUIRED" });
  if (text("contactEmail") && !EMAIL.test(text("contactEmail"))) errors.push({ path: ["contactEmail"], message: "INVALID_EMAIL" });
  if (body.paymentTerms && !PAYMENT_TERMS.includes(body.paymentTerms)) errors.push({ path: ["paymentTerms"], message: "INVALID" });
  if (body.creditLimit != null && (!Number.isInteger(body.creditLimit) || body.creditLimit < 0)) {
    errors.push({ path: ["creditLimit"], message: "INVALID" });
  }
  return errors;
}

// ---- Flat entities: units of measure, warehouses, machines, employees (M9, M6, M7, M8) ------------

const STAMP = { status: "active", createdAt: "2026-09-01T09:00:00.000Z", updatedAt: "2026-09-01T09:00:00.000Z" };
const withIds = (rows) => rows.map((row, index) => ({ id: index + 1, ...STAMP, ...row }));

/** Validator for rows with code, name and a few extra fields: { select: { field: [values] }, number: [fields], max: { field: n } }. */
function simpleValidator({ required = [], select = {}, number = [], max = {} }) {
  return (body) => {
    const errors = [];
    const text = (field) => String(body[field] ?? "").trim();
    for (const field of ["code", "name", ...required]) if (!text(field)) errors.push({ path: [field], message: "REQUIRED" });
    for (const [field, values] of Object.entries(select)) {
      if (body[field] && !values.includes(body[field])) errors.push({ path: [field], message: "INVALID" });
    }
    for (const field of number) {
      if (body[field] != null && (!Number.isInteger(body[field]) || body[field] < 0)) errors.push({ path: [field], message: "INVALID" });
    }
    for (const [field, limit] of Object.entries(max)) if (text(field).length > limit) errors.push({ path: [field], message: "INVALID" });
    return errors;
  };
}

const sampleUom = () =>
  withIds([
    { code: "pcs", name: "Pieces" },
    { code: "kg", name: "Kilogram" },
    { code: "m", name: "Meter" },
    { code: "set", name: "Set" },
    { code: "box", name: "Box" },
  ]);

const sampleWarehouses = () =>
  withIds([
    { code: "WH-R", name: "Raw Material Warehouse", type: "RAW_MATERIAL" },
    { code: "WH-F", name: "Finished Goods Warehouse", type: "FINISHED_GOODS" },
  ]);

const sampleMachines = () =>
  withIds([
    { code: "LN-01", name: "Assembly Line 1", capacityPerDay: 200, capacityUnit: "pcs" },
    { code: "LN-02", name: "Foaming Line", capacityPerDay: 150, capacityUnit: "pcs" },
    { code: "LN-03", name: "Packing Line", capacityPerDay: 200, capacityUnit: "pcs" },
    { code: "QC-01", name: "QC Station", capacityPerDay: 300, capacityUnit: "pcs" },
  ]);

const sampleEmployees = () =>
  withIds([
    { code: "E001", name: "Ken Suzuki", position: "Operator" },
    { code: "E002", name: "Yuki Tanaka", position: "QC Inspector" },
    { code: "E003", name: "Haruka Sato", position: "Operator" },
  ]);

// ---- Materials (M4), Suppliers (M2) and the supplier–material links ----------------------------------

const sampleMaterials = () =>
  withIds([
    { code: "COMP", name: "Compressor", uom: "pcs", reorderPoint: 20, reorderQty: 50, onHand: 35 },
    { code: "DOOR", name: "Door panel", uom: "pcs", reorderPoint: 30, reorderQty: 100, onHand: 18 },
    { code: "FOAM", name: "Insulation foam", uom: "kg", reorderPoint: 100, reorderQty: 300, onHand: 450 },
    { code: "STEEL", name: "Steel sheet", uom: "kg", reorderPoint: 200, reorderQty: 800, onHand: 210 },
    { code: "SHELF", name: "Shelf", uom: "pcs", reorderPoint: 50, reorderQty: 200, onHand: 300 },
    { code: "THERMO", name: "Thermostat", uom: "pcs", reorderPoint: 40, reorderQty: 150, onHand: 25 },
  ]);

const sampleSuppliers = () =>
  withIds([
    { code: "S001", name: "CompCo", taxId: "1111111111", paymentTerms: "NET_30", contactPerson: "Mori", contactPhone: "06-1111-2222", contactEmail: "sales@compco.example.jp", address: "2-3-4 Umeda, Osaka" },
    { code: "S002", name: "SteelCo", taxId: "2222222222", paymentTerms: "NET_45", contactPerson: "Ito", contactPhone: "052-333-4444", contactEmail: "info@steelco.example.jp", address: "5-6-7 Sakae, Nagoya" },
    { code: "S003", name: "BackupCo", taxId: "3333333333", paymentTerms: "NET_30", contactPerson: "", contactPhone: "", contactEmail: "", address: "" },
  ]).map((row) => ({ contactPerson: "", contactPhone: "", contactEmail: "", address: "", ...row }));

// Which supplier sells which material (price per unit in JPY, lead time in days).
const sampleLinks = () => [
  { id: 1, supplierId: 1, materialId: 1, priceJpy: 3800, leadTimeDays: 14 },
  { id: 2, supplierId: 1, materialId: 6, priceJpy: 650, leadTimeDays: 10 },
  { id: 3, supplierId: 2, materialId: 4, priceJpy: 180, leadTimeDays: 7 },
  { id: 4, supplierId: 2, materialId: 2, priceJpy: 2200, leadTimeDays: 12 },
  { id: 5, supplierId: 3, materialId: 1, priceJpy: 4100, leadTimeDays: 7 },
  { id: 6, supplierId: 3, materialId: 3, priceJpy: 520, leadTimeDays: 5 },
  { id: 7, supplierId: 3, materialId: 5, priceJpy: 340, leadTimeDays: 9 },
];

const isQty = (value, { min = 0, allowZero = true } = {}) =>
  typeof value === "number" && Number.isFinite(value) && (allowZero ? value >= min : value > min);

function materialValidator(uomRows) {
  return (body) => {
    const errors = [];
    const text = (field) => String(body[field] ?? "").trim();
    for (const field of ["code", "name", "uom"]) if (!text(field)) errors.push({ path: [field], message: "REQUIRED" });
    if (text("uom") && !uomRows.some((row) => row.code === body.uom)) errors.push({ path: ["uom"], message: "INVALID" });
    if (!isQty(body.reorderPoint)) errors.push({ path: ["reorderPoint"], message: body.reorderPoint == null ? "REQUIRED" : "INVALID" });
    if (body.reorderQty != null && !isQty(body.reorderQty, { allowZero: false })) errors.push({ path: ["reorderQty"], message: "INVALID" });
    return errors;
  };
}

function validateSupplier(body) {
  const errors = [];
  const text = (field) => String(body[field] ?? "").trim();
  if (!text("code")) errors.push({ path: ["code"], message: "REQUIRED" });
  if (!text("name")) errors.push({ path: ["name"], message: "REQUIRED" });
  if (text("contactEmail") && !EMAIL.test(text("contactEmail"))) errors.push({ path: ["contactEmail"], message: "INVALID_EMAIL" });
  if (body.paymentTerms && !PAYMENT_TERMS.includes(body.paymentTerms)) errors.push({ path: ["paymentTerms"], message: "INVALID" });
  return errors;
}

/** Routes of the supplier–material links: list (by supplier or material), add, change, remove. */
function supplierMaterialRoutes({ guard, links, suppliers, materials }) {
  let nextId = Math.max(0, ...links.map((link) => link.id)) + 1;
  const withNames = (link) => {
    const supplier = suppliers.find((row) => row.id === link.supplierId);
    const material = materials.find((row) => row.id === link.materialId);
    return {
      ...link,
      supplierCode: supplier?.code,
      supplierName: supplier?.name,
      materialCode: material?.code,
      materialName: material?.name,
      uom: material?.uom,
    };
  };
  const checkBody = (body, { creating }) => {
    const errors = [];
    if (creating) {
      if (!suppliers.some((row) => row.id === Number(body.supplierId))) errors.push({ path: ["supplierId"], message: "INVALID" });
      if (!materials.some((row) => row.id === Number(body.materialId))) errors.push({ path: ["materialId"], message: "INVALID" });
    }
    if (!Number.isInteger(body.priceJpy) || body.priceJpy < 0) errors.push({ path: ["priceJpy"], message: "INVALID" });
    if (!Number.isInteger(body.leadTimeDays) || body.leadTimeDays < 0) errors.push({ path: ["leadTimeDays"], message: "INVALID" });
    if (errors.length) throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", errors);
  };
  const find = (id) => {
    const link = links.find((row) => row.id === Number(id));
    if (!link) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
    return link;
  };

  return {
    "GET /master/supplier-materials": ({ authorization, query }) => {
      guard(authorization);
      if (listShouldFail()) throw new MockHttpError(500, "INTERNAL_SERVER_ERROR", "Mock failure");
      const items = links
        .filter((link) => (!query.supplierId || link.supplierId === Number(query.supplierId)) && (!query.materialId || link.materialId === Number(query.materialId)))
        .map(withNames);
      return new MockResponse({ data: items, meta: { page: 1, pageSize: items.length, total: items.length } });
    },
    "POST /master/supplier-materials": ({ authorization, body }) => {
      guard(authorization);
      checkBody(body, { creating: true });
      if (links.some((link) => link.supplierId === Number(body.supplierId) && link.materialId === Number(body.materialId))) {
        throw new MockHttpError(409, "ALREADY_LINKED", "This supplier already supplies this material");
      }
      const link = {
        id: nextId++,
        supplierId: Number(body.supplierId),
        materialId: Number(body.materialId),
        priceJpy: body.priceJpy,
        leadTimeDays: body.leadTimeDays,
      };
      links.push(link);
      return new MockResponse({ data: withNames(link), status: 201, message: "Created" });
    },
    "PUT /master/supplier-materials/:id": ({ authorization, params, body }) => {
      guard(authorization);
      const link = find(params.id);
      checkBody(body, { creating: false });
      link.priceJpy = body.priceJpy;
      link.leadTimeDays = body.leadTimeDays;
      return withNames(link);
    },
    "DELETE /master/supplier-materials/:id": ({ authorization, params }) => {
      guard(authorization);
      links.splice(links.indexOf(find(params.id)), 1);
      return null;
    },
  };
}

/** Master data routes. `guard` throws 401/403 unless the caller is an Admin (Q6/Q7). */
export function masterDataRoutes(guard) {
  const customers = sampleCustomers();
  const uomRows = sampleUom();
  const materialRows = sampleMaterials();
  const supplierRows = sampleSuppliers();
  const links = sampleLinks();
  return {
    ...createMockCrud("/master/customers", customers, {
      searchFields: ["code", "name"],
      sortable: ["code", "name", "paymentTerms", "creditLimit", "status"],
      validate: validateCustomer,
      // C001 and C002 stand for customers that already have Sale Orders.
      isInUse: (row) => row.code === "C001" || row.code === "C002",
      guard,
    }),
    // The first four units, both warehouses and the production lines stand for records that documents already use.
    ...createMockCrud("/master/uom", uomRows, {
      searchFields: ["code", "name"],
      sortable: ["code", "name", "status"],
      validate: simpleValidator({}),
      isInUse: (row) => row.code !== "box",
      guard,
    }),
    ...createMockCrud("/master/warehouses", sampleWarehouses(), {
      searchFields: ["code", "name"],
      sortable: ["code", "name", "type", "status"],
      validate: simpleValidator({ required: ["type"], select: { type: ["RAW_MATERIAL", "FINISHED_GOODS"] } }),
      isInUse: (row) => row.code === "WH-R" || row.code === "WH-F",
      guard,
    }),
    ...createMockCrud("/master/machines", sampleMachines(), {
      searchFields: ["code", "name"],
      sortable: ["code", "name", "capacityPerDay", "status"],
      validate: simpleValidator({ number: ["capacityPerDay"], max: { capacityUnit: 20 } }),
      isInUse: (row) => ["LN-01", "LN-02", "LN-03"].includes(row.code),
      guard,
    }),
    ...createMockCrud("/master/materials", materialRows, {
      searchFields: ["code", "name"],
      sortable: ["code", "name", "uom", "reorderPoint", "status"],
      validate: materialValidator(uomRows),
      readOnly: ["onHand"],
      // The first four materials stand for materials that BOMs and purchase orders already use.
      isInUse: (row) => ["COMP", "DOOR", "FOAM", "STEEL"].includes(row.code),
      onRemove: (row) => {
        for (let index = links.length - 1; index >= 0; index -= 1) if (links[index].materialId === row.id) links.splice(index, 1);
      },
      guard,
    }),
    ...createMockCrud("/master/suppliers", supplierRows, {
      searchFields: ["code", "name"],
      sortable: ["code", "name", "paymentTerms", "status"],
      validate: validateSupplier,
      isInUse: (row) => row.code === "S001" || row.code === "S002",
      onRemove: (row) => {
        for (let index = links.length - 1; index >= 0; index -= 1) if (links[index].supplierId === row.id) links.splice(index, 1);
      },
      guard,
    }),
    ...supplierMaterialRoutes({ guard, links, suppliers: supplierRows, materials: materialRows }),
    ...createMockCrud("/master/employees", sampleEmployees(), {
      searchFields: ["code", "name", "position"],
      sortable: ["code", "name", "position", "status"],
      validate: simpleValidator({ max: { position: 50 } }),
      guard,
    }),
  };
}
