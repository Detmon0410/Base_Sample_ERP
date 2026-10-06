import { AxiosError } from "axios";

import { MockHttpError, MockResponse } from "./errors.js";
import { mockRoutes } from "./routes.js";

// no waiting in tests (vitest sets MODE to "test")
const LATENCY_MS = import.meta.env.MODE === "test" ? 0 : 150;

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

/** Finds the handler for "METHOD /path"; routes like "GET /master/customers/:id" match any id. */
function findRoute(method, path) {
  const exact = mockRoutes[`${method} ${path}`];
  if (exact) return { handler: exact, params: {} };

  for (const [key, handler] of Object.entries(mockRoutes)) {
    const [routeMethod, pattern] = key.split(" ");
    if (routeMethod !== method || !pattern.includes(":")) continue;
    const names = [];
    const regex = new RegExp(
      `^${pattern.replace(/:([A-Za-z]+)/g, (_, name) => {
        names.push(name);
        return "([^/]+)";
      })}$`,
    );
    const match = regex.exec(path);
    if (match) {
      return {
        handler,
        params: Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])])),
      };
    }
  }
  return null;
}

/**
 * Axios adapter that answers requests from `mockRoutes` using the same
 * `{ success, data, meta?, message? }` / `{ success: false, message, error, errors? }` envelopes
 * as the real API, so services and pages do not know the difference.
 */
export async function mockAdapter(config) {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const method = (config.method ?? "get").toUpperCase();
  const path = (config.url ?? "").split("?")[0];
  const route = findRoute(method, path);

  const fail = (status, error, message, details) => {
    const response = respond(config, status, {
      success: false,
      message,
      error,
      ...(details ? { errors: details } : {}),
    });
    throw new AxiosError(message, String(status), config, response.request, response);
  };

  if (!route) {
    fail(404, "ROUTE_NOT_FOUND", "Route not found");
  }

  try {
    const body = typeof config.data === "string" ? JSON.parse(config.data) : (config.data ?? {});
    const authorization = config.headers?.Authorization ?? config.headers?.get?.("Authorization");
    const result = route.handler({ body, authorization, params: route.params, query: config.params ?? {} });

    if (result instanceof MockResponse) {
      return respond(config, result.status, {
        success: true,
        data: result.data,
        ...(result.meta ? { meta: result.meta } : {}),
        ...(result.message ? { message: result.message } : {}),
      });
    }
    return respond(config, 200, { success: true, data: result ?? null });
  } catch (error) {
    if (error instanceof MockHttpError) {
      fail(error.status, error.code, error.message, error.details);
    }
    throw error;
  }
}
