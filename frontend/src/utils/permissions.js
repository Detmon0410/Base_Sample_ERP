// Client-side mirror of user_account_req.md. This only decides what the UI shows;
// the backend must enforce the same rules on every request.

export const DEPARTMENTS = ["Sale", "Factory", "Purchase", "Accounting"];

export function isAdmin(user) {
  return user?.memberships?.some((membership) => membership.role === "Admin") ?? false;
}

/** Admin bypasses the department check; everyone else needs a membership. */
export function canAccessDepartment(user, department) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return user.memberships?.some((membership) => membership.department === department) ?? false;
}

/** Approval rights: Admin everywhere, Manager only in their own department(s). */
export function canApprove(user, department) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return (
    user.memberships?.some(
      (membership) => membership.department === department && membership.role === "Manager",
    ) ?? false
  );
}

/**
 * The role the user has in a department: "Admin" (everywhere), "Manager", "Worker", or null when the
 * user has no role there. The UI uses it to decide which buttons to show.
 */
export function roleInDepartment(user, department) {
  if (!user) return null;
  if (isAdmin(user)) return "Admin";
  const membership = user.memberships?.find((item) => item.department === department);
  return membership?.role ?? null;
}

/** True when the user belongs to at least one department (Admin counts as all). */
export function hasAnyDepartment(user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return user.memberships?.some((membership) => Boolean(membership.department)) ?? false;
}

/** True when the user can approve in at least one department (Admin, or Manager somewhere). */
export function canApproveAnywhere(user) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return user.memberships?.some((membership) => membership.role === "Manager") ?? false;
}

/**
 * Generic rule used by the menu and the route guards:
 *   { type: "everyone" }
 *   { type: "departments", departments: ["Factory", "Purchase"] }   any one of them
 *   { type: "anyDepartment" }
 *   { type: "admin" }
 */
export function canUse(user, access) {
  if (!user || !access) return false;
  switch (access.type) {
    case "everyone":
      return true;
    case "admin":
      return isAdmin(user);
    case "anyDepartment":
      return hasAnyDepartment(user);
    case "departments":
      return access.departments.some((department) => canAccessDepartment(user, department));
    default:
      return false;
  }
}
