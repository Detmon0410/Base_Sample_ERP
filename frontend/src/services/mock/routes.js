import { buildDashboard } from "./dashboard.js";
import { MockHttpError } from "./errors.js";
import { masterDataRoutes } from "./masterData.js";
import { saleRoutes } from "./sale.js";

// Local stand-in for the backend while it does not exist yet (VITE_USE_MOCK=true).
// The data below is demo-only; replace these handlers with the real API later.


const mockUsers = [
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
];

function toPublicUser(user) {
  const { password: _password, ...publicUser } = user;
  return publicUser;
}

function userFromAuthorization(authorization) {
  const match = /^Bearer mock-token-(\d+)$/.exec(authorization ?? "");
  const user = match && mockUsers.find((candidate) => candidate.id === Number(match[1]));
  if (!user || user.status !== "active") {
    throw new MockHttpError(401, "UNAUTHORIZED", "Authentication required");
  }
  return user;
}

/** Any signed-in user. */
function requireUser(authorization) {
  return userFromAuthorization(authorization);
}

function requireAdmin(authorization) {
  const user = userFromAuthorization(authorization);
  if (!user.memberships.some((membership) => membership.role === "Admin")) {
    throw new MockHttpError(403, "FORBIDDEN", "Admin only");
  }
  return user;
}

let masterStore = null;

export const mockRoutes = {
  "POST /auth/login": ({ body }) => {
    const user = mockUsers.find(
      (candidate) =>
        candidate.email.toLowerCase() === String(body.email ?? "").trim().toLowerCase() &&
        candidate.password === body.password,
    );
    if (!user) {
      throw new MockHttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    if (user.status !== "active") {
      throw new MockHttpError(403, "ACCOUNT_INACTIVE", "Account is inactive");
    }
    return { token: `mock-token-${user.id}`, user: toPublicUser(user) };
  },

  "GET /auth/me": ({ authorization }) => toPublicUser(userFromAuthorization(authorization)),

  "POST /auth/logout": () => null,

  "GET /dashboard": ({ authorization }) => buildDashboard(userFromAuthorization(authorization)),

  // Master data is maintained by Admin only (F3 spec, Q6/Q7).
  ...masterDataRoutes(requireAdmin, requireUser, (store) => {
    masterStore = store;
  }),

  // Sale documents: Sale department members and Admin (the role decides what they may press).
  ...saleRoutes({ userFromAuthorization, getStore: () => masterStore }),
};
