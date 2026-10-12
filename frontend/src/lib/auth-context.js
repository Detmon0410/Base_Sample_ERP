import { createContext } from "react";

/**
 * Value shape:
 *  status:  "loading" (restoring a saved session) | "authenticated" | "unauthenticated"
 *  user:    { id, name, department, email, role: "Admin" | "Worker" } | null
 *  login:   ({ email, password }) => Promise<void>   (throws ApiError)
 *  logout:  () => Promise<void>
 */
export const AuthContext = createContext(null);
