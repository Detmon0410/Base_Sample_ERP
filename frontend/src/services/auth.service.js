import { api, unwrap } from "./api.js";

/** @returns {Promise<{ token: string, user: object }>} */
export async function login({ email, password }) {
  return unwrap(await api.post("/auth/login", { email, password }));
}

/** @returns {Promise<object>} the logged-in user with `memberships[{ department, role }]` */
export async function getCurrentUser() {
  return unwrap(await api.get("/auth/me"));
}

export async function logout() {
  await api.post("/auth/logout");
}
