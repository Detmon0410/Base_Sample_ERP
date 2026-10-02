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
  const { searchFields, sortable, validate, isInUse = () => false, guard } = options;
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
      const row = { ...body, code: String(body.code).trim(), id: nextId++, status: "active", createdAt: now, updatedAt: now };
      rows.push(row);
      return new MockResponse({ data: row, status: 201, message: "Created" });
    },

    [`PUT ${basePath}/:id`]: ({ authorization, params, body }) => {
      guard(authorization);
      const row = find(params.id);
      // The code is fixed after creation: it is ignored on update.
      checkBody({ ...body, code: row.code }, row.id);
      Object.assign(row, body, { id: row.id, code: row.code, status: row.status, updatedAt: new Date().toISOString() });
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

/** Master data routes. `guard` throws 401/403 unless the caller is an Admin (Q6/Q7). */
export function masterDataRoutes(guard) {
  const customers = sampleCustomers();
  return {
    ...createMockCrud("/master/customers", customers, {
      searchFields: ["code", "name"],
      sortable: ["code", "name", "paymentTerms", "creditLimit", "status"],
      validate: validateCustomer,
      // C001 and C002 stand for customers that already have Sale Orders.
      isInUse: (row) => row.code === "C001" || row.code === "C002",
      guard,
    }),
  };
}
