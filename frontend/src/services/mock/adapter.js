import { AxiosError } from "axios";

import { MockHttpError } from "./errors.js";
import { mockRoutes } from "./routes.js";

const LATENCY_MS = 400;

function respond(config, status, body) {
  return {
    data: body,
    status,
    statusText: status < 400 ? "OK" : "Error",
    headers: {},
    config,
    request: {},
  };
}

/**
 * Axios adapter that answers requests from `mockRoutes` using the same
 * `{ success, data, message }` / `{ success: false, message, error }` envelopes
 * as the real API, so services and pages do not know the difference.
 */
export async function mockAdapter(config) {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const method = (config.method ?? "get").toUpperCase();
  const path = (config.url ?? "").split("?")[0];
  const handler = mockRoutes[`${method} ${path}`];

  const fail = (status, error, message) => {
    const response = respond(config, status, { success: false, message, error });
    throw new AxiosError(message, String(status), config, response.request, response);
  };

  if (!handler) {
    fail(404, "ROUTE_NOT_FOUND", "Route not found");
  }

  try {
    const body = typeof config.data === "string" ? JSON.parse(config.data) : (config.data ?? {});
    const authorization = config.headers?.Authorization ?? config.headers?.get?.("Authorization");
    const result = handler({ body, authorization });
    return respond(config, 200, { success: true, data: result ?? null });
  } catch (error) {
    if (error instanceof MockHttpError) {
      fail(error.status, error.code, error.message);
    }
    throw error;
  }
}
