import { forbidden } from "./errors.js";

// Access by role and department: docs/api/auth.md
export const isAdmin = (u) => u.role === "Admin";
const isWorkerIn = (u, dept) => u.role === "Worker" && u.department === dept;
export const isSales = (u) => isWorkerIn(u, "Sales");
export const isFactory = (u) => isWorkerIn(u, "Factory");

export const can = {
  admin: (u) => isAdmin(u),
  adminOrSales: (u) => isAdmin(u) || isSales(u),
  adminOrFactory: (u) => isAdmin(u) || isFactory(u),
  everyone: () => true
};

export function assert(user, rule) {
  if (!rule(user)) throw forbidden();
}

// Express middleware: the role check comes before any lookup of the record
export const requires = (rule) => (req, res, next) => {
  try {
    assert(req.user, rule);
    next();
  } catch (e) {
    next(e);
  }
};
