// The access rules, in ONE place. The frontend asks `can(user, action)` to decide what to show, and the mock API asks the same to
// decide what to refuse; the real backend must enforce the same table on every request (docs/api, "Who may call").
//
// A user: { id, name, department, email, role }. `role` is "Admin" (everything) or "Worker". A Worker belongs to one department,
// "Sales" (a Sale Worker) or "Factory" (a Factory Worker), and the department decides what the Worker may do.

export const ROLES = ["Admin", "Worker"];
export const DEPARTMENTS = ["Sales", "Factory", "Accounting", "Administration"];
/** The departments a Worker may have. Accounting and Administration are not Worker departments (accounting stays Admin only). */
export const WORKER_DEPARTMENTS = ["Sales", "Factory"];

const ANYONE = "anyone"; // every signed-in user
const ADMIN = []; // only the Admin (no department)

/** action -> who may do it besides the Admin: ANYONE, or the departments of a Worker who may. */
export const ACTIONS = {
  "dashboard.view": ANYONE,

  "qt.use": ["Sales"], // see, make, print, confirm

  "orders.view": ANYONE,
  "orders.edit": ["Factory"], // add or change the processes (and the lines) of an order before the start
  "orders.start": ["Factory"], // start production (it deducts the stock)
  "orders.progress": ["Factory"], // record progress of a process
  "orders.evidence": ["Factory"], // upload or delete the evidence files of an order
  "orders.reopen": ADMIN, // change or reopen a Completed process

  "stock.view": ANYONE,
  "stock.change": ["Factory"], // Add / Deduct / Adjust a lot by hand
  "materials.write": ADMIN, // make or change a material itself

  "products.view": ANYONE,
  "products.write": ADMIN,

  "customers.view": ["Sales"],
  "customers.write": ADMIN,

  "suppliers.view": ["Factory"],
  "suppliers.write": ADMIN,
  "purchase.use": ["Factory"], // purchase orders: make, print, move the status, pay, files

  "invoices.use": ADMIN,
  "receipts.use": ADMIN,
  "users.use": ADMIN,
  "erDiagram.view": ADMIN, // the ER diagram page
  "dbRelations.view": ADMIN, // the DB relations page
  "flowChart.view": ADMIN, // the flow chart page
  "userFlow.view": ADMIN, // the user flow page
  "apisDiagram.view": ADMIN, // the APIs diagram page
  "contextDiagram.view": ADMIN, // the context diagram page
};

const isAdmin = (user) => user?.role === "Admin";

/** May this user do this action? The Admin may do everything; a Worker only what the department of the Worker is listed for. */
export function can(user, action) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  const rule = ACTIONS[action];
  if (rule === ANYONE) return true;
  return user.role === "Worker" && Array.isArray(rule) && rule.includes(user.department);
}
