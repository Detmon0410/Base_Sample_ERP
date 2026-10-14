import { masterRoutes } from "./master.js";
import { qtRoutes } from "./qt.js";
import { invoiceRoutes } from "./invoices.js";
import { orderRoutes } from "./orders.js";
import { stockRoutes } from "./stock.js";
import { deleteRoutes } from "./deletes.js";
import { dashboardRoutes } from "./dashboard.js";
import { PERSIST } from "./persist.js";
import { seedMock } from "./seed.js";
import { login, toPublicUser, userFromAuthorization } from "./users.js";

// Local stand-in for the backend while it does not exist yet (VITE_USE_MOCK=true).

export const mockRoutes = {
  "POST /auth/login": ({ body }) => login(body),

  "GET /auth/me": ({ authorization }) => toPublicUser(userFromAuthorization(authorization)),

  "POST /auth/logout": () => null,

  ...masterRoutes,
  ...qtRoutes,
  ...orderRoutes,
  ...invoiceRoutes,
  ...dashboardRoutes,
  ...deleteRoutes,
  ...stockRoutes, // after masterRoutes and orderRoutes: it wraps POST of /materials and the start of an order
};

if (PERSIST) seedMock(mockRoutes); // the browser starts with some data; the tests start empty
