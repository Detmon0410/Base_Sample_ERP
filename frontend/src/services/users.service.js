import { api, unwrap } from "./api.js";
import { createCrud } from "./crud.js";

/**
 * Users (docs/specs/f11-users.md), Admin only. The password is only sent, never returned.
 *   resetPassword(id, password)  ->  POST /admin/users/:id/reset-password
 */
export const userService = {
  ...createCrud("/admin/users"),
  resetPassword: async (id, password) => unwrap(await api.post(`/admin/users/${id}/reset-password`, { password })),
};
