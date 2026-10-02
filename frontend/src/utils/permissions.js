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
