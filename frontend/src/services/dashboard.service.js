import { api, unwrap } from "./api.js";

/**
 * Dashboard overview for all departments (docs/api/dashboard.md).
 * Each block is data, or `null` with its name in `errors` when only that block failed.
 */
export async function getDashboard() {
  return unwrap(await api.get("/dashboard"));
}
