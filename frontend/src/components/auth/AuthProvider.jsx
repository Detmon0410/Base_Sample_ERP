import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthContext } from "@/lib/auth-context";
import { UNAUTHORIZED_EVENT } from "@/services/api";
import * as authService from "@/services/auth.service";
import { clearToken, getToken, setToken } from "@/utils/session";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (getToken() ? "loading" : "unauthenticated"));

  // Restore a saved session on page load.
  useEffect(() => {
    if (!getToken()) return undefined;

    let cancelled = false;
    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (cancelled) return;
        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // api.js dispatches this when any request comes back 401 (expired / revoked token).
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setStatus("unauthenticated");
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const { token, user: loggedInUser } = await authService.login(credentials);
    setToken(token);
    setUser(loggedInUser);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Logging out locally must work even if the server cannot be reached.
    }
    clearToken();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
