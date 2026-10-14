// Client-side mirror of the access rules. This only decides what the UI shows;
// the backend must enforce the same rules on every request.
//
// A user: { id, name, department, email, role }. There are two roles: "Admin" (everything) and "Worker" (production orders,
// progress, and a read-only look at products and materials). The department is only a field of the user.

export const ROLES = ["Admin", "Worker"];
export const DEPARTMENTS = ["Sales", "Factory", "Accounting", "Administration"];

export const isAdmin = (user) => user?.role === "Admin";

/** `roles` is the list of roles that may use something; no list means every signed-in user. */
export function canUse(user, roles) {
  if (!user) return false;
  return !roles || roles.includes(user.role);
}
