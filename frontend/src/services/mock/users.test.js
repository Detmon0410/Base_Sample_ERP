// The Users API as the app uses it, answered by the local mock. Every test starts with a fresh mock and signs in.
const LOGINS = {
  admin: { email: "admin@gmail.com", password: "admin" },
  alice: { email: "alice@kanou.test", password: "alice1234" },
  yuki: { email: "yuki@kanou.test", password: "yuki1234" },
};

async function start(who = "admin") {
  vi.resetModules();
  const auth = await import("../auth.service.js");
  const { setToken } = await import("@/utils/session");
  const users = await import("../users.service.js");
  const { getDashboard } = await import("../dashboard.service.js");
  const login = async (email, password) => {
    const { token } = await auth.login({ email, password });
    setToken(token);
  };
  await login(LOGINS[who].email, LOGINS[who].password);
  return { ...users, auth, login, getDashboard };
}

const failure = async (promise) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("The call was expected to fail");
};
const all = { pageSize: 100 };
const fields = (error) => error.details.map((item) => `${item.path.join(".")}:${item.message}`);
const body = (extra = {}) => ({ name: "Taro Yamada", email: "taro@kanou.test", password: "taro12345", memberships: [{ department: "Sale", role: "Worker" }], ...extra });

describe("the list of users", () => {
  it("has the nine demo users with their assignments, and never returns a password", async () => {
    const u = await start();
    const { items, meta } = await u.userService.list({ sort: "name", ...all });
    expect(meta.total).toBe(9);
    const alice = items.find((row) => row.name === "Alice Sato");
    expect(alice).toMatchObject({ email: "alice@kanou.test", status: "active", memberships: [{ department: "Sale", role: "Manager" }, { department: "Purchase", role: "Worker" }], isSelf: false });
    expect(items.find((row) => row.name === "Bob Tanaka").status).toBe("inactive");
    expect(items.find((row) => row.isSelf).name).toBe("Demo Admin");
    expect(JSON.stringify(items)).not.toMatch(/password|admin1234|alice1234/);
  });

  it("searches, filters by status, department and role, and sorts", async () => {
    const u = await start();
    expect((await u.userService.list({ q: "kanou.test", ...all })).meta.total).toBe(8);
    expect((await u.userService.list({ q: "alice", ...all })).items).toHaveLength(1);
    expect((await u.userService.list({ status: "inactive", ...all })).items.map((row) => row.name)).toEqual(["Bob Tanaka"]);
    expect((await u.userService.list({ department: "Purchase", ...all })).items.map((row) => row.name).sort()).toEqual(["Alice Sato", "Hana Ito"]);
    expect((await u.userService.list({ role: "Manager", ...all })).items).toHaveLength(4);
    expect((await u.userService.list({ role: "Admin", ...all })).items.map((row) => row.name)).toEqual(["Demo Admin"]);
    expect((await u.userService.list({ sort: "-name", ...all })).items[0].name).toBe("Yuki Tanaka");
  });
});

describe("who can open Users", () => {
  it("is Admin only", async () => {
    const u = await start("alice");
    expect((await failure(u.userService.list(all))).status).toBe(403);
    expect((await failure(u.userService.create(body()))).status).toBe(403);
    await u.login(LOGINS.yuki.email, LOGINS.yuki.password);
    expect((await failure(u.userService.get(1))).status).toBe(403);
  });
});

describe("creating and changing a user", () => {
  it("creates a user that can sign in at once, with a Manager role in one department and a Worker role in another", async () => {
    const u = await start();
    const created = await u.userService.create(body({ memberships: [{ department: "Sale", role: "Manager" }, { department: "Accounting", role: "Worker" }] }));
    expect(created).toMatchObject({ id: 10, status: "active", lastLoginAt: null, memberships: [{ department: "Sale", role: "Manager" }, { department: "Accounting", role: "Worker" }] });
    expect(created.password).toBeUndefined();
    const { user } = await u.auth.login({ email: "TARO@kanou.test", password: "taro12345" }); // the e-mail is not case sensitive
    expect(user).toMatchObject({ name: "Taro Yamada", memberships: created.memberships });
    expect((await u.userService.get(created.id)).lastLoginAt).not.toBeNull();
  });

  it("checks the form: name, e-mail, password strength, the assignments", async () => {
    const u = await start();
    expect(fields(await failure(u.userService.create(body({ name: "  ", email: "nope", password: "short" }))))).toEqual(["name:REQUIRED", "email:INVALID_EMAIL", "password:WEAK_PASSWORD"]);
    expect(fields(await failure(u.userService.create(body({ password: "onlyletters" }))))).toEqual(["password:WEAK_PASSWORD"]);
    expect(fields(await failure(u.userService.create(body({ memberships: [] }))))).toEqual(["memberships:REQUIRED"]);
    expect(fields(await failure(u.userService.create(body({ memberships: [{ department: "Sale", role: "Worker" }, { department: "Sale", role: "Manager" }] }))))).toEqual(["memberships.1.department:DUPLICATE"]);
    expect(fields(await failure(u.userService.create(body({ memberships: [{ department: "Stock", role: "Worker" }] }))))).toEqual(["memberships.0.department:REQUIRED"]);
    expect(fields(await failure(u.userService.create(body({ memberships: [{ department: null, role: "Admin" }, { department: "Sale", role: "Worker" }] }))))).toEqual(["memberships.0.role:ADMIN_ALONE"]);
    expect((await failure(u.userService.create(body({ email: "ALICE@kanou.test" })))).code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("changes the name, the e-mail and the assignments, keeps the e-mail unique and ignores a password in the body", async () => {
    const u = await start();
    const created = await u.userService.create(body());
    const changed = await u.userService.update(created.id, { name: "Taro Y.", email: "taro.y@kanou.test", password: "ignored1234", memberships: [{ department: "Factory", role: "Manager" }] });
    expect(changed).toMatchObject({ name: "Taro Y.", email: "taro.y@kanou.test", memberships: [{ department: "Factory", role: "Manager" }] });
    await u.auth.login({ email: "taro.y@kanou.test", password: "taro12345" }); // the old password still works
    expect((await failure(u.auth.login({ email: "taro.y@kanou.test", password: "ignored1234" }))).code).toBe("INVALID_CREDENTIALS");
    expect((await failure(u.userService.update(created.id, { ...changed, email: "alice@kanou.test" }))).code).toBe("EMAIL_ALREADY_EXISTS");
    expect(await u.userService.update(created.id, { name: "Taro Y.", email: "taro.y@kanou.test", memberships: [{ department: null, role: "Admin" }] })).toMatchObject({ memberships: [{ department: null, role: "Admin" }] });
  });

  it("makes a new Admin who can open Users", async () => {
    const u = await start();
    await u.userService.create(body({ memberships: [{ department: null, role: "Admin" }] }));
    await u.login("taro@kanou.test", "taro12345");
    expect((await u.userService.list(all)).meta.total).toBe(10);
  });
});

describe("passwords and sessions", () => {
  it("resets a password: the old one stops working and the open session of that user ends", async () => {
    const u = await start();
    await u.login(LOGINS.yuki.email, LOGINS.yuki.password);
    const yukiToken = (await u.auth.login(LOGINS.yuki)).token;
    await u.login(LOGINS.admin.email, LOGINS.admin.password);
    await u.userService.resetPassword(6, "newpass123");
    expect((await failure(u.auth.login(LOGINS.yuki))).code).toBe("INVALID_CREDENTIALS");
    const { setToken } = await import("@/utils/session");
    setToken(yukiToken);
    expect((await failure(u.getDashboard())).status).toBe(401); // the old token is dead
    const fresh = await u.auth.login({ email: LOGINS.yuki.email, password: "newpass123" });
    setToken(fresh.token);
    expect((await u.getDashboard()).kpis).toBeDefined();
  });

  it("refuses a weak password, and an Admin cannot reset their own", async () => {
    const u = await start();
    expect(fields(await failure(u.userService.resetPassword(6, "short")))).toEqual(["password:WEAK_PASSWORD"]);
    expect((await failure(u.userService.resetPassword(1, "newpass123"))).code).toBe("CANNOT_CHANGE_SELF");
  });
});

describe("deactivating and deleting", () => {
  it("deactivates a user (they cannot sign in and their session ends) and reactivates them", async () => {
    const u = await start();
    const { token } = await u.auth.login(LOGINS.alice);
    expect(await u.userService.setStatus(4, "inactive")).toMatchObject({ status: "inactive" });
    expect((await failure(u.auth.login({ email: "ken@kanou.test", password: "ken12345" }))).code).toBe("ACCOUNT_INACTIVE");
    const { setToken } = await import("@/utils/session");
    await u.userService.setStatus(2, "inactive");
    setToken(token);
    expect((await failure(u.getDashboard())).status).toBe(401);
    await u.login(LOGINS.admin.email, LOGINS.admin.password);
    await u.userService.setStatus(2, "active");
    expect((await u.auth.login(LOGINS.alice)).user.name).toBe("Alice Sato");
  });

  it("deletes a user who has no activity, and refuses one who has", async () => {
    const u = await start();
    const created = await u.userService.create(body());
    await u.userService.remove(created.id);
    expect((await failure(u.userService.get(created.id))).status).toBe(404);
    expect((await failure(u.userService.remove(2))).code).toBe("IN_USE"); // Alice has worked with documents
    const second = await u.userService.create(body({ email: "second@kanou.test" }));
    await u.auth.login({ email: "second@kanou.test", password: "taro12345" }); // a sign-in counts as activity
    expect((await failure(u.userService.remove(second.id))).code).toBe("IN_USE");
  });

  it("protects the Admin: not yourself, and not the last active Admin", async () => {
    const u = await start();
    expect((await failure(u.userService.setStatus(1, "inactive"))).code).toBe("CANNOT_CHANGE_SELF");
    expect((await failure(u.userService.remove(1))).code).toBe("CANNOT_CHANGE_SELF");
    expect((await failure(u.userService.update(1, { name: "Demo Admin", email: "admin@gmail.com", memberships: [{ department: "Sale", role: "Manager" }] }))).code).toBe("CANNOT_CHANGE_SELF");
    const second = await u.userService.create(body({ memberships: [{ department: null, role: "Admin" }] }));
    await u.login("taro@kanou.test", "taro12345");
    // the second Admin may deactivate the first, and then is the last one
    expect(await u.userService.setStatus(1, "inactive")).toMatchObject({ status: "inactive" });
    expect((await failure(u.userService.setStatus(second.id, "inactive"))).code).toBe("CANNOT_CHANGE_SELF");
  });

  it("does not let the last active Admin go, even when somebody else tries", async () => {
    const u = await start();
    const second = await u.userService.create(body({ memberships: [{ department: null, role: "Admin" }] }));
    await u.userService.setStatus(second.id, "inactive"); // one active Admin is left: Demo Admin
    await u.login("admin@gmail.com", "admin");
    // an inactive Admin cannot act; the only active one is protected from themselves
    expect((await failure(u.userService.setStatus(1, "inactive"))).code).toBe("CANNOT_CHANGE_SELF");
    // a second active Admin makes the first removable, and the survivor is the last
    await u.userService.setStatus(second.id, "active");
    await u.login("taro@kanou.test", "taro12345");
    await u.userService.setStatus(1, "inactive");
    expect((await u.userService.get(second.id)).isSelf).toBe(true);
    const third = await u.userService.create(body({ email: "third@kanou.test", memberships: [{ department: null, role: "Admin" }] }));
    await u.userService.setStatus(second.id === third.id ? 0 : third.id, "inactive");
    expect((await failure(u.userService.update(second.id, { name: "x", email: "taro@kanou.test", memberships: [{ department: "Sale", role: "Worker" }] }))).code).toBe("CANNOT_CHANGE_SELF");
  });
});
