import { masterRoutes } from "./master.js";
import { qtRoutes } from "./qt.js";
import { orderRoutes } from "./orders.js";
import { login, toPublicUser, userFromAuthorization } from "./users.js";

// Local stand-in for the backend while it does not exist yet (VITE_USE_MOCK=true).
// Each module of docs/specs/s1-mini-erp-workflow.md adds its routes here.

export const mockRoutes = {
  "POST /auth/login": ({ body }) => login(body),

  "GET /auth/me": ({ authorization }) => toPublicUser(userFromAuthorization(authorization)),

  "POST /auth/logout": () => null,

  ...masterRoutes,
  ...qtRoutes,
  ...orderRoutes,
};
