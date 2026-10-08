import { api, unwrap } from "./api.js";

/** GET /notifications: how many documents wait for the department of the signed-in user (docs/specs/f13-workflow-test.md). */
export const getNotifications = async () => unwrap(await api.get("/notifications"));
