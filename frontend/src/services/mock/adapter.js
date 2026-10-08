import { AxiosError } from "axios";

import { MockHttpError, MockResponse } from "./errors.js";
import { PERSIST, onForeignChange, record, replayNew, userIdOf } from "./persist.js";
import { mockRoutes } from "./routes.js";
import { mockUsers, tokenOf } from "./users.js";
import { requestRefresh } from "@/utils/masterEvents";

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

// The workflow test: play the log of what the tester made before (and what another tab makes later)
function playEntry(entry) {
  const found = findRoute(entry.method, entry.path);
  if (!found) return;
  const user = mockUsers.find((item) => item.id === entry.userId);
  found.handler({ body: entry.body ?? {}, authorization: user ? `Bearer ${tokenOf(user)}` : undefined, params: found.params, query: entry.query ?? {} });
}
if (PERSIST) {
  replayNew(playEntry);
  onForeignChange(() => {
    if (replayNew(playEntry) > 0) requestRefresh(); // lists, the dashboard and the badges load again
  });
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
    const startedAt = new Date().toISOString();
    const result = route.handler({ body, authorization, params: route.params, query: config.params ?? {} });
    // a change that worked is kept in the log (the workflow test)
    if (PERSIST && method !== "GET" && path !== "/auth/logout") {
      record({ method, path, body, query: config.params ?? undefined, userId: userIdOf(authorization), at: startedAt });
    }

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
