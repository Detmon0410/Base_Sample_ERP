const TOKEN_KEY = "kanou.token";

// The workflow test: every browser tab is its own sign-in, so a tester can be a Sale user in one tab and an Accounting user in
// another and watch the requests go from one to the other (docs/specs/f13-workflow-test.md). Everywhere else the sign-in is kept.
const store = () => (import.meta.env.VITE_MOCK_SEED === "empty" && import.meta.env.MODE !== "test" ? window.sessionStorage : window.localStorage);

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
