import { api, unwrap } from "./api.js";

/** The numbers of the Summary page: { orders: { New, InProgress, Completed }, unpaidInvoices: { count, total } | null } */
export const getSummary = async () => unwrap(await api.get("/summary"));
