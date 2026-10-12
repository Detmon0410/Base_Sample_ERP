import { describe, expect, it } from "vitest";

import { INTERNAL_TOKEN, login, mockUsers, requireAdmin, tokenOf, userFromAuthorization } from "./users.js";

describe("the users of the mock", () => {
  it("has an Admin and a Worker, and nobody else", () => {
    expect(mockUsers.map((user) => user.role)).toEqual(["Admin", "Worker"]);
  });

  it("signs in with the e-mail (any case) and the password, and never gives the password back", () => {
    const { token, user } = login({ email: " Admin@Gmail.com ", password: "admin" });
    expect(token).toBe("mock-token-1");
    expect(user).toEqual({ id: 1, name: "Admin", department: "Administration", email: "admin@gmail.com", role: "Admin" });
    expect(user.password).toBeUndefined();
  });

  it("refuses a wrong password", () => {
    expect(() => login({ email: "admin@gmail.com", password: "nope" })).toThrow(/Invalid/);
  });

  it("knows the user of a token, and refuses a missing, a wrong or an old token", () => {
    expect(userFromAuthorization(`Bearer ${tokenOf(mockUsers[1])}`).role).toBe("Worker");
    expect(userFromAuthorization(INTERNAL_TOKEN).role).toBe("Admin");
    expect(() => userFromAuthorization(undefined)).toThrow(/Authentication/);
    expect(() => userFromAuthorization("Bearer mock-token-99")).toThrow(/Authentication/);
    expect(() => userFromAuthorization("Bearer mock-token-1-5")).toThrow(/Authentication/);
  });

  it("lets only an Admin through requireAdmin", () => {
    expect(requireAdmin("Bearer mock-token-1").role).toBe("Admin");
    expect(() => requireAdmin("Bearer mock-token-2")).toThrow(/Admin only/);
  });
});
