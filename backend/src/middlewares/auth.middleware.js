import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { unauthorized } from "../lib/errors.js";

export function signToken(user) {
  return jwt.sign({ sub: user.id, v: user.tokenVersion }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw unauthorized();

    let payload;
    try {
      payload = jwt.verify(token, env.jwtSecret);
    } catch {
      throw unauthorized();
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    // A new password raises tokenVersion and ends the older sessions
    if (!user || user.tokenVersion !== payload.v) throw unauthorized();

    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}
