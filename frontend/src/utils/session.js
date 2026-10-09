const TOKEN_KEY = "kanou.token";

const store = () => window.localStorage;

// Storage can throw (private window, blocked site data), so every access is guarded.
export function getToken() {
  try {
    return store().getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    store().setItem(TOKEN_KEY, token);
  } catch {
    /* ignore: the session just will not survive a reload */
  }
}

export function clearToken() {
  try {
    store().removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
