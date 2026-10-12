import { api, unwrap } from "./api.js";

/**
 * The numbers of the Dashboard in one call: { orders: { New, InProgress, Completed }, inProgress: [...], leastStock: [...],
 * invoicing: { unpaid, paidThisMonth, months, unpaidList } | null }  (null for a Worker). See docs/api/dashboard.md.
 */
export const getDashboard = async () => unwrap(await api.get("/dashboard"));
