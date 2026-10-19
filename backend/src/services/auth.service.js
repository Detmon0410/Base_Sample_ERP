import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma.js";
import { ApiError, Issues } from "../lib/errors.js";
import { signToken } from "../middlewares/auth.middleware.js";
import { userView } from "./user.service.js";

// Per IP and email: a small guard against password guessing
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;

function throttle(key) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(key, { first: now, count: 1 });
    return;
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) throw new ApiError(429, "TOO_MANY_REQUESTS", "Too many attempts, try again later");
}

export async function login({ email, password }, ip) {
  const issues = new Issues();
  const mail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!mail) issues.add("email", "REQUIRED");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) issues.add("email", "INVALID");
  if (typeof password !== "string" || password === "") issues.add("password", "REQUIRED");
  issues.throwIfAny();

  throttle(`${ip}|${mail}`);

  const user = await prisma.user.findUnique({ where: { email: mail } });
  const valid = user && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");

  attempts.delete(`${ip}|${mail}`);
  const updated = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { token: signToken(updated), user: userView(updated) };
}
