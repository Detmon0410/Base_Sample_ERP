import { createContext } from "react";

/**
 * Value shape:
 *  status:  "loading" (restoring a saved session) | "authenticated" | "unauthenticated"
 *  user:    { id, name, email, memberships: [{ department, role }] } | null
 *  login:   ({ email, password }) => Promise<void>   (throws ApiError)
 *  logout:  () => Promise<void>
 */
export const AuthContext = createContext(null);
