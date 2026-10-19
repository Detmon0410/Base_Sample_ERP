// The users of the mock: the store behind the login, GET /auth/me and the token check.
// Passwords are kept in plain text here because this is only a stand-in for the backend.
// A user: { id, name, department, email, password, role: "Admin" | "Worker" }. A Worker is a Sale Worker (department Sales) or a Factory
// Worker (department Factory); the department decides the access (utils/permissions.js).

import { can } from "@/utils/permissions";

import { MockHttpError } from "./errors.js";

const STAMP = "2026-10-01T09:00:00.000Z";

export const mockUsers = [
  { id: 1, name: "Admin", department: "Administration", email: "admin@gmail.com", password: "admin", role: "Admin" },
  { id: 2, name: "Factory Worker", department: "Factory", email: "worker@gmail.com", password: "worker", role: "Worker" },
  { id: 3, name: "Sale Worker", department: "Sales", email: "sale@gmail.com", password: "sale", role: "Worker" },
].map((user) => ({ createdAt: STAMP, updatedAt: STAMP, lastLoginAt: null, sessionVersion: 0, ...user }));

/** What the app may see of a user (never the password). */
export function toPublicUser(user) {
  return { id: user.id, name: user.name, department: user.department, email: user.email, role: user.role };
}

/** The token of a user: the version of the session is part of it once it is not the first one. */
export const tokenOf = (user) => (user.sessionVersion ? `mock-token-${user.id}-${user.sessionVersion}` : `mock-token-${user.id}`);

// the other mock modules call each other with this token (a system call that is not a person)
const INTERNAL = { id: 0, name: "System", department: "Administration", role: "Admin" };
export const INTERNAL_TOKEN = "Bearer mock-internal";

export function userFromAuthorization(authorization) {
  if (authorization === INTERNAL_TOKEN) return INTERNAL;
  const match = /^Bearer mock-token-(\d+)(?:-(\d+))?$/.exec(authorization ?? "");
  const user = match && mockUsers.find((candidate) => candidate.id === Number(match[1]));
  if (!user || Number(match[2] ?? 0) !== user.sessionVersion) {
    throw new MockHttpError(401, "UNAUTHORIZED", "Authentication required");
  }
  return user;
}

export function requireAdmin(authorization) {
  const user = userFromAuthorization(authorization);
  if (user.role !== "Admin") throw new MockHttpError(403, "FORBIDDEN", "Admin only");
  return user;
}

/** The signed-in user, or 403 when the action (a key of ACTIONS in utils/permissions.js) is not for them. */
export function requireCan(authorization, action) {
  const user = userFromAuthorization(authorization);
  if (!can(user, action)) throw new MockHttpError(403, "FORBIDDEN", "Not allowed");
  return user;
}

export function login({ email, password }) {
  const user = mockUsers.find((candidate) => candidate.email.toLowerCase() === String(email ?? "").trim().toLowerCase() && candidate.password === password);
  if (!user) throw new MockHttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  user.lastLoginAt = new Date().toISOString();
  return { token: tokenOf(user), user: toPublicUser(user) };
}
