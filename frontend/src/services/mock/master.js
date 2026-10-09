// The master data of the mock: customers, products (with the BOM), materials (with the lots) and users
// (docs/specs/s1-mini-erp-workflow.md, section 4). The four calls of every resource:
//   GET list, GET :id, POST, PUT :id          (master data has no status and is never deleted)
// List params: { q, page, pageSize }  ->  data: [...], meta: { page, pageSize, total }
// `withStatus` (a QT reference) adds PATCH :id/status and the status filter: the record is made inactive or active again.

import { MockHttpError, MockResponse } from "./errors.js";
import { mockUsers, toPublicUser, userFromAuthorization } from "./users.js";
import { DEPARTMENTS, ROLES } from "@/utils/permissions";

const stamp = () => new Date().toISOString();
export const text = (value) => String(value ?? "").trim();
export const number = (value) => (value === "" || value === null || value === undefined ? NaN : Number(value));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const invalid = (issues) => {
  throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", issues);
};
export const issue = (field, code) => ({ path: field.split("."), code });

/** Builds the routes of one resource. `normalize(body, record)` returns the clean fields or throws through `invalid`. */
export function resource({ path, store, readRoles, normalize, unique = [], searchIn, toView = (record) => record, toListView = toView, withStatus = false }) {
  let nextId = store.reduce((max, record) => Math.max(max, record.id), 0) + 1;

  const access = (authorization, write) => {
    const user = userFromAuthorization(authorization);
    if ((write || !readRoles.includes(user.role)) && user.role !== "Admin") throw new MockHttpError(403, "FORBIDDEN", "Not allowed");
    return user;
  };
  const find = (id) => {
    const record = store.find((item) => item.id === Number(id));
    if (!record) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
    return record;
  };
  const checkUnique = (data, self) => {
    const issues = [];
    for (const field of unique) {
      const same = store.find((item) => item.id !== self?.id && String(item[field]).toLowerCase() === String(data[field]).toLowerCase());
      if (same) issues.push(issue(field, "DUPLICATE"));
    }
    if (issues.length) throw new MockHttpError(409, "DUPLICATE_VALUE", "Already used", issues);
  };

  return {
    [`GET ${path}`]: ({ authorization, query }) => {
      access(authorization, false);
      const q = text(query.q).toLowerCase();
      let rows = store.filter((record) => (!withStatus || !query.status || record.status === query.status) && (!q || searchIn.some((field) => String((typeof field === "function" ? field(record) : record[field]) ?? "").toLowerCase().includes(q))));
      rows = [...rows].sort((a, b) => b.id - a.id);
      const pageSize = Math.max(1, Number(query.pageSize) || 20);
      const page = Math.max(1, Number(query.page) || 1);
      return new MockResponse({ data: rows.slice((page - 1) * pageSize, page * pageSize).map(toListView), meta: { page, pageSize, total: rows.length } });
    },
    [`GET ${path}/:id`]: ({ authorization, params }) => {
      access(authorization, false);
      return toView(find(params.id));
    },
    [`POST ${path}`]: ({ authorization, body }) => {
      access(authorization, true);
      const data = normalize(body, null);
      checkUnique(data, null);
      const record = { id: nextId++, status: "active", createdAt: stamp(), updatedAt: stamp(), ...data };
      store.push(record);
      return new MockResponse({ data: toView(record), status: 201 });
    },
    [`PUT ${path}/:id`]: ({ authorization, params, body }) => {
      access(authorization, true);
      const record = find(params.id);
      const data = normalize(body, record);
      checkUnique(data, record);
      Object.assign(record, data, { updatedAt: stamp() });
      return toView(record);
    },
    ...(withStatus
      ? {
          [`PATCH ${path}/:id/status`]: ({ authorization, params, body }) => {
            access(authorization, true);
            const record = find(params.id);
            if (!["active", "inactive"].includes(body.status)) invalid([issue("status", "INVALID")]);
            record.status = body.status;
            record.updatedAt = stamp();
            return toView(record);
          },
        }
      : {}),
  };
}

export const customers = [];
export const products = [];
export const materials = [];

const customerRoutes = resource({
  path: "/customers",
  store: customers,
  readRoles: ["Admin"],
  searchIn: ["name", "email", "telephone"],
  normalize: (body) => {
    const data = { name: text(body.name), address: text(body.address), email: text(body.email), telephone: text(body.telephone) };
    const issues = [];
    if (!data.name) issues.push(issue("name", "REQUIRED"));
    if (data.email && !EMAIL.test(data.email)) issues.push(issue("email", "INVALID"));
    if (issues.length) invalid(issues);
    return data;
  },
});

const productRoutes = resource({
  path: "/products",
  store: products,
  readRoles: ["Admin", "Worker"],
  unique: ["code"],
  searchIn: ["code", "name"],
  normalize: (body) => {
    const data = { code: text(body.code), name: text(body.name), price: number(body.price), bom: [] };
    const issues = [];
    if (!data.code) issues.push(issue("code", "REQUIRED"));
    if (!data.name) issues.push(issue("name", "REQUIRED"));
    if (!(data.price >= 0)) issues.push(issue("price", "INVALID"));
    (Array.isArray(body.bom) ? body.bom : []).forEach((line, index) => {
      const materialId = Number(line.materialId);
      const quantity = number(line.quantity);
      if (!materials.some((material) => material.id === materialId)) issues.push(issue(`bom.${index}.materialId`, "REQUIRED"));
      if (!(quantity > 0)) issues.push(issue(`bom.${index}.quantity`, "INVALID"));
      data.bom.push({ materialId, quantity });
    });
    if (new Set(data.bom.map((line) => line.materialId)).size < data.bom.length) issues.push(issue("bom", "DUPLICATE"));
    if (issues.length) invalid(issues);
    return data;
  },
});

const materialRoutes = resource({
  path: "/materials",
  store: materials,
  readRoles: ["Admin", "Worker"],
  unique: ["code"],
  searchIn: ["code", "name"],
  normalize: (body) => {
    const data = { code: text(body.code), name: text(body.name), lots: [] };
    const issues = [];
    if (!data.code) issues.push(issue("code", "REQUIRED"));
    if (!data.name) issues.push(issue("name", "REQUIRED"));
    (Array.isArray(body.lots) ? body.lots : []).forEach((lot, index) => {
      const lotNumber = text(lot.lotNumber);
      const quantity = number(lot.quantity);
      if (!lotNumber) issues.push(issue(`lots.${index}.lotNumber`, "REQUIRED"));
      if (!(quantity >= 0)) issues.push(issue(`lots.${index}.quantity`, "INVALID"));
      data.lots.push({ lotNumber, quantity });
    });
    if (new Set(data.lots.map((lot) => lot.lotNumber.toLowerCase())).size < data.lots.length) issues.push(issue("lots", "DUPLICATE"));
    if (issues.length) invalid(issues);
    return data;
  },
});

const userRoutes = resource({
  path: "/users",
  store: mockUsers,
  readRoles: ["Admin"],
  unique: ["email"],
  searchIn: ["name", "email", "department"],
  toView: (user) => ({ ...toPublicUser(user), createdAt: user.createdAt, lastLoginAt: user.lastLoginAt }),
  normalize: (body, record) => {
    const data = { name: text(body.name), department: text(body.department), email: text(body.email).toLowerCase(), role: text(body.role) };
    const password = String(body.password ?? "");
    const issues = [];
    if (!data.name) issues.push(issue("name", "REQUIRED"));
    if (!DEPARTMENTS.includes(data.department)) issues.push(issue("department", "REQUIRED"));
    if (!data.email) issues.push(issue("email", "REQUIRED"));
    else if (!EMAIL.test(data.email)) issues.push(issue("email", "INVALID"));
    if (!ROLES.includes(data.role)) issues.push(issue("role", "REQUIRED"));
    if (!record && !password) issues.push(issue("password", "REQUIRED"));
    else if (password && password.length < 6) issues.push(issue("password", "TOO_SHORT"));
    if (issues.length) invalid(issues);
    if (password) {
      data.password = password;
      if (record) data.sessionVersion = record.sessionVersion + 1; // a new password ends the sessions of that user
    }
    if (!record) Object.assign(data, { lastLoginAt: null, sessionVersion: 0 });
    return data;
  },
});

export const masterRoutes = { ...customerRoutes, ...productRoutes, ...materialRoutes, ...userRoutes };
