import axios from "axios";

import { clearToken, getToken } from "@/utils/session";

import { mockAdapter } from "./mock/adapter.js";

export const UNAUTHORIZED_EVENT = "kanou:unauthorized";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
  headers: { "Content-Type": "application/json" },
  // With VITE_USE_MOCK=true every request is answered locally (see services/mock).
  ...(useMock ? { adapter: mockAdapter } : {}),
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Error thrown by every service call.
 * `code` is the backend `error` value (e.g. INVALID_CREDENTIALS) and is what the UI
 * translates; `message` is the backend's English text and is only a fallback.
 */
export class ApiError extends Error {
  constructor({ code, message, status, details }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(
        new ApiError({ code: "NETWORK_ERROR", message: error.message, status: 0 }),
      );
    }

    const { status, data } = error.response;

    // A 401 on /auth/login just means wrong credentials, not an expired session.
    if (status === 401 && error.config?.url !== "/auth/login") {
      clearToken();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    return Promise.reject(
      new ApiError({
        code: data?.error ?? "UNKNOWN_ERROR",
        message: data?.message ?? error.message,
        status,
        details: data?.errors,
      }),
    );
  },
);

/** Unwrap the `{ success, data, message }` envelope returned by the backend. */
export function unwrap(response) {
  return response.data.data;
}
