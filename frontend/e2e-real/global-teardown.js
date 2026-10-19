import { createRequire } from "node:module";
import path from "node:path";

import { backendDir, databaseName, databaseUrl } from "./env.js";

// Drops the database of this run (only a name that starts with kanou_e2e_, which databaseName() has checked).
export default async function globalTeardown() {
  const name = databaseName();
  const require = createRequire(path.join(backendDir, "package.json"));
  const { PrismaClient } = require("@prisma/client");
  const admin = new PrismaClient({ datasources: { db: { url: databaseUrl("mysql") } } });
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${name}\``);
  } finally {
    await admin.$disconnect();
  }
}
