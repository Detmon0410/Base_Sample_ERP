// The look of a role and of a department (docs/specs/f12-requirements-2.md, N8). The hat colours follow the safety helmet
// colours of a factory: white = manager / supervisor, yellow = general worker. The other colours of the helmet chart
// tell the departments apart. The role is always written in words too; colour is only a help.

/** Colour of the hat icon of a role. The white hat is filled white with a grey outline so it shows on any background. */
export const ROLE_HATS = {
  Admin: "text-red-600", // red: the system owner
  Manager: "fill-white text-slate-500", // white: manager
  Worker: "text-yellow-500", // yellow: general staff
};

/** The highest role of a user: Admin, then Manager, then Worker. */
export function topRole(user) {
  const roles = (user?.memberships ?? []).map((membership) => membership.role);
  return ["Admin", "Manager", "Worker"].find((role) => roles.includes(role)) ?? null;
}
