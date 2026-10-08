// The users of the mock: the store behind the login, GET /auth/me, the token check and the Admin pages
// (docs/specs/f11-users.md). Passwords are kept in plain text here because this is only a stand-in for the backend.

import { MockHttpError, MockResponse } from "./errors.js";
import { EMPTY_SEED } from "./seedMode.js";
import { THAI_PEOPLE } from "./thai.js";

const SEED = [
  {
    id: 1,
    name: "Demo Admin",
    email: "admin@gmail.com",
    password: "admin",
    status: "active",
    memberships: [{ department: null, role: "Admin" }],
  },
  {
    id: 2,
    name: "Alice Sato",
    email: "alice@kanou.test",
    password: "alice1234",
    status: "active",
    memberships: [
      { department: "Sale", role: "Manager" },
      { department: "Purchase", role: "Worker" },
    ],
  },
  {
    id: 3,
    name: "Bob Tanaka",
    email: "bob@kanou.test",
    password: "bob12345",
    status: "inactive",
    memberships: [{ department: "Factory", role: "Worker" }],
  },
  {
    id: 5,
    name: "Nina Sato",
    email: "nina@kanou.test",
    password: "nina1234",
    status: "active",
    memberships: [{ department: "Sale", role: "Worker" }],
  },
  {
    id: 4,
    name: "Ken Suzuki",
    email: "ken@kanou.test",
    password: "ken12345",
    status: "active",
    memberships: [{ department: "Factory", role: "Worker" }],
  },
  {
    id: 6,
    name: "Yuki Tanaka",
    email: "yuki@kanou.test",
    password: "yuki1234",
    status: "active",
    memberships: [{ department: "Factory", role: "Manager" }],
  },
  {
    id: 7,
    name: "Hana Ito",
    email: "hana@kanou.test",
    password: "hana1234",
    status: "active",
    memberships: [{ department: "Purchase", role: "Manager" }],
  },
  {
    id: 8,
    name: "Mika Ono",
    email: "mika@kanou.test",
    password: "mika1234",
    status: "active",
    memberships: [{ department: "Accounting", role: "Manager" }],
  },
  {
    id: 9,
    name: "Sora Kato",
    email: "sora@kanou.test",
    password: "sora1234",
    status: "active",
    memberships: [{ department: "Accounting", role: "Worker" }],
  },
];
// the nine demo users have all worked with documents, so they cannot be deleted (R5); a token carries the version of the
// session: a password reset or a deactivation ends every older token
const STAMP = "2026-09-01T09:00:00.000Z";
// The workflow test (docs/specs/f13-workflow-test.md): an Admin and a Manager and a Worker for every department, all with the
// password "test1234" (the Admin keeps "admin"), who have never signed in.
const TEST_USERS = [
  { id: 1, name: THAI_PEOPLE["admin@gmail.com"], email: "admin@gmail.com", password: "admin", status: "active", memberships: [{ department: null, role: "Admin" }] },
  ...["Sale", "Factory", "Purchase", "Accounting"].flatMap((department, index) =>
    ["Manager", "Worker"].map((role, roleIndex) => ({
      id: 2 + index * 2 + roleIndex,
      name: THAI_PEOPLE[`${department.toLowerCase()}.${role.toLowerCase()}@kanou.test`] ?? `${department} ${role}`,
      email: `${department.toLowerCase()}.${role.toLowerCase()}@kanou.test`,
      password: "test1234",
      status: "active",
      memberships: [{ department, role }],
    })),
  ),
];
export const mockUsers = EMPTY_SEED
  ? TEST_USERS.map((user) => ({ createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastLoginAt: null, hasActivity: false, sessionVersion: 0, ...user }))
  : SEED.map((user) => ({ createdAt: STAMP, updatedAt: STAMP, lastLoginAt: user.id === 1 ? null : "2026-10-06T08:30:00.000Z", hasActivity: true, sessionVersion: 0, ...user }));

export const DEPARTMENTS = ["Sale", "Factory", "Purchase", "Accounting"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isAdminUser = (user) => user.memberships.some((membership) => membership.role === "Admin");
const activeAdmins = () => mockUsers.filter((user) => user.status === "active" && isAdminUser(user));

/** What the app may see of a user (never the password). */
export function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, status: user.status, memberships: user.memberships };
}

/** The token of a user: the version of the session is part of it once it is not the first one. */
export const tokenOf = (user) => (user.sessionVersion ? `mock-token-${user.id}-${user.sessionVersion}` : `mock-token-${user.id}`);

// the other mock modules call each other with this token (a system call that is not a person)
const INTERNAL = { id: 0, name: "System", status: "active", memberships: [{ department: null, role: "Admin" }] };
export const INTERNAL_TOKEN = "Bearer mock-internal";

export function userFromAuthorization(authorization) {
  if (authorization === INTERNAL_TOKEN) return INTERNAL;
  const match = /^Bearer mock-token-(\d+)(?:-(\d+))?$/.exec(authorization ?? "");
  const user = match && mockUsers.find((candidate) => candidate.id === Number(match[1]));
  if (!user || user.status !== "active" || Number(match[2] ?? 0) !== user.sessionVersion) {
    throw new MockHttpError(401, "UNAUTHORIZED", "Authentication required");
  }
  return user;
}

export function requireAdmin(authorization) {
  const user = userFromAuthorization(authorization);
  if (!isAdminUser(user)) throw new MockHttpError(403, "FORBIDDEN", "Admin only");
  return user;
}

export function login({ email, password }) {
  const user = mockUsers.find((candidate) => candidate.email.toLowerCase() === String(email ?? "").trim().toLowerCase() && candidate.password === password);
  if (!user) throw new MockHttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  if (user.status !== "active") throw new MockHttpError(403, "ACCOUNT_INACTIVE", "Account is inactive");
  user.lastLoginAt = new Date().toISOString();
  return { token: tokenOf(user), user: toPublicUser(user) };
}

// ---- validation (R1, R2) ----
const invalid = (path, message = "INVALID") => ({ path: [path], message });
const passwordOk = (value) => typeof value === "string" && value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
function checkMemberships(memberships, errors) {
  if (!Array.isArray(memberships) || memberships.length === 0) {
    errors.push(invalid("memberships", "REQUIRED"));
    return;
  }
  const departments = new Set();
  memberships.forEach((row, index) => {
    if (row.role === "Admin") {
      if (row.department != null || memberships.length > 1) errors.push({ path: ["memberships", index, "role"], message: "ADMIN_ALONE" });
    } else if (!["Manager", "Worker"].includes(row.role)) {
      errors.push({ path: ["memberships", index, "role"], message: "REQUIRED" });
    } else if (!DEPARTMENTS.includes(row.department)) {
      errors.push({ path: ["memberships", index, "department"], message: "REQUIRED" });
    } else if (departments.has(row.department)) {
      errors.push({ path: ["memberships", index, "department"], message: "DUPLICATE" });
    } else {
      departments.add(row.department);
    }
  });
}
function checkBody(body, errors, { creating, existing }) {
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (!name) errors.push(invalid("name", "REQUIRED"));
  else if (name.length > 100) errors.push(invalid("name", "TOO_LONG"));
  if (!email) errors.push(invalid("email", "REQUIRED"));
  else if (!EMAIL.test(email)) errors.push(invalid("email", "INVALID_EMAIL"));
  if (creating && !passwordOk(body.password)) errors.push(invalid("password", body.password ? "WEAK_PASSWORD" : "REQUIRED"));
  checkMemberships(body.memberships, errors);
  if (email && EMAIL.test(email) && mockUsers.some((user) => user.email.toLowerCase() === email.toLowerCase() && user.id !== existing?.id)) {
    throw new MockHttpError(409, "EMAIL_ALREADY_EXISTS", "This e-mail is already used");
  }
}
const fail = (errors) => {
  if (errors.length) throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", errors);
};

function shape(user, me) {
  return { id: user.id, name: user.name, email: user.email, status: user.status, memberships: user.memberships, createdAt: user.createdAt, updatedAt: user.updatedAt, lastLoginAt: user.lastLoginAt, hasActivity: user.hasActivity || Boolean(user.lastLoginAt), isSelf: user.id === me.id };
}
const matches = (value, text) => String(value ?? "").toLowerCase().includes(text);

/** The Admin routes: /admin/users (U1, U2). Everything is Admin only. */
export function usersRoutes() {
  let nextId = Math.max(...mockUsers.map((user) => user.id)) + 1;
  const find = (id) => {
    const user = mockUsers.find((row) => row.id === Number(id));
    if (!user) throw new MockHttpError(404, "NOT_FOUND", "Record not found");
    return user;
  };
  // R3 / R4: nobody takes the Admin away from themselves, and the last active Admin stays
  const guardAdmin = (user, me, { losesAdmin }) => {
    if (!isAdminUser(user) || !losesAdmin) return;
    if (user.id === me.id) throw new MockHttpError(409, "CANNOT_CHANGE_SELF", "You cannot do this to your own account");
    if (activeAdmins().filter((row) => row.id !== user.id).length === 0) throw new MockHttpError(409, "LAST_ADMIN", "This is the last active Admin");
  };

  return {
    "GET /admin/users": ({ authorization, query }) => {
      const me = requireAdmin(authorization);
      const text = String(query.q ?? "").trim().toLowerCase();
      const status = query.status && query.status !== "all" ? query.status : null;
      let rows = mockUsers.filter(
        (user) =>
          (!status || user.status === status) &&
          (!query.department || user.memberships.some((row) => row.department === query.department)) &&
          (!query.role || user.memberships.some((row) => row.role === query.role)) &&
          (!text || matches(user.name, text) || matches(user.email, text)),
      );
      const sortKey = String(query.sort ?? "name");
      const descending = sortKey.startsWith("-");
      const field = descending ? sortKey.slice(1) : sortKey;
      if (["name", "email", "status", "lastLoginAt"].includes(field)) {
        rows = [...rows].sort((a, b) => {
          const left = a[field];
          const right = b[field];
          let order;
          if (left == null) order = right == null ? 0 : 1;
          else if (right == null) order = -1;
          else order = String(left).localeCompare(String(right));
          return (descending ? -order : order) || a.id - b.id;
        });
      }
      const pageSize = Math.min(Number(query.pageSize) || 20, 100);
      const total = rows.length;
      const page = Math.min(Math.max(Number(query.page) || 1, 1), Math.max(1, Math.ceil(total / pageSize)));
      return new MockResponse({ data: rows.slice((page - 1) * pageSize, page * pageSize).map((user) => shape(user, me)), meta: { page, pageSize, total } });
    },
    "GET /admin/users/:id": ({ authorization, params }) => {
      const me = requireAdmin(authorization);
      return shape(find(params.id), me);
    },
    "POST /admin/users": ({ authorization, body }) => {
      const me = requireAdmin(authorization);
      const errors = [];
      checkBody(body, errors, { creating: true });
      fail(errors);
      const now = new Date().toISOString();
      const user = { id: nextId++, name: String(body.name).trim(), email: String(body.email).trim(), password: body.password, status: "active", memberships: body.memberships.map((row) => ({ department: row.role === "Admin" ? null : row.department, role: row.role })), createdAt: now, updatedAt: now, lastLoginAt: null, hasActivity: false, sessionVersion: 0 };
      mockUsers.push(user);
      return new MockResponse({ data: shape(user, me), status: 201, message: "Created" });
    },
    "PUT /admin/users/:id": ({ authorization, params, body }) => {
      const me = requireAdmin(authorization);
      const user = find(params.id);
      const errors = [];
      checkBody(body, errors, { creating: false, existing: user });
      fail(errors);
      guardAdmin(user, me, { losesAdmin: !body.memberships.some((row) => row.role === "Admin") });
      Object.assign(user, { name: String(body.name).trim(), email: String(body.email).trim(), memberships: body.memberships.map((row) => ({ department: row.role === "Admin" ? null : row.department, role: row.role })), updatedAt: new Date().toISOString() });
      return shape(user, me);
    },
    "POST /admin/users/:id/reset-password": ({ authorization, params, body }) => {
      const me = requireAdmin(authorization);
      const user = find(params.id);
      if (user.id === me.id) throw new MockHttpError(409, "CANNOT_CHANGE_SELF", "You cannot do this to your own account");
      if (!passwordOk(body.password)) throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [invalid("password", body.password ? "WEAK_PASSWORD" : "REQUIRED")]);
      user.password = body.password;
      user.sessionVersion += 1; // the open sessions of the user end
      user.updatedAt = new Date().toISOString();
      return shape(user, me);
    },
    "PATCH /admin/users/:id/status": ({ authorization, params, body }) => {
      const me = requireAdmin(authorization);
      const user = find(params.id);
      if (!["active", "inactive"].includes(body.status)) throw new MockHttpError(400, "VALIDATION_ERROR", "Validation failed", [invalid("status")]);
      guardAdmin(user, me, { losesAdmin: body.status === "inactive" });
      user.status = body.status;
      user.updatedAt = new Date().toISOString();
      return shape(user, me);
    },
    "DELETE /admin/users/:id": ({ authorization, params }) => {
      const me = requireAdmin(authorization);
      const user = find(params.id);
      guardAdmin(user, me, { losesAdmin: true });
      if (user.id === me.id) throw new MockHttpError(409, "CANNOT_CHANGE_SELF", "You cannot do this to your own account");
      if (user.hasActivity || user.lastLoginAt) throw new MockHttpError(409, "IN_USE", "This user has documents; deactivate instead");
      mockUsers.splice(mockUsers.indexOf(user), 1);
      return null;
    },
  };
}
